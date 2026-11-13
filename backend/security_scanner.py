"""
CodeSentinel AI — Security & DevSecOps Intelligence Scanner (Compatibility Module)
==================================================================================
Re-exports from backend.security.secret_scanner for 100% backward compatibility.
"""

from security.secret_scanner import (
    scan_for_secrets,
    shannon_entropy,
    SECRET_PATTERNS,
)

__all__ = [
    "scan_for_secrets",
    "shannon_entropy",
    "SECRET_PATTERNS",
]
