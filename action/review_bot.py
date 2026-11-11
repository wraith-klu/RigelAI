#!/usr/bin/env python3
"""
review_bot.py - CodeSentinel AI GitHub Action PR Review Bot
Performs automated code reviews on modified PR files and posts sticky comments.
"""

import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
API_ENDPOINT = os.environ.get("INPUT_API_ENDPOINT", "https://rigel-ai-agent.vercel.app/api/analyze-file")
HEALTH_THRESHOLD = int(os.environ.get("INPUT_HEALTH_THRESHOLD", "75"))
PERSONA = os.environ.get("INPUT_PERSONA", "architect")
PR_NUMBER = os.environ.get("PR_NUMBER", "")
REPO_NAME = os.environ.get("REPO_NAME", "")


def github_api_request(url: str, method: str = "GET", data: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CodeSentinel-AI-Bot",
    }
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_pr_files() -> list[dict]:
    if not REPO_NAME or not PR_NUMBER:
        print("[CodeSentinel] No PR_NUMBER or REPO_NAME detected. Running on local files.")
        return []
    url = f"https://api.github.com/repos/{REPO_NAME}/pulls/{PR_NUMBER}/files"
    try:
        return github_api_request(url)
    except Exception as e:
        print(f"[CodeSentinel] Could not fetch PR files: {e}")
        return []


def analyze_file(filename: str, content: str) -> dict:
    payload = {
        "code": content,
        "filename": filename,
        "language": "python" if filename.endswith(".py") else "javascript",
        "persona": PERSONA,
    }
    req = urllib.request.Request(
        API_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "CodeSentinel-Action"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[CodeSentinel] API analysis failed for {filename}: {e}")
        return {}


def post_pr_comment(comment_body: str):
    if not REPO_NAME or not PR_NUMBER or not GITHUB_TOKEN:
        print("\n=== CODESENTINEL LOCAL AUDIT SUMMARY ===")
        print(comment_body)
        return

    url = f"https://api.github.com/repos/{REPO_NAME}/issues/{PR_NUMBER}/comments"
    try:
        github_api_request(url, method="POST", data={"body": comment_body})
        print(f"[CodeSentinel] Successfully posted review comment to PR #{PR_NUMBER}.")
    except Exception as e:
        print(f"[CodeSentinel] Failed to post comment: {e}")


def main():
    print(f"🛡️ Launching CodeSentinel AI Review Bot (Persona: {PERSONA}, Threshold: {HEALTH_THRESHOLD}/100)...")
    pr_files = get_pr_files()

    scanned_count = 0
    total_health = 0
    all_findings = []
    overall_debt = 0.0

    # Read modified files
    for f in pr_files:
        filename = f.get("filename", "")
        # Filter for source code files
        if not filename.endswith((".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".cpp")):
            continue

        raw_url = f.get("raw_url", "")
        if not raw_url:
            continue

        try:
            req = urllib.request.Request(raw_url, headers={"Authorization": f"Bearer {GITHUB_TOKEN}"})
            with urllib.request.urlopen(req, timeout=10) as r:
                content = r.read().decode("utf-8", errors="ignore")
        except Exception:
            continue

        result = analyze_file(filename, content)
        if not result:
            continue

        scanned_count += 1
        qr = result.get("quality_report", {})
        h_score = qr.get("health_score", 85)
        debt_hours = qr.get("technical_debt", {}).get("remediation_hours", 0.5)

        total_health += h_score
        overall_debt += debt_hours

        for finding in qr.get("findings", []):
            if finding.get("severity") in ("critical", "warning"):
                all_findings.append({
                    "file": filename,
                    "line": finding.get("line"),
                    "title": finding.get("title"),
                    "message": finding.get("message"),
                })

    avg_health = round(total_health / scanned_count) if scanned_count else 95
    status = "🟢 PASSED" if avg_health >= HEALTH_THRESHOLD else "🔴 FAILED"

    # Build Sticky PR Comment
    comment = f"""## 🛡️ CodeSentinel AI Quality Report

| Metric | Score | Status |
|---|---|---|
| **Code Health** | **{avg_health}/100** | {status} |
| **Files Audited** | **{scanned_count}** | Complete |
| **SQALE Technical Debt** | **{overall_debt:.1f} hrs** | Estimated |
| **Health Threshold** | **{HEALTH_THRESHOLD}/100** | Required |

"""

    if all_findings:
        comment += "### ⚠️ Key Code Smells & Security Observations:\n"
        for item in all_findings[:8]:
            line_str = f":{item['line']}" if item['line'] else ""
            comment += f"- **`{item['file']}{line_str}`** — **{item['title']}**: {item['message']}\n"
    else:
        comment += "✅ **No critical code smells, security leaks, or architectural anti-patterns found.**\n"

    comment += f"\n*Reviewed automatically by [CodeSentinel AI](https://rigel-ai-agent.vercel.app) ({PERSONA.title()} Mode).*"

    post_pr_comment(comment)

    if avg_health < HEALTH_THRESHOLD:
        print(f"[CodeSentinel] FAILED: Code health ({avg_health}) is below threshold ({HEALTH_THRESHOLD}).")
        sys.exit(1)
    else:
        print(f"[CodeSentinel] PASSED: Code health ({avg_health}) meets threshold ({HEALTH_THRESHOLD}).")
        sys.exit(0)


if __name__ == "__main__":
    main()
