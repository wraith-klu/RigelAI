 # main.py — CodeSentinel AI (Production API)
import os
from urllib.error import HTTPError
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    UploadFile,
    Form,
    HTTPException,
    Body,
    BackgroundTasks,
    File,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import os, uuid, asyncio, traceback, json, re
from urllib.request import Request, urlopen

from agent_logic import (
    analyze_user_query,
    analyze_ast,
    build_quality_report,
    create_session,
    detect_language as detect_code_language,
)
from security_scanner import scan_for_secrets
from debt_calculator import calculate_technical_debt

try:
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer # pyright: ignore[reportMissingModuleSource]
    from reportlab.lib.styles import getSampleStyleSheet # pyright: ignore[reportMissingModuleSource]
    HAS_REPORTLAB = True
except Exception:
    SimpleDocTemplate, Paragraph, Spacer, getSampleStyleSheet = None, None, None, None
    HAS_REPORTLAB = False



# ENV
load_dotenv()

app = FastAPI(title="Rigel AI", version="2.0")
print("GitHub Token Loaded:", bool(os.getenv("GITHUB_TOKEN")))

  
# CORS
  
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def vercel_url_fix(request, call_next):
    matched = request.headers.get("x-matched-path")
    if matched:
        request.scope["path"] = matched.split("?")[0]
    return await call_next(request)


import tempfile
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(tempfile.gettempdir(), "codesentinel_pdfs")
try:
    os.makedirs(PDF_DIR, exist_ok=True)
except Exception:
    PDF_DIR = tempfile.gettempdir()


  
# LANGUAGE DETECTION
  
def detect_language(filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    return {
        "py": "python",
        "java": "java",
        "c": "c",
        "cpp": "cpp",
        "cc": "cpp",
        "h": "c",
        "js": "javascript",
        "ts": "typescript",
    }.get(ext, "plaintext")


SOURCE_EXTENSIONS = {
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".rs",
    ".php",
    ".rb",
}


def parse_github_repo_url(url: str) -> tuple[str, str]:
    match = re.search(r"github\.com[:/](?P<owner>[^/\s]+)/(?P<repo>[^/\s#?]+)", url.strip())
    if not match:
        raise HTTPException(400, "Use a valid GitHub repository URL.")

    repo = match.group("repo").removesuffix(".git")
    return match.group("owner"), repo


# def fetch_json(url: str) -> dict:
#     request = Request(url, headers={"User-Agent": "RigelAI-CodeSentinel"})
#     with urlopen(request, timeout=12) as response:
#         return json.loads(response.read().decode("utf-8"))
def fetch_json(url: str) -> dict:
    headers = {
        "User-Agent": "RigelAI-CodeSentinel"
    }

    github_token = os.getenv("GITHUB_TOKEN")

    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    request = Request(url, headers=headers)

    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))

    except HTTPError as e:
        if e.code == 403:
            raise HTTPException(
                status_code=429,
                detail="GitHub API rate limit exceeded. Please try again later."
            )
        raise

# def fetch_text(url: str) -> str:
#     request = Request(url, headers={"User-Agent": "RigelAI-CodeSentinel"})
#     with urlopen(request, timeout=12) as response:
#         return response.read().decode("utf-8", errors="ignore")
def fetch_text(url: str) -> str:
    headers = {
        "User-Agent": "RigelAI-CodeSentinel"
    }

    github_token = os.getenv("GITHUB_TOKEN")

    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    request = Request(url, headers=headers)

    try:
        with urlopen(request, timeout=12) as response:
            return response.read().decode("utf-8", errors="ignore")

    except HTTPError as e:
        if e.code == 403:
            raise HTTPException(
                status_code=429,
                detail="GitHub API rate limit exceeded. Please try again later."
            )
        raise

