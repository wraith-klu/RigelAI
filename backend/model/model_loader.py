"""
CodeSentinel AI — Production Model Loader & Inference Engine
============================================================
Loads fine-tuned GraphCodeBERT / CodeBERT models from Hugging Face Hub or
local checkpoints. Runs optimized CPU inference with softmax probability
distributions. Falls back safely to baseline rules if offline.
"""

import os
import logging
try:
    import torch
except ImportError:
    torch = None

logger = logging.getLogger("CodeSentinel.ModelLoader")

_cached_model = None
_cached_tokenizer = None
_model_load_attempted = False

# Configuration: Live fine-tuned GraphCodeBERT model on Hugging Face Hub
DEFECT_MODEL_ID = os.getenv("DEFECT_MODEL_ID", "wraithklu/codesentinel-defect-sentinel")
LOCAL_CHECKPOINT_DIR = os.getenv("LOCAL_CHECKPOINT_DIR", os.path.join(os.path.dirname(__file__), "checkpoint"))


def get_model_and_tokenizer():
    """
    Retrieves or initializes the cached Transformer model and tokenizer.
    Prioritizes local checkpoint, then remote Hugging Face repository.
    """
    global _cached_model, _cached_tokenizer, _model_load_attempted

    if _model_load_attempted:
        return _cached_model, _cached_tokenizer

    _model_load_attempted = True

    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        target_path = None
        local_files_only = False

        if os.path.isdir(LOCAL_CHECKPOINT_DIR) and any(os.scandir(LOCAL_CHECKPOINT_DIR)):
            target_path = LOCAL_CHECKPOINT_DIR
            local_files_only = True
            logger.info(f"Loading Defect Sentinel from local directory: {target_path}")
        elif DEFECT_MODEL_ID:
            target_path = DEFECT_MODEL_ID
            logger.info(f"Loading Defect Sentinel from Hugging Face Hub: {target_path}")

        if target_path:
            tokenizer = AutoTokenizer.from_pretrained(
                target_path,
                use_fast=True,
                local_files_only=local_files_only,
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                target_path,
                local_files_only=local_files_only,
            )
            model.to("cpu")
            model.eval()

            _cached_model = model
            _cached_tokenizer = tokenizer
            logger.info("✅ Transformer Defect Sentinel initialized successfully on CPU.")
            return _cached_model, _cached_tokenizer

    except Exception as e:
        logger.info(f"Transformer model initialization deferred ({e}). Running in resilient static mode.")

    return None, None


def query_hf_defect_api(code: str) -> dict:
    """Queries Hugging Face Free Serverless Inference API for cloud inference."""
    try:
        import requests
        api_url = f"https://api-inference.huggingface.co/models/{DEFECT_MODEL_ID}"
        headers = {}
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
        if hf_token and str(hf_token).startswith("hf_"):
            headers["Authorization"] = f"Bearer {hf_token}"
        resp = requests.post(api_url, headers=headers, json={"inputs": code[:1000]}, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                labels = {item.get("label"): item.get("score", 0.0) for item in data[0]}
                prob_smelly = labels.get("LABEL_1", labels.get("Smelly", 0.0))
                prob_clean = labels.get("LABEL_0", labels.get("Clean", 1.0 - prob_smelly))
                predicted_class = "Smelly" if prob_smelly >= 0.5 else "Clean"
                return {
                    "smell_type": predicted_class,
                    "confidence": round(prob_smelly if predicted_class == "Smelly" else prob_clean, 4),
                    "all_probs": {"Clean": round(prob_clean, 4), "Smelly": round(prob_smelly, 4)},
                    "model_engine": "GraphCodeBERT-HF-Cloud",
                }
    except Exception as e:
        logger.debug(f"HF Serverless defect query deferred: {e}")
    return None


def predict_code_smell(code: str, model_path: str = None) -> dict:
    """
    Evaluates code snippet and returns structured defect/smell predictions.
    Schema matches CodeSentinel frontend & quality report expectations:
      - smell_type: 'Clean' or 'Smelly'
      - confidence: float between 0.0 and 1.0
      - all_probs: dict with probability per class
      - model_engine: name of model used ('GraphCodeBERT' or 'Baseline-Static-Classifier')
    """
    if not code or not code.strip():
        return {
            "smell_type": "Clean",
            "confidence": 1.0,
            "all_probs": {"Clean": 1.0, "Smelly": 0.0},
            "model_engine": "None (Empty input)",
        }

    # 1. Local PyTorch Transformer inference (if weights/torch available)
    model, tokenizer = get_model_and_tokenizer()

    if model is not None and tokenizer is not None:
        try:
            inputs = tokenizer(
                code,
                return_tensors="pt",
                max_length=384,
                truncation=True,
                padding=False,
            )
            inputs = {k: v.to("cpu") for k, v in inputs.items()}

            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()

            prob_clean = float(probs[0])
            prob_smelly = float(probs[1]) if len(probs) > 1 else 1.0 - prob_clean

            predicted_class = "Smelly" if prob_smelly >= 0.5 else "Clean"
            confidence = prob_smelly if predicted_class == "Smelly" else prob_clean

            return {
                "smell_type": predicted_class,
                "confidence": round(confidence, 4),
                "all_probs": {
                    "Clean": round(prob_clean, 4),
                    "Smelly": round(prob_smelly, 4),
                },
                "model_engine": "GraphCodeBERT-Devign",
            }
        except Exception as e:
            logger.warning(f"Inference error with Transformer: {e}. Falling back to baseline.")

    # 2. Hugging Face Serverless Cloud API inference
    hf_result = query_hf_defect_api(code)
    if hf_result:
        return hf_result

    # 3. Resilient fallback heuristic if offline
    has_smell_indicators = any(
        indicator in code for indicator in ["range(len(", "**2", "** 2", "except:", "x == True", "x == False"]
    )
    if has_smell_indicators:
        return {
            "smell_type": "Smelly",
            "confidence": 0.88,
            "all_probs": {"Clean": 0.12, "Smelly": 0.88},
            "model_engine": "Baseline-Static-Classifier",
        }
    return {
        "smell_type": "Clean",
        "confidence": 0.84,
        "all_probs": {"Clean": 0.84, "Smelly": 0.16},
        "model_engine": "Baseline-Static-Classifier",
    }
