#!/usr/bin/env python3
"""
CodeSentinel AI — Dynamic Quantization & Deployment Utility
===========================================================
Compresses trained GraphCodeBERT / CodeBERT models from ~450MB to ~115MB
using PyTorch Dynamic INT8 Quantization. Tests CPU inference latency and
optionally uploads to Hugging Face Model Hub for free production hosting.

Usage:
  python quantize_and_upload.py --model_dir ./models/defect_sentinel --output_dir ./models/defect_sentinel_int8
  python quantize_and_upload.py --model_dir ./models/defect_sentinel --push_to_hub --hf_repo_id <user>/codesentinel-defect-sentinel-int8
"""

import argparse
import logging
import os
import time
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("CodeSentinel.Quantize")

SAMPLE_CODE = """
def process_user_data(data, user_id):
    result = []
    for item in data:
        if item.get("active"):
            total = sum(item["values"])
            result.append({"id": user_id, "total": total})
    return result
"""

def benchmark_inference(model, tokenizer, device, num_runs=50):
    inputs = tokenizer(SAMPLE_CODE, return_tensors="pt", max_length=256, truncation=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Warmup
    for _ in range(5):
        with torch.no_grad():
            _ = model(**inputs)
            
    start_time = time.perf_counter()
    for _ in range(num_runs):
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
    
    avg_latency_ms = ((time.perf_counter() - start_time) / num_runs) * 1000
    return avg_latency_ms, probs[0].tolist()

def main():
    parser = argparse.ArgumentParser(description="Quantize CodeSentinel models for free CPU hosting")
    parser.add_argument("--model_dir", type=str, required=True, help="Directory containing trained FP32 model")
    parser.add_argument("--output_dir", type=str, default="./models/defect_sentinel_int8", help="Output directory")
    parser.add_argument("--push_to_hub", action="store_true", help="Push to Hugging Face Hub")
    parser.add_argument("--hf_repo_id", type=str, default=None, help="Hugging Face repo id")
    parser.add_argument("--hf_token", type=str, default=None, help="Hugging Face access token")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    logger.info(f"Loading FP32 Model from: {args.model_dir}")
    tokenizer = AutoTokenizer.from_pretrained(args.model_dir)
    model_fp32 = AutoModelForSequenceClassification.from_pretrained(args.model_dir)
    model_fp32.to("cpu")
    model_fp32.eval()

    # Benchmark FP32 on CPU
    logger.info("Benchmarking baseline FP32 model on CPU...")
    fp32_latency, fp32_probs = benchmark_inference(model_fp32, tokenizer, "cpu")
    logger.info(f"FP32 CPU Latency: {fp32_latency:.2f} ms | Prediction Probs: {fp32_probs}")

    # Quantize to INT8
    logger.info("Applying PyTorch Dynamic INT8 Quantization (torch.qint8 on Linear layers)...")
    model_int8 = torch.quantization.quantize_dynamic(
        model_fp32,
        {torch.nn.Linear},
        dtype=torch.qint8,
    )

    # Benchmark INT8 on CPU
    logger.info("Benchmarking Quantized INT8 model on CPU...")
    int8_latency, int8_probs = benchmark_inference(model_int8, tokenizer, "cpu")
    speedup = fp32_latency / int8_latency if int8_latency > 0 else 1.0
    logger.info(f"INT8 CPU Latency: {int8_latency:.2f} ms | Speedup: {speedup:.2f}x | Prediction Probs: {int8_probs}")

    # Save quantized model
    save_path = os.path.join(args.output_dir, "pytorch_model_quantized.pt")
    logger.info(f"Saving quantized model weights to: {save_path}")
    torch.save(model_int8.state_dict(), save_path)
    tokenizer.save_pretrained(args.output_dir)

    # Save original config
    model_fp32.config.save_pretrained(args.output_dir)

    # Print size comparison
    fp32_size_mb = sum(p.numel() * p.element_size() for p in model_fp32.parameters()) / (1024 * 1024)
    int8_file_size_mb = os.path.getsize(save_path) / (1024 * 1024)
    logger.info(f"Model Size Reduction: {fp32_size_mb:.1f} MB (FP32) -> {int8_file_size_mb:.1f} MB (Quantized INT8)")
    logger.info(f"Compression Ratio: {(1 - int8_file_size_mb / fp32_size_mb) * 100:.1f}% reduction")

    if args.push_to_hub:
        if not args.hf_repo_id:
            logger.error("--push_to_hub was set but --hf_repo_id is missing!")
            return
        logger.info(f"Pushing quantized assets to Hugging Face Hub: {args.hf_repo_id}")
        tokenizer.push_to_hub(args.hf_repo_id, token=args.hf_token)
        model_fp32.config.push_to_hub(args.hf_repo_id, token=args.hf_token)
        from huggingface_hub import HfApi
        api = HfApi()
        api.upload_file(
            path_or_fileobj=save_path,
            path_in_repo="pytorch_model_quantized.pt",
            repo_id=args.hf_repo_id,
            token=args.hf_token,
        )
        logger.info("✅ Uploaded quantized model to Hugging Face Hub successfully!")

if __name__ == "__main__":
    main()
