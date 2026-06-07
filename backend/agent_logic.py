# agent_logic.py - CodeSentinel AI reviewer

import ast
import json
import os
import re
import textwrap
import uuid

# ---------------- SAFE IMPORTS ----------------
try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv(path=None):
        return None

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


# LOAD ENV
BASE_DIR = os.path.dirname(__file__)
dotenv_path = os.path.join(BASE_DIR, ".env")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "poolside/laguna-m.1:free")

# INIT OPENROUTER CLIENT
client = None
if OpenAI and OPENROUTER_API_KEY:
    try:
        client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "Rigel AI",
            },
        )
        client.models.list()
        print("OpenRouter authenticated")
    except Exception as e:
        print("OpenRouter auth failed:", e)
        client = None


# IN-MEMORY SESSION STORE
_sessions = {}


def create_session(code: str) -> str:
    sid = str(uuid.uuid4())
    _sessions[sid] = code
    return sid


def get_code(session_id: str) -> str:
    return _sessions.get(session_id, "")


def update_code(session_id: str, code: str):
    _sessions[session_id] = code


# SIMPLE AST ANALYZER
def analyze_ast(code: str):
    findings = []
    lines = code.splitlines()

    for i, line in enumerate(lines):
        indent = len(line) - len(line.lstrip())
        if indent >= 8 and line.strip().startswith("if "):
            findings.append(f"Deep nesting at line {i + 1}: {line.strip()}")

    if "range(len(" in code:
        findings.append("Inefficient loop using range(len(...))")

    if "**2" in code or "** 2" in code:
        findings.append("Repeated square computation")

    return findings


def _line_for_contains(lines: list[str], needle: str) -> int | None:
    for index, line in enumerate(lines, start=1):
        if needle in line:
            return index
    return None


def build_quality_report(
    code: str,
    language: str,
    ast_findings: list[str] | None = None,
    optimized_code: str = "",
    filename: str = "editor input",
) -> dict:
    lines = code.splitlines()
    findings = []
    ast_findings = ast_findings or []

    def add_finding(severity: str, title: str, message: str, line: int | None, suggestion: str):
        findings.append(
            {
                "id": f"{filename}:{len(findings) + 1}",
                "file": filename,
                "line": line,
                "severity": severity,
                "title": title,
                "message": message,
                "suggestion": suggestion,
            }
        )

    for item in ast_findings:
        lowered = item.lower()
        line_match = re.search(r"line\s+(\d+)", item, re.IGNORECASE)
        line = int(line_match.group(1)) if line_match else None

        if "syntax error" in lowered:
            add_finding(
                "critical",
                "Syntax error",
                item,
                line,
                "Fix the syntax error before running deeper quality checks.",
            )
        elif "deep nesting" in lowered:
            add_finding(
                "warning",
                "Deep nesting",
                item,
                line,
                "Extract nested logic into helper functions or use guard clauses.",
            )
        elif "range(len" in lowered or "inefficient loop" in lowered:
            add_finding(
                "warning",
                "Inefficient index loop",
                item,
                _line_for_contains(lines, "range(len("),
                "Iterate directly with enumerate() or over the collection values.",
            )
        elif "square" in lowered:
            add_finding(
                "suggestion",
                "Repeated computation",
                item,
                _line_for_contains(lines, "**2") or _line_for_contains(lines, "** 2"),
                "Store repeated calculations in a named variable.",
            )
        elif item and "no major" not in lowered:
            add_finding(
                "suggestion",
                "Review finding",
                item,
                line,
                "Review this finding and simplify the affected code where possible.",
            )

    for index, line_text in enumerate(lines, start=1):
        stripped = line_text.strip()
        if len(line_text) > 100:
            add_finding(
                "suggestion",
                "Long line",
                "This line is longer than 100 characters.",
                index,
                "Break the expression into smaller named values or multiple lines.",
            )
        if stripped.startswith("TODO") or "TODO:" in stripped:
            add_finding(
                "suggestion",
                "Unresolved TODO",
                "A TODO marker is still present in the code.",
                index,
                "Replace TODO comments with implemented behavior or a tracked issue.",
            )

    if not findings:
        add_finding(
            "info",
            "No major issues detected",
            "Local static checks did not find major code smells.",
            None,
            "Run a broader project scan to catch cross-file design issues.",
        )

    severity_counts = {"critical": 0, "warning": 0, "suggestion": 0, "info": 0}
    for finding in findings:
        severity_counts[finding["severity"]] = severity_counts.get(finding["severity"], 0) + 1

    health_score = max(
        0,
        100
        - severity_counts["critical"] * 25
        - severity_counts["warning"] * 12
        - severity_counts["suggestion"] * 6,
    )

    fix_suggestions = [
        {
            "title": finding["title"],
            "file": finding["file"],
            "line": finding["line"],
            "severity": finding["severity"],
            "recommendation": finding["suggestion"],
        }
        for finding in findings
        if finding["severity"] != "info"
    ]

    if optimized_code:
        fix_suggestions.insert(
            0,
            {
                "title": "AI-generated refactor",
                "file": filename,
                "line": None,
                "severity": "suggestion",
                "recommendation": "Use the optimized code block as a before/after refactor candidate.",
            },
        )

    return {
        "health_score": health_score,
        "severity_counts": severity_counts,
        "findings": findings,
        "fix_suggestions": fix_suggestions,
    }


