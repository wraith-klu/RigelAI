"""
CodeSentinel AI — SQALE Technical Debt & Remediation Estimator
==============================================================
Implements the industry-standard SQALE (Software Quality Assessment based
on Lifecycle Expectations) methodology to quantify technical debt:
1. Standard Remediation Time Coefficients (Section 5.4 / Section 8):
   - Critical (Syntax error, CVE, Secret leak): 45 minutes
   - Warning (High complexity, Deep nesting, GraphCodeBERT defect): 20 minutes
   - Suggestion (Long line, TODO comment, code style): 5 minutes
   - Clone / Duplication: 30 minutes
2. Formula: Remediation Time (Minutes) = 45 C + 20 W + 5 S + 30 D
3. Remediation Hours = round(Minutes / 60.0, 1) -> e.g. 155 mins = 2.6 hrs
4. Estimated Remediation Dollar Cost ($85/hr standard engineering rate)
5. SQALE Maintainability Rating (Grade A through E based on debt per LoC)
"""

from typing import List, Dict, Any

HOURLY_ENGINEERING_RATE = 85.0  # USD / hour standard baseline

SEVERITY_EFFORT_MINUTES = {
    "critical": 45,    # Security leaks, CVEs, syntax errors, critical defects
    "warning": 20,     # Deep nesting, inefficient loops, code smells
    "suggestion": 5,   # Minor style issues, long lines, TODOs
    "clone": 30,       # Semantic duplication / code clone
    "info": 0,
}

# Compatibility hour coefficients
SEVERITY_EFFORT_HOURS = {
    k: round(v / 60.0, 3) for k, v in SEVERITY_EFFORT_MINUTES.items()
}


def calculate_technical_debt(
    findings: List[Dict[str, Any]],
    loc: int = 100,
    hourly_rate: float = HOURLY_ENGINEERING_RATE
) -> Dict[str, Any]:
    """
    Calculates technical debt metrics from static and neural review findings.
    
    Parameters:
      findings: List of finding dictionaries with 'severity' key (and optional 'clone' indicator)
      loc: Lines of code analyzed (used to calculate Maintainability Index rating)
      hourly_rate: Cost per developer hour (default $85/hr)

    Returns:
      Dictionary with debt minutes, debt hours, remediation cost, SQALE rating, and breakdown.
    """
    total_minutes = 0
    breakdown_minutes = {"critical": 0, "warning": 0, "suggestion": 0, "clone": 0}

    for f in findings:
        sev = f.get("severity", "suggestion").lower()
        title = (f.get("title") or "").lower()

        # Check if finding is a clone
        if "clone" in sev or "clone" in title or f.get("is_clone"):
            minutes = SEVERITY_EFFORT_MINUTES["clone"]
            breakdown_minutes["clone"] += minutes
        else:
            minutes = SEVERITY_EFFORT_MINUTES.get(sev, 5)
            if sev in breakdown_minutes:
                breakdown_minutes[sev] += minutes

        total_minutes += minutes

    # Debt hours rounded to 1 decimal place (e.g., 155 mins -> 2.6 hrs)
    debt_hours = round(total_minutes / 60.0, 1)
    remediation_cost_usd = round(debt_hours * hourly_rate, 2)

    # Maintainability Index (MI) Rating based on debt minutes per 1,000 LoC (Section 5.4):
    # Grade A: < 30 mins debt per 1,000 LoC
    # Grade B: 30 - 60 mins debt per 1,000 LoC
    # Grade C: 60 - 120 mins debt per 1,000 LoC
    # Grade D/F: > 120 mins debt per 1,000 LoC
    effective_loc = max(loc, 10)
    debt_per_1000_loc = (total_minutes / effective_loc) * 1000.0

    if debt_per_1000_loc < 30.0:
        sqale_rating = "A"
        maintainability_label = "High Maintainability"
    elif debt_per_1000_loc <= 60.0:
        sqale_rating = "B"
        maintainability_label = "Good Maintainability"
    elif debt_per_1000_loc <= 120.0:
        sqale_rating = "C"
        maintainability_label = "Technical Debt Noticeable"
    elif debt_per_1000_loc <= 300.0:
        sqale_rating = "D"
        maintainability_label = "High Debt Remediation Required"
    else:
        sqale_rating = "F"
        maintainability_label = "Severe Debt / Redesign Recommended"

    return {
        "debt_minutes": total_minutes,
        "debt_hours": debt_hours,
        "remediation_cost_usd": remediation_cost_usd,
        "sqale_rating": sqale_rating,
        "maintainability_label": maintainability_label,
        "debt_per_1000_loc": round(debt_per_1000_loc, 1),
        "hourly_rate": hourly_rate,
        "effort_breakdown_minutes": breakdown_minutes,
        "effort_breakdown_hours": {k: round(v / 60.0, 2) for k, v in breakdown_minutes.items()},
    }


class SQALECalculator:
    """Class wrapper for SQALE technical debt calculations."""

    def __init__(self, hourly_rate: float = HOURLY_ENGINEERING_RATE):
        self.hourly_rate = hourly_rate

    def evaluate(self, findings: List[Dict[str, Any]], loc: int = 100) -> Dict[str, Any]:
        return calculate_technical_debt(findings, loc, self.hourly_rate)
