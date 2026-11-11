"""CodeSentinel AI Metrics Module."""
try:
    from .technical_debt import (
        calculate_technical_debt,
        SQALECalculator,
        HOURLY_ENGINEERING_RATE,
        SEVERITY_EFFORT_HOURS,
    )
except (ImportError, ValueError):
    from metrics.technical_debt import (
        calculate_technical_debt,
        SQALECalculator,
        HOURLY_ENGINEERING_RATE,
        SEVERITY_EFFORT_HOURS,
    )

__all__ = [
    "calculate_technical_debt",
    "SQALECalculator",
    "HOURLY_ENGINEERING_RATE",
    "SEVERITY_EFFORT_HOURS",
]