def fetch_repository_files(repository_url: str, max_files: int = 12, max_bytes: int = 120_000):
    owner, repo = parse_github_repo_url(repository_url)
    repo_api = f"https://api.github.com/repos/{owner}/{repo}"
    repo_meta = fetch_json(repo_api)
    default_branch = repo_meta.get("default_branch") or "main"
    tree_url = f"{repo_api}/git/trees/{default_branch}?recursive=1"
    tree = fetch_json(tree_url).get("tree", [])

    candidates = []
    for item in tree:
        path = item.get("path", "")
        _, ext = os.path.splitext(path.lower())
        if item.get("type") == "blob" and ext in SOURCE_EXTENSIONS and item.get("size", 0) <= max_bytes:
            candidates.append(path)
        if len(candidates) >= max_files:
            break

    files = []
    for path in candidates:
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
        files.append({"path": path, "code": fetch_text(raw_url)})

    return owner, repo, default_branch, files


def extract_functions_from_code(code: str, filepath: str) -> list[dict]:
    """Extracts function snippets from code files for semantic clone detection."""
    funcs = []
    lines = code.splitlines()

    if filepath.endswith(".py"):
        try:
            import ast
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    start = node.lineno
                    end = getattr(node, "end_lineno", min(start + len(node.body) + 1, len(lines)))
                    func_code = "\n".join(lines[start - 1:end])
                    if len(func_code.strip()) > 30:
                        funcs.append({
                            "name": node.name,
                            "file": filepath,
                            "code": func_code,
                            "start_line": start
                        })
        except Exception:
            pass

    if not funcs:
        pattern = r"(?:(?:public|private|protected|static|async|function|def)\s+)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*[\{:]"
        for idx, line in enumerate(lines, start=1):
            match = re.search(pattern, line)
            if match:
                snippet = "\n".join(lines[idx - 1:min(idx + 25, len(lines))])
                if len(snippet.strip()) > 30:
                    funcs.append({
                        "name": match.group(1),
                        "file": filepath,
                        "code": snippet,
                        "start_line": idx
                    })

    return funcs


