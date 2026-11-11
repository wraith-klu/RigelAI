"""
CodeSentinel AI — Semantic Code Clone & Redundancy Detector (Model 2)
=====================================================================
Uses a fine-tuned Siamese CodeBERT SentenceTransformer to compute dense 768-d
vector embeddings of source functions. Performs ultra-fast pairwise cosine
similarity comparisons to detect copy-pasted anti-patterns, duplicated logic,
and refactoring opportunities across repository files.
"""

import os
import logging
from typing import List, Dict, Any, Tuple
try:
    import torch
except ImportError:
    torch = None

logger = logging.getLogger("CodeSentinel.CloneDetector")

_cached_clone_model = None
_load_attempted = False

CLONE_MODEL_ID = os.getenv("CLONE_MODEL_ID", "wraithklu/codesentinel-clone-detector")
FALLBACK_BASE_MODEL = "microsoft/codebert-base"


def get_clone_model():
    """
    Loads and caches the CodeBERT semantic clone model.
    Falls back gracefully if weights are downloading or offline.
    """
    global _cached_clone_model, _load_attempted

    if _load_attempted:
        return _cached_clone_model

    _load_attempted = True

    try:
        from sentence_transformers import SentenceTransformer

        target_model = CLONE_MODEL_ID if CLONE_MODEL_ID else FALLBACK_BASE_MODEL
        logger.info(f"Loading CodeSentinel Clone Detector model: {target_model}")

        # Section 6: Thread Optimization for 2 vCPUs
        if torch:
            try:
                torch.set_num_threads(2)
                torch.set_num_interop_threads(1)
            except Exception:
                pass

        try:
            model = SentenceTransformer(target_model, device="cpu")
        except Exception as e:
            logger.warning(f"Could not load custom clone model '{target_model}' ({e}). Falling back to base CodeBERT.")
            model = SentenceTransformer(FALLBACK_BASE_MODEL, device="cpu")

        # Apply INT8 dynamic quantization to the underlying transformer
        if torch:
            try:
                if hasattr(model, "0") and hasattr(model[0], "auto_model"):
                    model[0].auto_model = torch.quantization.quantize_dynamic(
                        model[0].auto_model, {torch.nn.Linear}, dtype=torch.qint8
                    )
                    logger.info("⚡ Model 2 (CodeBERT Bi-Encoder): INT8 dynamic quantization active (~115MB RAM, ~18ms).")
            except Exception as q_err:
                logger.debug(f"Quantization deferred for Model 2: {q_err}")

        _cached_clone_model = model
        logger.info("✅ Semantic Clone Detector initialized successfully on CPU.")
        return _cached_clone_model

    except Exception as e:
        logger.warning(f"Clone Detector initialization deferred ({e}).")
        return None


def detect_code_clones(
    functions: List[Dict[str, Any]],
    similarity_threshold: float = 0.85
) -> List[Dict[str, Any]]:
    """
    Performs pairwise semantic clone detection across a list of function dictionaries.
    
    Each function dict is expected to have:
      - 'name': str
      - 'file': str
      - 'code': str
      - 'start_line': int (optional)

    Returns:
      A list of detected clone pairs with similarity scores and refactoring advice.
    """
    if not functions or len(functions) < 2:
        return []

    model = get_clone_model()
    if model is None:
        return []

    try:
        from sentence_transformers import util

        code_snippets = [f.get("code", "") for f in functions]
        # Filter snippets that are too short to be meaningful
        valid_indices = [i for i, code in enumerate(code_snippets) if len(code.strip()) > 30]

        if len(valid_indices) < 2:
            return []

        filtered_snippets = [code_snippets[i] for i in valid_indices]
        filtered_functions = [functions[i] for i in valid_indices]

        # Vectorize all functions in a single batch on CPU
        embeddings = model.encode(
            filtered_snippets,
            convert_to_tensor=True,
            show_progress_bar=False,
            normalize_embeddings=True
        )

        # Compute all-pairs cosine similarity matrix
        cos_sim_matrix = util.cos_sim(embeddings, embeddings)

        clones = []
        n = len(filtered_functions)

        for i in range(n):
            for j in range(i + 1, n):
                score = float(cos_sim_matrix[i][j])
                if score >= similarity_threshold:
                    f1 = filtered_functions[i]
                    f2 = filtered_functions[j]

                    # Determine clone type
                    if score >= 0.98:
                        clone_type = "Type-1 (Exact / Formatted Clone)"
                    elif score >= 0.92:
                        clone_type = "Type-2 (Renamed / Parameterized Clone)"
                    else:
                        clone_type = "Type-3/4 (Semantic / Functional Clone)"

                    clones.append({
                        "function_a": {
                            "name": f1.get("name", "anonymous"),
                            "file": f1.get("file", "unknown"),
                            "start_line": f1.get("start_line", 1)
                        },
                        "function_b": {
                            "name": f2.get("name", "anonymous"),
                            "file": f2.get("file", "unknown"),
                            "start_line": f2.get("start_line", 1)
                        },
                        "similarity_score": round(score * 100, 1),
                        "clone_type": clone_type,
                        "recommendation": f"Extract shared logic into a common utility function in {f1.get('file', 'shared module')}."
                    })

        # Sort by highest similarity
        clones.sort(key=lambda x: x["similarity_score"], reverse=True)
        return clones

    except Exception as e:
        logger.error(f"Error during semantic clone detection: {e}")
        return []
