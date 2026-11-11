#!/usr/bin/env python3
"""
CodeSentinel AI — Training Script for Model 3: Automated Refactoring Engine
==========================================================================
Fine-tunes Salesforce CodeT5-Small on CodeXGLUE Code Refinement (Bug Fixing / Smell Repair).
Trained model transforms buggy/smelly functions directly into clean, optimized code.

Dataset:
  - Hugging Face Datasets: "google/code_x_glue_cc_code_refinement" (medium or small)
  - Or local: CodeXGLUE/Code-Code/code-refinement/data/

Usage:
  python train_refactor_model.py --subset medium --epochs 3 --batch_size 8 --output_dir ./models/refactor_codet5
  python train_refactor_model.py --push_to_hub --hf_repo_id <user>/codesentinel-codet5-refiner
"""

import argparse
import logging
import os
import torch
from datasets import load_dataset
from transformers import (
    RobertaTokenizer,
    AutoModelForSeq2SeqLM,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
    DataCollatorForSeq2Seq,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("CodeSentinel.TrainRefactor")


def main():
    parser = argparse.ArgumentParser(description="Train CodeSentinel CodeT5 Refactor Engine")
    parser.add_argument("--model_name_or_path", type=str, default="Salesforce/codet5p-220m",
                        help="Base Seq2Seq model (Salesforce/codet5p-220m or Salesforce/codet5-small)")
    parser.add_argument("--subset", type=str, default="medium", choices=["small", "medium"],
                        help="CodeXGLUE refinement subset (medium: ~65k pairs, small: ~46k pairs)")
    parser.add_argument("--output_dir", type=str, default="./models/refactor_codet5",
                        help="Directory to save the best model")
    parser.add_argument("--max_input_length", type=int, default=256,
                        help="Maximum token length for input (buggy/smelly code)")
    parser.add_argument("--max_target_length", type=int, default=256,
                        help="Maximum token length for target (fixed/clean code)")
    parser.add_argument("--batch_size", type=int, default=8,
                        help="Batch size per device")
    parser.add_argument("--learning_rate", type=float, default=5e-5,
                        help="Learning rate for AdamW")
    parser.add_argument("--epochs", type=int, default=3,
                        help="Number of fine-tuning epochs")
    parser.add_argument("--push_to_hub", action="store_true",
                        help="Push best model to Hugging Face Hub")
    parser.add_argument("--hf_repo_id", type=str, default=None,
                        help="Hugging Face repo id, e.g. 'username/codesentinel-codet5-refiner'")
    parser.add_argument("--hf_token", type=str, default=None,
                        help="Hugging Face token with write permission")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Target Compute Device: {device}")
    if torch.cuda.is_available():
        logger.info(f"GPU Model: {torch.cuda.get_device_name(0)}")

    # 1. Load Tokenizer & Model (use_fast=False ensures compatibility with CodeT5 BPE)
    logger.info(f"Loading Base CodeT5 Architecture: {args.model_name_or_path}")
    tokenizer = RobertaTokenizer.from_pretrained(args.model_name_or_path)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name_or_path)
    model.to(device)

    # 2. Load Dataset from Hugging Face Hub
    logger.info(f"Loading CodeXGLUE Code Refinement (subset: {args.subset})...")
    dataset = load_dataset("google/code_x_glue_cc_code_refinement", args.subset)
    logger.info(f"Loaded: {len(dataset['train'])} train, {len(dataset['validation'])} validation, {len(dataset['test'])} test pairs.")

    # 3. Preprocessing & Tokenization
    def preprocess_function(examples):
        inputs = ["refactor and optimize code: " + code for code in examples["buggy"]]
        targets = examples["fixed"]

        model_inputs = tokenizer(inputs, max_length=args.max_input_length, truncation=True)
        labels = tokenizer(text_target=targets, max_length=args.max_target_length, truncation=True)

        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    logger.info("Tokenizing code-to-code pairs...")
    tokenized_dataset = dataset.map(
        preprocess_function,
        batched=True,
        remove_columns=dataset["train"].column_names,
    )

    data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

    # 4. Training Arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        weight_decay=0.01,
        save_total_limit=1,
        num_train_epochs=args.epochs,
        predict_with_generate=True,
        fp16=torch.cuda.is_available(),
        logging_steps=100,
        load_best_model_at_end=True,
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        data_collator=data_collator,
        tokenizer=tokenizer,
    )

    # 5. Train
    logger.info("🚀 Starting CodeT5 Refactoring Model Training...")
    trainer.train()

    # 6. Save Model
    logger.info(f"Saving fine-tuned model to: {args.output_dir}")
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    # 7. Push to Hub (Optional)
    if args.push_to_hub:
        if not args.hf_repo_id:
            logger.error("--push_to_hub set but --hf_repo_id missing!")
        else:
            logger.info(f"Pushing to Hugging Face Hub: {args.hf_repo_id}")
            model.push_to_hub(args.hf_repo_id, token=args.hf_token)
            tokenizer.push_to_hub(args.hf_repo_id, token=args.hf_token)
            logger.info("✅ Pushed CodeT5 Refactoring Model to Hugging Face successfully!")


if __name__ == "__main__":
    main()
