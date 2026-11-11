"""
CodeSentinel AI — Vercel Serverless Gateway
===========================================
Entrypoint for Vercel Serverless Functions.
Exposes the complete FastAPI application on Vercel's global edge network.
"""

import sys
import os

# Point Python path to the backend directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
