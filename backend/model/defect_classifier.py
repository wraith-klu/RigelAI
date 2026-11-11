"""
CodeSentinel AI — GraphCodeBERT Defect Classifier (Model 1)
============================================================
Implements Model 1: Fine-tuned GraphCodeBERT Sequence Classifier for
evaluating code smells, security vulnerabilities, and defect risks.
Operates with INT8 dynamic quantization on 2 vCPUs (<25ms latency budget).
"""

import logging
from typing import Dict, Any, Optional

try:
    from model.model_loader import predict_code_smell, get_model_and_tokenizer
except ImportError:
    from model_loader import predict_code_smell, get_model_and_tokenizer

logger = logging.getLogger("CodeSentinel.DefectClassifier")


class DefectClassifier:
    """GraphCodeBERT Defect Sentinel wrapper."""

    def __init__(self):
        self.model = None
        self.tokenizer = None

    def load(self):
        self.model, self.tokenizer = get_model_and_tokenizer()
        return self.model is not None

    def classify(self, code: str) -> Dict[str, Any]:
        return predict_code_smell(code)


def classify_defect(code: str) -> Dict[str, Any]:
    """Top-level convenience function for Model 1 Defect Classification."""
    return predict_code_smell(code)


# Alias matching Section 7 naming
predict_defect = predict_code_smell
