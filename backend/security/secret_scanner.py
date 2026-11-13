"""
CodeSentinel AI — Security & DevSecOps Intelligence Scanner
============================================================
Provides pre-flight static security checks:
1. Secret & Credential Leak Detection (Regex patterns + Shannon Entropy)
2. High-entropy pseudo-random API key identification (<1ms latency budget)
"""

import re
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger("CodeSentinel.SecurityScanner")

# Well-known API key and token regex signatures
SECRET_PATTERNS = [
    (r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}", "AWS Access Key ID", "critical"),
    (r"(?i)aws_secret_access_key\s*[:=]\s*['\"]?([A-Za-z0-9/+=]{40})['\"]?", "AWS Secret Access Key", "critical"),
    (r"gh[pousr]_[A-Za-z0-9_]{36,255}", "GitHub Personal Access Token", "critical"),
    (r"glpat-[A-Za-z0-9\-]{20,}", "GitLab Personal Access Token", "critical"),
    (r"sk-(?:proj-|live-)?[a-zA-Z0-9_\-]{20,}", "OpenAI Secret Key", "critical"),
    (r"sk-or-v1-[a-f0-9]{64}", "OpenRouter Secret Key", "critical"),
    (r"xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9-]{24,}", "Slack Token", "critical"),
    (r"AIza[0-9A-Za-z\\-_]{35}", "Google API Key", "critical"),
    (r"-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----", "Private Cryptographic Key", "critical"),
    (r"(?i)(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s\/]+", "Database Connection String with Credentials", "critical"),
    (r"(?i)(?:api_key|secret_key|client_secret|auth_token|access_token|entropy_token|token|password|passwd|pwd)\s*[:=]\s*['\"](?:Bearer\s+)?[A-Za-z0-9\-_.~!@#$%^&*+=]{12,}['\"]", "Hardcoded Credential / Secret", "warning"),
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
    for line_idx, line in enumerate(lines, 1):
        stripped = line.strip()
        # Skip pure comment lines for entropy, but check for explicit keys
        for pattern, secret_type, severity in SECRET_PATTERNS:
            matches = re.finditer(pattern, line)
            for m in matches:
                matched_str = m.group(0)
                # Redact sensitive token in reported output
                redacted = matched_str[:4] + "*" * min(16, len(matched_str) - 8) + matched_str[-4:] if len(matched_str) > 8 else "****"
                findings.append({
                    "id": f"{filename}:secret:{line_idx}:{secret_type.replace(' ', '_').lower()}",
                    "file": filename,
                    "line": line_idx,
                    "severity": severity,
                    "title": f"Hardcoded Credential Exposed: {secret_type}",
                    "message": f"Detected potential {secret_type} (`{redacted}`) on line {line_idx}.",
                    "suggestion": (
                        f"**CRITICAL SECURITY HAZARD:** Immediately revoke and rotate this {secret_type}. "
                        "Migrate credentials to an environment variable (`os.environ['...']`) or a secrets vault "
                        "(e.g., AWS Secrets Manager, GitHub Secrets, HashiCorp Vault)."
                    ),
                    "secret_type": secret_type,
                    "entropy": round(shannon_entropy(matched_str), 2),
                })

    # 2. Shannon entropy scan for unrecognized high-entropy strings
    for line_idx, line in enumerate(lines, 1):
        # Extract quoted string literals
        string_literals = re.findall(r"['\"]([A-Za-z0-9_\-+/=]{20,})['\"]", line)
        for s in string_literals:
            # Check if this string was already caught by known pattern
            if any(f.get("line") == line_idx for f in findings):
                continue
            entropy = shannon_entropy(s)
            is_hex = bool(re.fullmatch(r"[0-9a-fA-F]+", s))
            # Max possible entropy for 16-char hex alphabet is 4.0; threshold 3.3 for 32+ char hex
            entropy_threshold = 3.3 if is_hex and len(s) >= 32 else 4.5
            if entropy >= entropy_threshold:
                redacted = s[:4] + "*" * (len(s) - 8) + s[-4:] if len(s) > 8 else "****"
                findings.append({
                    "id": f"{filename}:entropy:{line_idx}",
                    "file": filename,
                    "line": line_idx,
                    "severity": "warning",
                    "title": "High-Entropy Secret Detected (Shannon Entropy)",
                    "message": f"High Shannon entropy string ({entropy:.2f} bits) detected: `{redacted}`.",
                    "suggestion": "Verify if this high-entropy string is an API token or cryptographic secret. If so, move to environment variables.",
                    "secret_type": "High Entropy String",
                    "entropy": round(entropy, 2),
                })

    return findings
