# cve_scanner.py - Zero-Cost CVE Software Composition Analysis via Google's OSV.dev API
# 100% Free, Zero API Keys, Unlimited Open-Source Vulnerability Database

import json
import re
import urllib.request
import urllib.error

OSV_QUERY_URL = "https://api.osv.dev/v1/query"
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"


def parse_requirements_txt(content: str) -> list[dict]:
    """Parse python requirements.txt into list of {name, version, ecosystem: PyPI}."""
    packages = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue

        # Match packages like flask==1.1.2 or requests==2.25.1
        match = re.match(r"^([a-zA-Z0-9_\-\.]+)\s*(?:==|===|~=)\s*([a-zA-Z0-9_\-\.]+)", line)
        if match:
            packages.append({
                "name": match.group(1).lower(),
                "version": match.group(2),
                "ecosystem": "PyPI",
            })
        else:
            # Fallback for bare package name
            m_pkg = re.match(r"^([a-zA-Z0-9_\-\.]+)", line)
            if m_pkg:
                packages.append({
                    "name": m_pkg.group(1).lower(),
                    "version": "",
                    "ecosystem": "PyPI",
                })
    return packages


def parse_package_json(content: str) -> list[dict]:
    """Parse npm package.json into list of {name, version, ecosystem: npm}."""
    packages = []
    try:
        data = json.loads(content)
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        for name, ver in deps.items():
            clean_ver = re.sub(r"[^0-9\.]", "", ver.split()[0] if ver else "")
            packages.append({
                "name": name,
                "version": clean_ver,
                "ecosystem": "npm",
            })
    except Exception:
        pass
    return packages


def parse_go_mod(content: str) -> list[dict]:
    """Parse go.mod into list of {name, version, ecosystem: Go}."""
    packages = []
    for line in content.splitlines():
        line = line.strip()
        match = re.search(r"^\s*([a-zA-Z0-9_\.\-\/]+)\s+v([0-9\.]+)", line)
        if match:
            packages.append({
                "name": match.group(1),
                "version": match.group(2),
                "ecosystem": "Go",
            })
    return packages


def query_single_package_cve(name: str, version: str, ecosystem: str = "PyPI", timeout: float = 4.0) -> list[dict]:
    """Query OSV.dev for vulnerabilities affecting a specific package version."""
    payload = {
        "package": {
            "name": name,
            "ecosystem": ecosystem,
        }
    }
    if version:
        payload["version"] = version

    req = urllib.request.Request(
        OSV_QUERY_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "CodeSentinel-AI/2.0"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            vulns = data.get("vulns", [])
            results = []
            for v in vulns:
                aliases = v.get("aliases", [])
                cve_id = next((a for a in aliases if a.startswith("CVE-")), v.get("id", "UNKNOWN"))
                severity = "HIGH"
                if "database_specific" in v and "severity" in v["database_specific"]:
                    severity = v["database_specific"]["severity"]
                elif v.get("severity"):
                    severity = v["severity"][0].get("score", "HIGH") if isinstance(v["severity"], list) else "HIGH"

                fixed_version = "Latest"
                for affected in v.get("affected", []):
                    for r in affected.get("ranges", []):
                        for event in r.get("events", []):
                            if "fixed" in event:
                                fixed_version = event["fixed"]

                results.append({
                    "id": v.get("id"),
                    "cve_id": cve_id,
                    "package": name,
                    "version": version or "all",
                    "ecosystem": ecosystem,
                    "severity": severity,
                    "summary": v.get("summary") or v.get("details", "")[:180] + "...",
                    "fixed_in": fixed_version,
                })
            return results
    except Exception:
        return []


def audit_dependencies(content: str, filename: str = "requirements.txt", max_packages: int = 15) -> list[dict]:
    """Audit dependency file content against OSV.dev and return structured vulnerability list."""
    fname = filename.lower()
    if fname.endswith("package.json"):
        packages = parse_package_json(content)
    elif fname.endswith("go.mod"):
        packages = parse_go_mod(content)
    else:
        packages = parse_requirements_txt(content)

    findings = []
    # Query top packages (capped to avoid serverless timeout)
    for pkg in packages[:max_packages]:
        if not pkg["name"]:
            continue
        vulns = query_single_package_cve(pkg["name"], pkg["version"], pkg["ecosystem"])
        findings.extend(vulns)

    return findings
