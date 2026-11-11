"""
CodeSentinel AI — Security & DevSecOps Intelligence Scanner
============================================================
Provides pre-flight static security checks:
1. Secret & Credential Leak Detection (Regex patterns + Shannon Entropy)
2. Free CVE Vulnerability Lookups via OSV.dev API (No API key required)
"""

import re
import math
import logging
from typing import List, Dict, Any
import requests

logger = logging.getLogger("CodeSentinel.SecurityScanner")

# Well-known API key and token regex signatures
SECRET_PATTERNS = [
    (r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}", "AWS Access Key ID", "critical"),
    (r"(?i)aws_secret_access_key\s*[:=]\s*['\"]?([A-Za-z0-9/+=]{40})['\"]?", "AWS Secret Access Key", "critical"),
    (r"gh[pousr]_[A-Za-z0-9_]{36,255}", "GitHub Personal Access Token", "critical"),
    (r"glpat-[A-Za-z0-9\-]{20,}", "GitLab Personal Access Token", "critical"),
    (r"sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}", "OpenAI Secret Key", "critical"),
    (r"sk-or-v1-[a-f0-9]{64}", "OpenRouter Secret Key", "critical"),
    (r"xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9-]{24,}", "Slack Token", "critical"),
    (r"AIza[0-9A-Za-z\\-_]{35}", "Google API Key", "critical"),
    (r"-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----", "Private Cryptographic Key", "critical"),
    (r"(?i)(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s\/]+", "Database Connection String with Credentials", "critical"),
    (r"(?i)(?:api_key|secret_key|client_secret|auth_token|access_token|password|passwd|pwd)\s*[:=]\s*['\"][A-Za-z0-9\-_.~!@#$%^&*+=]{12,}['\"]", "Hardcoded Credential / Secret", "warning"),
]


def shannon_entropy(data: str) -> float:
    """
    Computes Shannon entropy of a string to detect high-entropy pseudo-random secrets.
    Strings with entropy > 4.5 and length > 20 are strong candidates for API keys.
    """
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    char_counts = {}
    for char in data:
        char_counts[char] = char_counts.get(char, 0) + 1

    for count in char_counts.values():
        p_x = count / length
        entropy += -p_x * math.log2(p_x)

    return entropy


def scan_for_secrets(code: str, filename: str = "editor input") -> List[Dict[str, Any]]:
    """
    Scans source code for leaked credentials, private keys, and high-entropy secrets.
    """
    findings = []
    lines = code.splitlines()

    # 1. Pattern-based detection
    for line_idx, line in enumerate(lines, start=1):
        clean_line = line.strip()
        if not clean_line or clean_line.startswith(("#", "//", "/*", "*")):
            # Skip obvious doc comments unless they hold a real private key
            if "BEGIN" not in clean_line and "PRIVATE KEY" not in clean_line:
                continue

        for pattern, secret_type, severity in SECRET_PATTERNS:
            match = re.search(pattern, clean_line)
            if match:
                # Obfuscate secret in preview
                matched_str = match.group(0)
                masked_preview = matched_str[:4] + "*" * (len(matched_str) - 8) + matched_str[-4:] if len(matched_str) > 8 else "***REDACTED***"

                findings.append({
                    "id": f"{filename}:sec:{line_idx}",
                    "file": filename,
                    "line": line_idx,
                    "severity": severity,
                    "title": f"Security Leak: {secret_type}",
                    "message": f"Detected potential hardcoded secret ({secret_type}): `{masked_preview}`.",
                    "suggestion": "Move credentials to environment variables (.env) or a cloud secret manager immediately. Never commit secrets to source control.",
                })

    # 2. High-entropy token detection (strings enclosed in quotes)
    string_literals = re.findall(r"['\"]([A-Za-z0-9+/=_\-]{24,128})['\"]", code)
    for token in string_literals:
        # Ignore common hashes (md5/sha1) or UUIDs
        if re.fullmatch(r"[0-9a-f]{32}", token) or re.fullmatch(r"[0-9a-f-]{36}", token):
            continue
        entropy = shannon_entropy(token)
        if entropy > 4.6 and len(token) >= 28:
            # Find line number
            for line_idx, line in enumerate(lines, start=1):
                if token in line:
                    findings.append({
                        "id": f"{filename}:sec_entropy:{line_idx}",
                        "file": filename,
                        "line": line_idx,
                        "severity": "warning",
                        "title": "High-Entropy Secret Detected",
                        "message": f"Found high-entropy token (entropy: {entropy:.2f}): `{token[:4]}...{token[-4:]}`.",
                        "suggestion": "Verify this is not an API token or password. If it is, migrate it to environment configuration.",
                    })
                    break

    return findings


def query_osv_vulnerabilities(package_name: str, version: str, ecosystem: str = "PyPI") -> List[Dict[str, Any]]:
    """
    Queries OSV.dev (Open Source Vulnerabilities) API for known CVEs.
    Completely free and requires no authentication token.
    """
    url = "https://api.osv.dev/v1/query"
    payload = {
        "version": version,
        "package": {
            "name": package_name,
            "ecosystem": ecosystem
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=4.0)
        if response.status_code == 200:
            data = response.json()
            vulns = data.get("vulns", [])
            results = []
            for v in vulns[:5]:  # Return top 5
                results.append({
                    "id": v.get("id"),
                    "summary": v.get("summary", "Known vulnerability detected"),
                    "details": v.get("details", "")[:200] + "...",
                    "aliases": v.get("aliases", []),
                })
            return results
    except Exception as e:
        logger.debug(f"OSV.dev query error for {package_name}=={version}: {e}")

    return []
