# agent_logic.py — CodeSentinel AI (World-Class Reviewer)
 
import os
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
OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "nvidia/nemotron-3-nano-30b-a3b:free"
)

# INIT OPENROUTER CLIENT
client = None
if OpenAI and OPENROUTER_API_KEY:
    try:
        client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "Rigel AI"
            }
        )
        client.models.list()
        print("✅ OpenRouter authenticated")
    except Exception as e:
        print("❌ OpenRouter auth failed:", e)
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
            findings.append(
                f"Deep nesting at line {i+1}: {line.strip()}"
            )

    if "range(len(" in code:
        findings.append("Inefficient loop using range(len(...))")

    if "**2" in code or "** 2" in code:
        findings.append("Repeated square computation")

    return findings


 # DUMMY ML SMELL MODEL
def predict_code_smell(code: str):
    ast = analyze_ast(code)
    if ast:
        return {
            "smell_type": "Smelly",
            "confidence": 0.95,
            "all_probs": {"Clean": 0.05, "Smelly": 0.95}
        }
    return {
        "smell_type": "Clean",
        "confidence": 0.85,
        "all_probs": {"Clean": 0.85, "Smelly": 0.15}
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


 # ROBUST CODE EXTRACTION
def extract_optimized_code(text: str) -> str:
    if not text:
        return ""

    if "```" in text:
        try:
            parts = text.split("```")
            return parts[1].strip()
        except Exception:
            return ""

    return ""


 # MAIN ANALYSIS FUNCTION
def analyze_user_query(
    user_query: str,
    code: str = "",
    session_id: str | None = None
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
    # normal chat mode
        prompt = f"""
        You are Rigel AI, an expert programming assistant.

        USER QUESTION:
        {user_query}

        Answer clearly and concisely.
        """

        if client:
            completion = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful programming assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=800,
            )

            llm_response = completion.choices[0].message.content
        else:
            llm_response = "LLM client not configured."

        return {
            "llm_analysis": {
                "session_id": session_id,
                "llm_response": llm_response
            }
        }

    # ---------- ANALYSIS ----------
    ast_findings = analyze_ast(code)
    model_prediction = predict_code_smell(code)
    language = detect_language(code)

# ---------- PROMPT ----------
    prompt = f"""
    You are an expert senior software engineer helping a developer understand their code.

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

    If the question asks about:
    • complexity → explain time and space complexity
    • bugs → explain bugs
    • improvements → suggest improvements
    • refactoring → show improved code

    Only generate optimized code **if the user explicitly asks for it**.

    Respond clearly and concisely.

    FORMAT:

    ### Answer
    <direct explanation answering the user's question>

    If refactoring is requested:

    ### Optimized Code
    ```{language}
    <improved code>

"""
    # ---------- LLM CALL ----------
    if client:
        try:
            completion = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a world-class code reviewer."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
            )

            llm_response = completion.choices[0].message.content

        except Exception as e:
            llm_response = f"⚠️ LLM call failed: {e}"
    else:
        llm_response = "⚠️ LLM client not configured."

    # ---------- EXTRACT CODE ----------
    optimized_code = extract_optimized_code(llm_response)

    # Fallback → original code
    if not optimized_code:
        optimized_code = code

    update_code(session_id, optimized_code)

    # ---------- RETURN ----------
    return {
        "llm_analysis": {
            "session_id": session_id,
            "ast_findings": ast_findings,
            "model_prediction": model_prediction,
            "llm_response": llm_response,
            "optimized_code": optimized_code,
            "language": language
        }
    }


# ------------------------------- DEBUG -------------------------------
print("OPENROUTER_API_KEY:", OPENROUTER_API_KEY is not None)
print("OPENROUTER_MODEL:", OPENROUTER_MODEL)
print("LLM client initialized:", client is not None)