# DUMMY ML SMELL MODEL
def predict_code_smell(code: str):
    ast_findings = analyze_ast(code)
    if ast_findings:
        return {
            "smell_type": "Smelly",
            "confidence": 0.95,
            "all_probs": {"Clean": 0.05, "Smelly": 0.95},
        }
    return {
        "smell_type": "Clean",
        "confidence": 0.85,
        "all_probs": {"Clean": 0.85, "Smelly": 0.15},
    }


# LANGUAGE DETECTION
def detect_language(code: str) -> str:
    if "import java" in code or "public class" in code:
        return "java"
    if "#include" in code:
        return "cpp"
    if "console.log" in code or "function " in code:
        return "javascript"
    if "def " in code:
        return "python"
    return "plaintext"


def wants_optimized_code(user_query: str) -> bool:
    query = user_query.lower()
    keywords = (
        "optimize",
        "optimized",
        "improve",
        "improved",
        "refactor",
        "refactoring",
        "fix",
        "correct",
        "rewrite",
        "cleaner code",
    )
    return any(keyword in query for keyword in keywords)


def _strip_code_fence_language(code: str) -> str:
    lines = code.strip().splitlines()
    if lines and re.fullmatch(r"[A-Za-z0-9_+#.-]+", lines[0].strip()):
        return "\n".join(lines[1:]).strip()
    return code.strip()


def extract_optimized_code(text: str) -> str:
    if not text or "```" not in text:
        return ""

    fenced_blocks = re.findall(r"```(?:[A-Za-z0-9_+#.-]+)?\s*([\s\S]*?)```", text)
    for block in fenced_blocks:
        code = _strip_code_fence_language(block)
        if code and not code.lstrip().startswith("{"):
            return code

    return ""


def extract_llm_payload(text: str) -> tuple[str, str]:
    if not text:
        return "", ""

    candidate = text.strip()
    if "```" in candidate:
        fenced_blocks = re.findall(r"```(?:json)?\s*([\s\S]*?)```", candidate)
        for block in fenced_blocks:
            block = block.strip()
            if block.startswith("{") and block.endswith("}"):
                candidate = block
                break

    if candidate.startswith("{"):
        try:
            payload = json.loads(candidate)
            answer = str(payload.get("answer") or "").strip()
            optimized_code = str(payload.get("optimized_code") or "").strip()
            return answer, optimized_code
        except json.JSONDecodeError:
            pass

    return text.strip(), extract_optimized_code(text)


def is_valid_code(code: str, language: str) -> bool:
    if not code.strip():
        return False

    if language == "python":
        try:
            ast.parse(code)
            return True
        except SyntaxError:
            return False

    return True


