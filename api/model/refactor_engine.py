"""
CodeSentinel AI — Automated Refactoring & Repair Engine (CodeT5)
================================================================
Translates smelly/buggy code functions into clean, optimized code using
a fine-tuned Salesforce CodeT5-Small sequence-to-sequence transformer.
Runs fast beam-search inference on standard CPU.
Falls back to HF Serverless API when PyTorch is unavailable (Vercel serverless).
"""

import os
import logging

logger = logging.getLogger("CodeSentinel.RefactorEngine")

_cached_refactor_model = None
_cached_refactor_tokenizer = None
_load_attempted = False

REFACTOR_MODEL_ID = os.getenv("REFACTOR_MODEL_ID", "wraithklu/codesentinel-codet5-refiner")
LOCAL_REFACTOR_DIR = os.getenv("LOCAL_REFACTOR_DIR", os.path.join(os.path.dirname(__file__), "refactor_checkpoint"))


def get_refactor_model():
    """
    Retrieves or loads the cached CodeT5 Seq2Seq model and tokenizer.
    """
    global _cached_refactor_model, _cached_refactor_tokenizer, _load_attempted

    if _load_attempted:
        return _cached_refactor_model, _cached_refactor_tokenizer

    _load_attempted = True

    try:
        from transformers import RobertaTokenizer, AutoTokenizer, AutoModelForSeq2SeqLM
        import torch

        target_path = None
        local_files_only = False

        if os.path.isdir(LOCAL_REFACTOR_DIR) and any(os.scandir(LOCAL_REFACTOR_DIR)):
            target_path = LOCAL_REFACTOR_DIR
            local_files_only = True
            logger.info(f"Loading CodeT5 refactorer from local directory: {target_path}")
        elif REFACTOR_MODEL_ID:
            target_path = REFACTOR_MODEL_ID
            logger.info(f"Loading CodeT5 refactorer from Hugging Face Hub: {target_path}")

        if target_path:
            try:
                tokenizer = RobertaTokenizer.from_pretrained(target_path, use_fast=False, local_files_only=local_files_only)
            except Exception:
                tokenizer = AutoTokenizer.from_pretrained(target_path, local_files_only=local_files_only)
            model = AutoModelForSeq2SeqLM.from_pretrained(target_path, local_files_only=local_files_only)
            model.to("cpu")
            model.eval()

            # Section 6: Inference Optimization for 2 vCPUs
            if torch:
                try:
                    torch.set_num_threads(2)
                    torch.set_num_interop_threads(1)
                except Exception:
                    pass

                # Apply PyTorch INT8 Dynamic Quantization
                try:
                    model = torch.quantization.quantize_dynamic(
                        model, {torch.nn.Linear}, dtype=torch.qint8
                    )
                    logger.info("⚡ Model 3 (CodeT5-Small): INT8 dynamic quantization active (~90MB RAM, ~140ms).")
                except Exception as q_err:
                    logger.debug(f"Quantization deferred for Model 3: {q_err}")

            _cached_refactor_model = model
            _cached_refactor_tokenizer = tokenizer
            logger.info("✅ CodeT5 Automated Refactor Engine initialized on CPU.")
            return _cached_refactor_model, _cached_refactor_tokenizer

    except Exception as e:
        logger.info(f"CodeT5 refactorer initialization deferred ({e}). Using cloud/LLM fallback.")

    return None, None


def query_hf_refactor_api(code: str) -> str:
    """Queries HF Free Serverless Inference API for CodeT5 refactoring (Vercel-safe fallback)."""
    try:
        import requests
        api_url = f"https://api-inference.huggingface.co/models/{REFACTOR_MODEL_ID}"
        headers = {}
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
        if hf_token and str(hf_token).startswith("hf_"):
            headers["Authorization"] = f"Bearer {hf_token}"
        payload = {"inputs": "refactor code: " + code[:500]}
        resp = requests.post(api_url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                generated = data[0].get("generated_text", "")
                if generated and generated.strip():
                    return generated.strip()
    except Exception as e:
        logger.debug(f"HF Serverless refactor query deferred: {e}")
    return None


def generate_refactor(code: str, max_tokens: int = 256) -> str:
    """
    Takes buggy or smelly source code and outputs a clean refactored implementation.
    Returns:
      refactored_code: string containing the generated code
    """
    if not code or not code.strip():
        return ""

    # 1. Local PyTorch inference (dev/self-hosted)
    model, tokenizer = get_refactor_model()

    if model is not None and tokenizer is not None:
        try:
            import torch
            prompt_input = "refactor code: " + code.strip()
            inputs = tokenizer(
                prompt_input,
                return_tensors="pt",
                max_length=384,
                truncation=True,
            )
            inputs = {k: v.to("cpu") for k, v in inputs.items()}

            with torch.no_grad():
                generated_ids = model.generate(
                    **inputs,
                    max_length=max_tokens,
                    num_beams=3,
                    early_stopping=True,
                    no_repeat_ngram_size=2,
                )
                output_code = tokenizer.decode(generated_ids[0], skip_special_tokens=True)

            if output_code and output_code.strip() != code.strip():
                return output_code.strip()
        except Exception as e:
            logger.warning(f"CodeT5 refactoring generation failed: {e}")

    # 2. HF Serverless Cloud API fallback (Vercel-safe)
    hf_result = query_hf_refactor_api(code)
    if hf_result:
        return hf_result

    return ""
