"""
CodeSentinel AI — Root FastAPI Application Entrypoint
=====================================================
Used by Vercel Serverless Functions when detecting root app.py.
Delegates directly to the unified CodeSentinel FastAPI application.
"""

import sys
import os

root_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(root_dir, "api")
backend_dir = os.path.join(root_dir, "backend")

for d in [api_dir, backend_dir]:
    if os.path.isdir(d) and d not in sys.path:
        sys.path.insert(0, d)

from main import app