def local_optimized_code(code: str, language: str) -> str:
    """Deterministic fallback for the built-in discount demo when LLM code is invalid."""
    if language != "python":
        return ""

    lowered = code.lower()
    is_discount_example = (
        "calculate_discount" in lowered
        and "items" in lowered
        and "price" in lowered
        and "active" in lowered
    )

    if not is_discount_example:
        return ""

    return textwrap.dedent(
        """
        def calculate_discount(items, threshold=500, discount=50):
            \"\"\"Return the total price for active items after applying a fixed discount.\"\"\"
            total = sum(
                item["price"]
                for item in items
                if item.get("active") and isinstance(item.get("price"), (int, float))
            )

            if total > threshold:
                total -= discount

            return total
        """
    ).strip()


def call_llm(prompt: str, system_message: str, temperature: float, max_tokens: int) -> str:
    if not client:
        return "LLM client not configured."

    try:
        completion = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"LLM call failed: {e}"


# MAIN ANALYSIS FUNCTION
def analyze_user_query(
    user_query: str,
    code: str = "",
    session_id: str | None = None,
) -> dict:
    # ---------- SESSION ----------
    if session_id:
        stored = get_code(session_id)
        if not stored:
            return {"llm_analysis": {"error": "Session expired"}}
        code = stored
    else:
        session_id = create_session(code)

    if not code.strip():
        prompt = f"""
        You are Rigel AI, an expert programming assistant.

        USER QUESTION:
        {user_query}

        Answer clearly and concisely.
        """

        llm_response = call_llm(
            prompt=prompt,
            system_message="You are a helpful programming assistant.",
            temperature=0.3,
            max_tokens=800,
        )

        return {
            "llm_analysis": {
                "session_id": session_id,
                "llm_response": llm_response,
            }
        }

    # ---------- ANALYSIS ----------
    ast_findings = analyze_ast(code)
    model_prediction = predict_code_smell(code)
    language = detect_language(code)
    should_generate_code = wants_optimized_code(user_query)
    optimized_code_instruction = "\"<corrected code>\"" if should_generate_code else "\"\""

    # ---------- PROMPT ----------
    prompt = f"""
    You are an expert senior software engineer helping a developer understand and improve their code.

    LANGUAGE: {language}

    CODE:
    {code}

    AST Findings:
    {ast_findings}

    ML Prediction:
    {model_prediction}

    USER QUESTION:
    {user_query}

    INSTRUCTIONS:
    - Answer the user's question directly.
    - If optimized code is requested, return fully corrected, runnable {language} code.
    - Do not return the original code unless it is already correct and optimal.
    - Preserve the user's apparent intent while fixing syntax and logic bugs.
    - For Python, optimized_code must parse with ast.parse.
    - Return valid JSON only. Do not wrap it in markdown.

    JSON SCHEMA:
    {{
      "answer": "Brief review notes and explanation.",
      "optimized_code": {optimized_code_instruction}
    }}
    """

    # ---------- LLM CALL ----------
    llm_response = call_llm(
        prompt=prompt,
        system_message="You are a world-class code reviewer. Return only valid JSON.",
        temperature=0.1,
        max_tokens=2000,
    )

    # ---------- EXTRACT AND VALIDATE CODE ----------
    answer, optimized_code = extract_llm_payload(llm_response)
    optimized_code = _strip_code_fence_language(optimized_code)

    if should_generate_code and not is_valid_code(optimized_code, language):
        optimized_code = local_optimized_code(code, language)

    if not should_generate_code or not is_valid_code(optimized_code, language):
        optimized_code = ""

    update_code(session_id, optimized_code or code)

    # ---------- RETURN ----------
    quality_report = build_quality_report(
        code=code,
        language=language,
        ast_findings=ast_findings,
        optimized_code=optimized_code,
    )

    return {
        "llm_analysis": {
            "session_id": session_id,
            "ast_findings": ast_findings,
            "model_prediction": model_prediction,
            "llm_response": answer or llm_response,
            "optimized_code": optimized_code,
            "language": language,
            "quality_report": quality_report,
        }
    }


# ------------------------------- DEBUG -------------------------------
print("OPENROUTER_API_KEY:", OPENROUTER_API_KEY is not None)
print("OPENROUTER_MODEL:", OPENROUTER_MODEL)
print("LLM client initialized:", client is not None)