def summarize_repository(repository_url: str, user_query: str, persona: str = "architect") -> dict:
    owner, repo, branch, files = fetch_repository_files(repository_url)
    if not files:
        raise HTTPException(400, "No supported source files were found in this repository.")

    all_findings = []
    all_fixes = []
    scores = []
    combined_code = []
    languages = set()
    all_functions = []
    total_loc = 0

    for source_file in files:
        code = source_file["code"]
        total_loc += len(code.splitlines())
        language = detect_language(source_file["path"])
        if language == "plaintext":
            language = detect_code_language(code)

        languages.add(language)
        ast_findings = analyze_ast(code)
        sec_findings = scan_for_secrets(code, filename=source_file["path"])

        report = build_quality_report(
            code=code,
            language=language,
            ast_findings=ast_findings,
            security_findings=sec_findings,
            filename=source_file["path"],
        )
        all_findings.extend(report["findings"])
        all_fixes.extend(report["fix_suggestions"])
        scores.append(report["health_score"])
        combined_code.append(f"# {source_file['path']}\n{code[:4000]}")

        # Extract function blocks for cross-file clone detection
        all_functions.extend(extract_functions_from_code(code, source_file["path"]))

    # Model 2: Semantic Clone Detection across files
    detected_clones = []
    if len(all_functions) >= 2:
        try:
            from model.clone_detector import detect_code_clones
            detected_clones = detect_code_clones(all_functions, similarity_threshold=0.85)
            for clone in detected_clones[:6]:
                f_a = clone["function_a"]
                f_b = clone["function_b"]
                all_findings.append({
                    "id": f"{f_a['file']}:clone:{f_a['start_line']}",
                    "file": f_a["file"],
                    "line": f_a["start_line"],
                    "severity": "warning",
                    "title": f"Semantic Clone ({clone['similarity_score']}% match)",
                    "message": f"Code matches `{f_b['name']}` in `{f_b['file']}` ({clone['clone_type']}).",
                    "suggestion": clone["recommendation"],
                })
        except Exception as e:
            print("Semantic clone detection skipped:", e)

    severity_counts = {"critical": 0, "warning": 0, "suggestion": 0, "info": 0}
    for finding in all_findings:
        severity_counts[finding["severity"]] = severity_counts.get(finding["severity"], 0) + 1

    health_score = round(sum(scores) / len(scores)) if scores else 0
    technical_debt = calculate_technical_debt(all_findings, loc=max(total_loc, 10))

    session_id = create_session("\n\n".join(combined_code))
    project_name = f"{owner}/{repo}"
    llm_response = (
        f"Repository scan completed for **{project_name}** on branch `{branch}`.\n\n"
        f"- Files analyzed: {len(files)} ({total_loc:,} lines of code)\n"
        f"- Code health score: **{health_score}/100**\n"
        f"- SQALE Maintainability Rating: **Grade {technical_debt['sqale_rating']}** ({technical_debt['maintainability_label']})\n"
        f"- Estimated Technical Debt: **{technical_debt['debt_hours']} hours** (~${technical_debt['remediation_cost_usd']:,.2f} remediation effort)\n"
        f"- Semantic Clones Detected: **{len(detected_clones)} pairs**\n"
        f"- Issues: Critical: {severity_counts['critical']}, Warnings: {severity_counts['warning']}, Suggestions: {severity_counts['suggestion']}\n\n"
        f"Review mode: **{persona.title()}** | Query: {user_query}"
    )

    return {
        "llm_analysis": {
            "session_id": session_id,
            "persona": persona,
            "language": ", ".join(sorted(languages)),
            "repository_url": repository_url,
            "project_name": project_name,
            "files_analyzed": len(files),
            "branch": branch,
            "ast_findings": [finding["message"] for finding in all_findings],
            "detected_clones": detected_clones,
            "model_prediction": {
                "smell_type": "Smelly" if severity_counts["critical"] or severity_counts["warning"] else "Clean",
                "confidence": 0.9 if severity_counts["critical"] or severity_counts["warning"] else 0.82,
                "all_probs": {
                    "Clean": 0.18 if severity_counts["critical"] or severity_counts["warning"] else 0.82,
                    "Smelly": 0.82 if severity_counts["critical"] or severity_counts["warning"] else 0.18,
                },
            },
            "llm_response": llm_response,
            "optimized_code": "",
            "quality_report": {
                "health_score": health_score,
                "severity_counts": severity_counts,
                "technical_debt": technical_debt,
                "clones_detected": len(detected_clones),
                "findings": all_findings,
                "fix_suggestions": all_fixes,
            },
        }
    }


  
# REQUEST MODELS
  
class EditorRequest(BaseModel):
    code: str
    user_query: str = "Analyze and optimize this code"
    session_id: str | None = None
    persona: str = "architect"  # "architect" or "student"


class FollowupRequest(BaseModel):
    user_query: str
    session_id: str
    persona: str = "architect"


class ChatRequest(BaseModel):
    user_query: str
    persona: str = "architect"


class RepositoryRequest(BaseModel):
    repository_url: str
    user_query: str = "Analyze this repository for bugs, smells, complexity, and refactoring opportunities."
    persona: str = "architect"


class SecretScanRequest(BaseModel):
    code: str
    filename: str = "input"


class CloneDetectionRequest(BaseModel):
    functions: list[dict]
    similarity_threshold: float = 0.85


# HEALTH & NEURAL ROSTER
  
@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "CodeSentinel AI — Neural MoS Engine",
        "models": {
            "defect_sentinel": os.getenv("DEFECT_MODEL_ID", "wraithklu/codesentinel-defect-sentinel"),
            "clone_detector": os.getenv("CLONE_MODEL_ID", "wraithklu/codesentinel-clone-detector"),
            "refactor_engine": os.getenv("REFACTOR_MODEL_ID", "wraithklu/codesentinel-codet5-refiner"),
            "llm_orchestrator": os.getenv("OPENROUTER_MODEL", "cohere/north-mini-code:free"),
        },
        "features": {
            "secret_scanner": True,
            "sqale_technical_debt": True,
            "dual_persona_review": True,
            "live_fix_score": True,
        }
    }


