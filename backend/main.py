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

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer # pyright: ignore[reportMissingModuleSource]
from reportlab.lib.styles import getSampleStyleSheet # pyright: ignore[reportMissingModuleSource]



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


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(BASE_DIR, "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)


  
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


def summarize_repository(repository_url: str, user_query: str) -> dict:
    owner, repo, branch, files = fetch_repository_files(repository_url)
    if not files:
        raise HTTPException(400, "No supported source files were found in this repository.")

    all_findings = []
    all_fixes = []
    scores = []
    combined_code = []
    languages = set()

    for source_file in files:
        code = source_file["code"]
        language = detect_language(source_file["path"])
        if language == "plaintext":
            language = detect_code_language(code)

        languages.add(language)
        ast_findings = analyze_ast(code)
        report = build_quality_report(
            code=code,
            language=language,
            ast_findings=ast_findings,
            filename=source_file["path"],
        )
        all_findings.extend(report["findings"])
        all_fixes.extend(report["fix_suggestions"])
        scores.append(report["health_score"])
        combined_code.append(f"# {source_file['path']}\n{code[:4000]}")

    severity_counts = {"critical": 0, "warning": 0, "suggestion": 0, "info": 0}
    for finding in all_findings:
        severity_counts[finding["severity"]] = severity_counts.get(finding["severity"], 0) + 1

    health_score = round(sum(scores) / len(scores)) if scores else 0
    session_id = create_session("\n\n".join(combined_code))
    project_name = f"{owner}/{repo}"
    llm_response = (
        f"Repository scan completed for **{project_name}** on branch `{branch}`.\n\n"
        f"- Files analyzed: {len(files)}\n"
        f"- Health score: {health_score}/100\n"
        f"- Critical: {severity_counts['critical']}, warnings: {severity_counts['warning']}, "
        f"suggestions: {severity_counts['suggestion']}\n\n"
        f"Focus requested: {user_query}"
    )

    return {
        "llm_analysis": {
            "session_id": session_id,
            "language": ", ".join(sorted(languages)),
            "repository_url": repository_url,
            "project_name": project_name,
            "files_analyzed": len(files),
            "branch": branch,
            "ast_findings": [finding["message"] for finding in all_findings],
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


class FollowupRequest(BaseModel):
    user_query: str
    session_id: str


class ChatRequest(BaseModel):
    user_query: str


class RepositoryRequest(BaseModel):
    repository_url: str
    user_query: str = "Analyze this repository for bugs, smells, complexity, and refactoring opportunities."


  
# HEALTH
  
@app.get("/health")
def health():
    return {"status": "alive"}


@app.get("/")
def root():
    return {"status": "CodeSentinel AI API running"}


# ⭐ CHAT — NO CODE REQUIRED
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query
        )
        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Chat failed")


  
# ANALYZE — FILE UPLOAD
  
@app.post("/analyze-file")
async def analyze_file(
    user_query: str = Form(...),
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
            code=code
        )

        # attach language info
        result["llm_analysis"]["language"] = language

        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "File analysis failed")


  
# ANALYZE — CODE EDITOR INPUT (JSON)
  
@app.post("/analyze-editor")
async def analyze_editor(req: EditorRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query,
            code=req.code,
            session_id=req.session_id
        )
        return JSONResponse(content=result)

    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Editor analysis failed")


  
# FOLLOW-UP — SESSION CONTINUATION
  
@app.post("/analyze-repository")
async def analyze_repository(req: RepositoryRequest):
    try:
        result = await asyncio.to_thread(
            summarize_repository,
            repository_url=req.repository_url,
            user_query=req.user_query,
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception:
        print(traceback.format_exc())
        raise HTTPException(500, "Repository analysis failed. Confirm the repository is public and reachable.")


@app.post("/followup")
async def followup(req: FollowupRequest):
    try:
        result = await asyncio.to_thread(
            analyze_user_query,
            user_query=req.user_query,
            session_id=req.session_id
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
