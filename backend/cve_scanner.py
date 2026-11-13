"""
CodeSentinel AI — CVE Scanner Module (Compatibility Wrapper)
============================================================
Re-exports from backend.security.osv_cve_checker for 100% backward compatibility.
"""

from security.osv_cve_checker import (
    audit_dependencies,
    audit_cve,
    query_osv_single,
    parse_requirements_txt,
    parse_package_json,
    parse_go_mod,
)

__all__ = [
    "audit_dependencies",
    "audit_cve",
    "query_osv_single",
    "parse_requirements_txt",
    "parse_package_json",
    "parse_go_mod",
]
