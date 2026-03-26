 # main.py — CodeSentinel AI (Production API)
 
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
import os, uuid, asyncio, traceback

from agent_logic import analyze_user_query

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet



# ENV
load_dotenv()

app = FastAPI(title="CodeSentinel AI", version="1.0")


  
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