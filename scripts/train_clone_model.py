#!/usr/bin/env python3
"""
CodeSentinel AI — Training Script for Model 2: Semantic Clone & Redundancy Detector
===================================================================================
Fine-tunes CodeBERT into a Siamese SentenceTransformer on CodeXGLUE BigCloneBench.
Enables instant cosine similarity matrix comparisons to catch copy-pasted code,
semantic clones, and redundant helper logic across codebases.

Usage:
  python train_clone_model.py --samples 20000 --epochs 3 --batch_size 16 --output_dir ./models/clone_detector
  python train_clone_model.py --push_to_hub --hf_repo_id wraithklu/codesentinel-clone-detector
"""

import os
import argparse
import logging
import random
import torch
from torch.utils.data import DataLoader
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, models, InputExample, losses, evaluation

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("CodeSentinel.TrainClone")


def parse_args():
    parser = argparse.ArgumentParser(description="Train CodeSentinel Semantic Clone Detector")
    parser.add_argument("--base_model", type=str, default="microsoft/codebert-base",
                        help="Base encoder (microsoft/codebert-base or microsoft/graphcodebert-base)")
    parser.add_argument("--samples", type=int, default=20000,
                        help="Number of balanced training pairs to sample (e.g. 20000 = 10k clones, 10k non-clones)")
    parser.add_argument("--val_samples", type=int, default=2000,
                        help="Number of validation pairs")
    parser.add_argument("--epochs", type=int, default=3,
                        help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16,
                        help="Training batch size")
    parser.add_argument("--max_seq_length", type=int, default=384,
                        help="Maximum token sequence length for each code snippet")
    parser.add_argument("--output_dir", type=str, default="./models/clone_detector",
                        help="Output directory to save fine-tuned model")
    parser.add_argument("--push_to_hub", action="store_true",
                        help="Push fine-tuned model directly to Hugging Face Model Hub")
    parser.add_argument("--hf_repo_id", type=str, default=None,
                        help="Target HF repo (e.g. wraithklu/codesentinel-clone-detector)")
    return parser.parse_args()


def build_siamese_codebert(base_model: str, max_seq_length: int) -> SentenceTransformer:
    """
    Constructs a Siamese SentenceTransformer by wrapping a transformer encoder
    with a Mean Pooling layer.
    """
    logger.info(f"Building Siamese architecture on top of '{base_model}'...")
    word_embedding_model = models.Transformer(base_model, max_seq_length=max_seq_length)
    pooling_model = models.Pooling(
        word_embedding_model.get_word_embedding_dimension(),
        pooling_mode_mean_tokens=True,
        pooling_mode_cls_token=False,
        pooling_mode_max_tokens=False
    )
    model = SentenceTransformer(modules=[word_embedding_model, pooling_model])
    return model


def main():
    args = parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device.upper()}")

    # 1. Load CodeXGLUE BigCloneBench
    logger.info("Loading 'google/code_x_glue_cc_clone_detection_big_clone_bench' dataset...")
    raw_dataset = load_dataset("google/code_x_glue_cc_clone_detection_big_clone_bench")

    # 2. Extract balanced training samples
    logger.info(f"Sampling {args.samples} balanced training pairs...")
    train_clones = []
    train_non_clones = []
    target_each = args.samples // 2

    for row in raw_dataset["train"]:
        if len(train_clones) >= target_each and len(train_non_clones) >= target_each:
            break
        f1 = row.get("func1", "").strip()
        f2 = row.get("func2", "").strip()
        is_clone = bool(row.get("label", False))

        if len(f1) > 20 and len(f2) > 20:
            if is_clone and len(train_clones) < target_each:
                train_clones.append(InputExample(texts=[f1, f2], label=1.0))
            elif not is_clone and len(train_non_clones) < target_each:
                train_non_clones.append(InputExample(texts=[f1, f2], label=0.0))

    train_examples = train_clones + train_non_clones
    random.seed(42)
    random.shuffle(train_examples)
    logger.info(f"Prepared {len(train_examples)} balanced training pairs.")

    # 3. Prepare validation set
    val_clones = []
    val_non_clones = []
    val_target = args.val_samples // 2

    for row in raw_dataset["validation"]:
        if len(val_clones) >= val_target and len(val_non_clones) >= val_target:
            break
        f1 = row.get("func1", "").strip()
        f2 = row.get("func2", "").strip()
        is_clone = bool(row.get("label", False))

        if len(f1) > 20 and len(f2) > 20:
            if is_clone and len(val_clones) < val_target:
                val_clones.append((f1, f2, 1.0))
            elif not is_clone and len(val_non_clones) < val_target:
                val_non_clones.append((f1, f2, 0.0))

    val_data = val_clones + val_non_clones
    val_s1 = [x[0] for x in val_data]
    val_s2 = [x[1] for x in val_data]
    val_scores = [x[2] for x in val_data]

    evaluator = evaluation.EmbeddingSimilarityEvaluator(
        val_s1, val_s2, val_scores,
        name="bigclonebench-val",
        show_progress_bar=True
    )

    # 4. Initialize Siamese CodeBERT
    model = build_siamese_codebert(args.base_model, args.max_seq_length)
    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=args.batch_size)
    train_loss = losses.CosineSimilarityLoss(model=model)

    # 5. Fine-tune
    warmup_steps = int(len(train_dataloader) * args.epochs * 0.1)
    logger.info(f"Starting Siamese training for {args.epochs} epochs ({warmup_steps} warmup steps)...")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=args.epochs,
        evaluation_steps=len(train_dataloader) // 2,
        warmup_steps=warmup_steps,
        output_path=args.output_dir,
        show_progress_bar=True,
        use_amp=True,  # 16-bit mixed precision for 3x-4x speedup on GPU
    )

    logger.info(f"Training complete! Model saved to {args.output_dir}")

    # 6. Push to Hugging Face Hub
    if args.push_to_hub and args.hf_repo_id:
        logger.info(f"Pushing model to Hugging Face: {args.hf_repo_id}...")
        model.push_to_hub(args.hf_repo_id)
        logger.info(f"🎉 Model live at https://huggingface.co/{args.hf_repo_id}")


if __name__ == "__main__":
    main()