FRONTEND_DIST = os.path.join(BASE_DIR, "dist")
if not os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
    FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))

@app.get("/")
@app.get("/index.html")
def root():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"status": "CodeSentinel AI API running", "version": "3.0-MoS"}

@app.get("/favicon.svg")
@app.get("/favicon.ico")
def favicon():
    fav_file = os.path.join(FRONTEND_DIST, "favicon.svg")
    if os.path.exists(fav_file):
        return FileResponse(fav_file, media_type="image/svg+xml")
    from fastapi import Response
    return Response(status_code=204)

assets_dir = os.path.join(FRONTEND_DIST, "assets")
if os.path.exists(assets_dir):
    try:
        from fastapi.staticfiles import StaticFiles
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    except Exception:
        pass


# ⭐ PRE-FLIGHT DEVSECOPS SECRET SCANNER
@app.post("/scan-secrets")
@app.post("/api/scan-secrets")
def scan_secrets_endpoint(req: SecretScanRequest):
    findings = scan_for_secrets(req.code, filename=req.filename)
    return {
        "secrets_found": len(findings),
        "findings": findings
    }


# ⭐ PAIRWISE CODE CLONE DETECTOR (Model 2)
@app.post("/detect-clones")
@app.post("/api/detect-clones")
def detect_clones_endpoint(req: CloneDetectionRequest):
    try:
        from model.clone_detector import detect_code_clones
        clones = detect_code_clones(req.functions, similarity_threshold=req.similarity_threshold)
        return {
            "clones_detected": len(clones),
            "clones": clones
        }
    except Exception as e:
        return {"error": str(e), "clones": []}


# ⭐ CHAT — NO CODE REQUIRED
@app.post("/chat")
@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query,
            persona=req.persona,
        )
        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Chat failed")


# ANALYZE — FILE UPLOAD
  
@app.post("/analyze-file")
@app.post("/api/analyze-file")
async def analyze_file(
    user_query: str = Form(...),
    persona: str = Form("architect"),
    file: UploadFile = File(...)
):
    try:
        code_bytes = await file.read()

        try:
            code = code_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(400, "Unable to read file")

        language = detect_language(file.filename)

        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=user_query,
            code=code,
            persona=persona,
        )

        # attach language info
        result["llm_analysis"]["language"] = language

        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "File analysis failed")


# ANALYZE — CODE EDITOR INPUT (JSON)
  
@app.post("/analyze-editor")
@app.post("/api/analyze-editor")
async def analyze_editor(req: EditorRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query,
            code=req.code,
            session_id=req.session_id,
            persona=req.persona,
        )
        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Editor analysis failed")


# REPOSITORY ANALYSIS
  
@app.post("/analyze-repository")
@app.post("/api/analyze-repository")
async def analyze_repository(req: RepositoryRequest):
    try:
        result = await asyncio.to_thread(
            summarize_repository,
            repository_url=req.repository_url,
            user_query=req.user_query,
            persona=req.persona,
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Repository analysis failed. Confirm the repository is public and reachable.")


@app.post("/followup")
@app.post("/api/followup")
async def followup(req: FollowupRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query,
            session_id=req.session_id,
            persona=req.persona,
        )
        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Follow-up failed")


  
# AUTO DELETE FILE
  
def cleanup_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass


  
# DOWNLOAD DISCUSSION AS PDF
  
@app.post("/download-pdf")
@app.post("/api/download-pdf")
async def download_pdf(
    payload: dict = Body(...),
    background_tasks: BackgroundTasks = None
):
    text = payload.get("text")

    if not text:
        raise HTTPException(400, "No text provided")

    file_path = os.path.join(
        PDF_DIR,
        f"discussion_{uuid.uuid4().hex}.pdf"
    )

    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()
    elements = []

    for line in text.split("\n"):
        elements.append(Paragraph(line, styles["Normal"]))
        elements.append(Spacer(1, 10))

    doc.build(elements)

    if background_tasks:
        background_tasks.add_task(cleanup_file, file_path)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename="discussion.pdf"
    )
