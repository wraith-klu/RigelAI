"""
CodeSentinel AI — SQALE Technical Debt & Remediation Estimator (Compatibility Module)
====================================================================================
Re-exports from backend.metrics.technical_debt for 100% backward compatibility.
"""

from metrics.technical_debt import (
    calculate_technical_debt,
    SQALECalculator,
    HOURLY_ENGINEERING_RATE,
    SEVERITY_EFFORT_MINUTES,
    SEVERITY_EFFORT_HOURS,
)

__all__ = [
    "calculate_technical_debt",
    "SQALECalculator",
    "HOURLY_ENGINEERING_RATE",
    "SEVERITY_EFFORT_MINUTES",
    "SEVERITY_EFFORT_HOURS",
]
