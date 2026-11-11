"""CodeSentinel AI Security Module."""
try:
    from .secret_scanner import scan_for_secrets, shannon_entropy, SECRET_PATTERNS
    from .osv_cve_checker import audit_dependencies, audit_cve, query_osv_single
except (ImportError, ValueError):
    from security.secret_scanner import scan_for_secrets, shannon_entropy, SECRET_PATTERNS
    from security.osv_cve_checker import audit_dependencies, audit_cve, query_osv_single

__all__ = [
    "scan_for_secrets",
    "shannon_entropy",
    "SECRET_PATTERNS",
    "audit_dependencies",
    "audit_cve",
    "query_osv_single",
]
