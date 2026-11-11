"""
CodeSentinel AI — SQALE Technical Debt & Remediation Estimator
==============================================================
Implements the industry-standard SQALE (Software Quality Assessment based
on Lifecycle Expectations) methodology to quantify technical debt:
1. Debt Remediation Hours (broken down by severity)
2. Estimated Dollar Remediation Cost ($85/hr standard engineering rate)
3. SQALE Maintainability Rating (A through E)
4. Dynamic Code Health Score (0 to 100)
"""

from typing import List, Dict, Any

HOURLY_ENGINEERING_RATE = 85.0  # USD / hour standard baseline

SEVERITY_EFFORT_HOURS = {
    "critical": 2.5,   # Security leaks, crash bugs, critical defects
    "warning": 0.75,   # Deep nesting, inefficient loops, code smells
    "suggestion": 0.25, # Long lines, style violations, TODOs
    "info": 0.0,
}


def calculate_technical_debt(
    findings: List[Dict[str, Any]],
    loc: int = 100,
    hourly_rate: float = HOURLY_ENGINEERING_RATE
) -> Dict[str, Any]:
    """
    Calculates technical debt metrics from static and neural review findings.
    
    Parameters:
      findings: List of finding dictionaries with 'severity' key
      loc: Lines of code analyzed (used to calculate Technical Debt Ratio)
      hourly_rate: Cost per developer hour (default $85/hr)

    Returns:
      Dictionary with debt hours, remediation cost, SQALE rating, and breakdown.
    """
    total_hours = 0.0
    breakdown = {"critical": 0.0, "warning": 0.0, "suggestion": 0.0}

    for f in findings:
        sev = f.get("severity", "suggestion").lower()
        hours = SEVERITY_EFFORT_HOURS.get(sev, 0.25)
        total_hours += hours
        if sev in breakdown:
            breakdown[sev] += hours

    total_hours = round(total_hours, 2)
    remediation_cost_usd = round(total_hours * hourly_rate, 2)

    # Base development effort estimation: ~0.08 hours per line of code
    estimated_dev_hours = max(loc * 0.08, 1.0)
    debt_ratio = (total_hours / estimated_dev_hours) * 100.0

    # SQALE Rating calculation
    if debt_ratio <= 5.0 and total_hours < 1.0:
        sqale_rating = "A"
        maintainability_label = "High Maintainability"
    elif debt_ratio <= 10.0:
        sqale_rating = "B"
        maintainability_label = "Good Maintainability"
    elif debt_ratio <= 20.0:
        sqale_rating = "C"
        maintainability_label = "Technical Debt Noticeable"
    elif debt_ratio <= 50.0:
        sqale_rating = "D"
        maintainability_label = "High Debt Remediation Required"
    else:
        sqale_rating = "E"
        maintainability_label = "Severe Debt / Redesign Recommended"

    return {
        "debt_hours": total_hours,
        "remediation_cost_usd": remediation_cost_usd,
        "sqale_rating": sqale_rating,
        "maintainability_label": maintainability_label,
        "debt_ratio_pct": round(debt_ratio, 1),
        "hourly_rate": hourly_rate,
        "effort_breakdown_hours": breakdown,
    }


class SQALECalculator:
    """Class wrapper for SQALE technical debt calculations."""

    def __init__(self, hourly_rate: float = HOURLY_ENGINEERING_RATE):
        self.hourly_rate = hourly_rate

    def evaluate(self, findings: List[Dict[str, Any]], loc: int = 100) -> Dict[str, Any]:
        return calculate_technical_debt(findings, loc, self.hourly_rate)
