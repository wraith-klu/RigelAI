#!/usr/bin/env python3
"""
CodeSentinel AI — Training Script for Model 1: Defect & Smell Sentinel
======================================================================
Fine-tunes GraphCodeBERT / CodeBERT on CodeXGLUE Defect Detection benchmark.
Can be executed locally (with GPU) or on Google Colab (free T4 GPU).

Dataset:
  - Hugging Face Datasets: "code_x_glue_cc_defect_detection" (27,318 functions)
  - Or local: CodeXGLUE/Code-Code/Defect-detection/dataset/

Usage:
  python train_defect_model.py --epochs 3 --batch_size 16 --output_dir ./models/defect_sentinel
  python train_defect_model.py --push_to_hub --hf_repo_id <your-hf-username>/codesentinel-defect-sentinel
"""

import argparse
import logging
import os
import sys
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoConfig,
    AdamW,
    get_linear_schedule_with_warmup,
    DataCollatorWithPadding,
)

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("CodeSentinel.TrainDefect")


# ---------------------------------------------------------------------------
# Loss Functions: Focal Loss for Class Imbalance
# ---------------------------------------------------------------------------
class FocalLoss(nn.Module):
    """
    Focal Loss down-weights well-classified examples and focuses on hard
    defects/smells:
        FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha=0.25, gamma=2.0, reduction="mean"):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, logits, targets):
        ce_loss = nn.functional.cross_entropy(logits, targets, reduction="none")
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * ((1 - pt) ** self.gamma) * ce_loss

        if self.reduction == "mean":
            return focal_loss.mean()
        elif self.reduction == "sum":
            return focal_loss.sum()
        return focal_loss


# ---------------------------------------------------------------------------
# Dataset Loader Helper
# ---------------------------------------------------------------------------
def load_defect_dataset():
    """
    Attempts to load CodeXGLUE Defect Detection via Hugging Face datasets.
    Falls back to synthetic / local if offline.
    """
    try:
        from datasets import load_dataset
        logger.info("Loading CodeXGLUE Defect Detection dataset from Hugging Face Hub...")
        dataset = load_dataset("google/code_x_glue_cc_defect_detection")
        logger.info(f"Loaded splits: {list(dataset.keys())}")
        logger.info(f"Train samples: {len(dataset['train'])}, Validation: {len(dataset['validation'])}, Test: {len(dataset['test'])}")
        return dataset
    except Exception as e:
        logger.warning(f"Could not load via datasets library: {e}")
        logger.info("Attempting local file fallback from CodeXGLUE directory...")
        
        # Local JSONL search
        local_candidates = [
            "CodeXGLUE/Code-Code/Defect-detection/dataset",
            "../CodeXGLUE/Code-Code/Defect-detection/dataset",
            "p:/CodeSentinel-AI/CodeXGLUE/Code-Code/Defect-detection/dataset",
        ]
        local_dir = None
        for candidate in local_candidates:
            if os.path.exists(candidate):
                local_dir = candidate
                break

        if not local_dir:
            raise FileNotFoundError(
                "Could not find local or remote CodeXGLUE dataset. "
                "Ensure internet access to Hugging Face or run preprocess.py in CodeXGLUE/Code-Code/Defect-detection/dataset."
            )
        
        from datasets import load_dataset
        data_files = {
            "train": os.path.join(local_dir, "train.jsonl"),
            "validation": os.path.join(local_dir, "valid.jsonl"),
            "test": os.path.join(local_dir, "test.jsonl"),
        }
        return load_dataset("json", data_files=data_files)


# ---------------------------------------------------------------------------
# Evaluation Helper
# ---------------------------------------------------------------------------
def evaluate(model, dataloader, device, loss_fn):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            loss = loss_fn(logits, labels)
            total_loss += loss.item()

            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(dataloader)
    acc = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average="binary", zero_division=0
    )

    return {
        "loss": avg_loss,
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


# ---------------------------------------------------------------------------
# Main Training Function
# ---------------------------------------------------------------------------
def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() and not args.no_cuda else "cpu")
    logger.info(f"Target Compute Device: {device}")
    if torch.cuda.is_available():
        logger.info(f"GPU Model: {torch.cuda.get_device_name(0)}")
        logger.info(f"Available VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

    # 1. Load Tokenizer & Model
    logger.info(f"Loading Base Architecture: {args.model_name_or_path}")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path, use_fast=True)

    config = AutoConfig.from_pretrained(
        args.model_name_or_path,
        num_labels=2,
        id2label={0: "Clean", 1: "Defective"},
        label2id={"Clean": 0, "Defective": 1},
        problem_type="single_label_classification",
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name_or_path,
        config=config,
    )
    model.to(device)

    # 2. Prepare Data
    raw_datasets = load_defect_dataset()

    def tokenize_fn(examples):
        # CodeXGLUE defect key is 'func'
        texts = examples.get("func", examples.get("code", [""]))
        return tokenizer(
            texts,
            truncation=True,
            max_length=args.max_seq_length,
            padding=False,
        )

    logger.info("Tokenizing datasets...")
    tokenized_datasets = raw_datasets.map(
        tokenize_fn,
        batched=True,
        remove_columns=[col for col in raw_datasets["train"].column_names if col not in ["target", "label"]],
    )

    # Standardize label column name to 'labels'
    def rename_labels(batch):
        if "target" in batch:
            batch["labels"] = batch["target"]
        elif "label" in batch:
            batch["labels"] = batch["label"]
        return batch

    tokenized_datasets = tokenized_datasets.map(rename_labels)

    collator = DataCollatorWithPadding(tokenizer=tokenizer, return_tensors="pt")

    train_loader = DataLoader(
        tokenized_datasets["train"],
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collator,
    )
    val_loader = DataLoader(
        tokenized_datasets["validation"],
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collator,
    )
    test_loader = DataLoader(
        tokenized_datasets["test"],
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collator,
    )

    # 3. Setup Optimizer, Scheduler, and Loss
    total_steps = len(train_loader) * args.epochs
    warmup_steps = int(total_steps * args.warmup_ratio)

    optimizer = AdamW(model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps,
    )

    loss_fn = FocalLoss(gamma=args.focal_gamma) if args.use_focal_loss else nn.CrossEntropyLoss()

    logger.info(f"Total Epochs: {args.epochs} | Total Steps: {total_steps} | Warmup Steps: {warmup_steps}")

    # 4. Training Loop
    best_f1 = 0.0
    os.makedirs(args.output_dir, exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss = 0.0

        for step, batch in enumerate(train_loader, start=1):
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            optimizer.zero_grad()
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = loss_fn(outputs.logits, labels)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()

            epoch_loss += loss.item()

            if step % args.logging_steps == 0 or step == len(train_loader):
                logger.info(
                    f"Epoch [{epoch}/{args.epochs}] | Step [{step}/{len(train_loader)}] | "
                    f"Batch Loss: {loss.item():.4f} | Avg Loss: {epoch_loss / step:.4f}"
                )

        # Validation at end of epoch
        val_metrics = evaluate(model, val_loader, device, loss_fn)
        logger.info(
            f"=== Validation Epoch {epoch} === "
            f"Loss: {val_metrics['loss']:.4f} | Acc: {val_metrics['accuracy']:.4f} | "
            f"Prec: {val_metrics['precision']:.4f} | Recall: {val_metrics['recall']:.4f} | "
            f"F1: {val_metrics['f1']:.4f}"
        )

        if val_metrics["f1"] > best_f1:
            best_f1 = val_metrics["f1"]
            logger.info(f"⭐ New Best Model (F1: {best_f1:.4f})! Saving to {args.output_dir}")
            model.save_pretrained(args.output_dir)
            tokenizer.save_pretrained(args.output_dir)

    # 5. Final Evaluation on Test Set
    logger.info("Loading best checkpoint for Final Test Set Evaluation...")
    best_model = AutoModelForSequenceClassification.from_pretrained(args.output_dir).to(device)
    test_metrics = evaluate(best_model, test_loader, device, loss_fn)
    logger.info("=" * 60)
    logger.info(f"FINAL TEST SET RESULTS:")
    logger.info(f"  Accuracy:  {test_metrics['accuracy'] * 100:.2f}%")
    logger.info(f"  Precision: {test_metrics['precision'] * 100:.2f}%")
    logger.info(f"  Recall:    {test_metrics['recall'] * 100:.2f}%")
    logger.info(f"  F1-Score:  {test_metrics['f1'] * 100:.2f}%")
    logger.info("=" * 60)

    # 6. Push to Hugging Face Hub (Optional)
    if args.push_to_hub:
        if not args.hf_repo_id:
            logger.error("--push_to_hub was set but --hf_repo_id is missing!")
        else:
            logger.info(f"Pushing model & tokenizer to Hugging Face Hub: {args.hf_repo_id}")
            best_model.push_to_hub(args.hf_repo_id, token=args.hf_token)
            tokenizer.push_to_hub(args.hf_repo_id, token=args.hf_token)
            logger.info("✅ Model pushed to Hugging Face Hub successfully!")


# ---------------------------------------------------------------------------
# CLI Argument Parser
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(description="Train CodeSentinel Defect Sentinel Model")
    parser.add_argument("--model_name_or_path", type=str, default="microsoft/graphcodebert-base",
                        help="Base transformer model (GraphCodeBERT or CodeBERT)")
    parser.add_argument("--output_dir", type=str, default="./models/defect_sentinel",
                        help="Output directory to save best checkpoint")
    parser.add_argument("--max_seq_length", type=int, default=384,
                        help="Maximum token sequence length (384 is optimal for speed/memory)")
    parser.add_argument("--batch_size", type=int, default=16,
                        help="Batch size per device (16 is ideal for 16GB T4 GPU)")
    parser.add_argument("--learning_rate", type=float, default=2e-5,
                        help="Peak learning rate for AdamW")
    parser.add_argument("--weight_decay", type=float, default=0.01,
                        help="Weight decay for regularization")
    parser.add_argument("--epochs", type=int, default=3,
                        help="Number of training epochs")
    parser.add_argument("--warmup_ratio", type=float, default=0.1,
                        help="Linear warmup proportion of total steps")
    parser.add_argument("--logging_steps", type=int, default=100,
                        help="Log interval in training steps")
    parser.add_argument("--use_focal_loss", action="store_true", default=True,
                        help="Use Focal Loss instead of standard CrossEntropy")
    parser.add_argument("--focal_gamma", type=float, default=2.0,
                        help="Gamma focus parameter for Focal Loss")
    parser.add_argument("--no_cuda", action="store_true",
                        help="Force CPU execution (not recommended for training)")
    parser.add_argument("--push_to_hub", action="store_true",
                        help="Upload best model to Hugging Face Hub")
    parser.add_argument("--hf_repo_id", type=str, default=None,
                        help="Hugging Face repo id, e.g. 'username/codesentinel-defect-sentinel'")
    parser.add_argument("--hf_token", type=str, default=None,
                        help="Hugging Face write token (optional if huggingface-cli login was run)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args)
