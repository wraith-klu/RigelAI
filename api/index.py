"""
CodeSentinel AI — Vercel Serverless Gateway
===========================================
Entrypoint for Vercel Serverless Functions.
Exposes the complete FastAPI application on Vercel's global edge network.
"""

import sys
import os
import traceback

# Ensure current directory is in Python path for local imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from main import app
except Exception as e:
    err_trace = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI(title="Rigel AI — Fallback Error Handler")
    
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "HEAD", "OPTIONS"])
    def catch_all(full_path: str = ""):
        return JSONResponse(
            status_code=200,
            content={"error": "FastAPI load failed in api/index.py", "details": err_trace}
        )
