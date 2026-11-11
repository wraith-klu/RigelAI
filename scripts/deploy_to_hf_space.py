#!/usr/bin/env python3
"""
CodeSentinel AI — 1-Click Hugging Face Space Deployment Script
=============================================================
Creates and deploys the CodeSentinel AI backend to a free Hugging Face Space
(2 vCPU · 16 GB RAM · Port 7860) using the Docker SDK.

Usage:
  python scripts/deploy_to_hf_space.py --username wraithklu --space_name codesentinel-api
"""

import os
import argparse
import sys
import shutil
import tempfile
from huggingface_hub import HfApi, login

def main():
    parser = argparse.ArgumentParser(description="Deploy CodeSentinel AI to Hugging Face Spaces")
    parser.add_argument("--username", type=str, default="wraithklu", help="Hugging Face username")
    parser.add_argument("--space_name", type=str, default="codesentinel-api", help="Target Space name")
    parser.add_argument("--token", type=str, default=None, help="Hugging Face Write Token (optional if already logged in)")
    args = parser.parse_args()

    api = HfApi(token=args.token)
    repo_id = f"{args.username}/{args.space_name}"

    print("=" * 70)
    print(f"🚀 Deploying CodeSentinel AI to Hugging Face Space: https://huggingface.co/spaces/{repo_id}")
    print("=" * 70)

    # 1. Create Space repo if not exists
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True,
            private=False
        )
        print(f"✅ Space repository verified: {repo_id}")
    except Exception as e:
        print(f"ℹ️  Repo check note: {e}")

    # 2. Prepare staging directory for clean deploy
    with tempfile.TemporaryDirectory() as staging_dir:
        print(f"📦 Staging deploy files...")

        # Copy Dockerfile
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        shutil.copy(os.path.join(root_dir, "Dockerfile"), os.path.join(staging_dir, "Dockerfile"))

        # Copy backend directory
        backend_dest = os.path.join(staging_dir, "backend")
        shutil.copytree(
            os.path.join(root_dir, "backend"),
            backend_dest,
            ignore=shutil.ignore_patterns(".env", "__pycache__", "*.pyc", "pdfs")
        )

        # Create Space README.md with frontmatter metadata
        space_readme = f"""---
title: CodeSentinel AI Backend
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🛡️ CodeSentinel AI — Production Neural Backend
Multi-Model Code Review, Vulnerability Sentinel & Automated Refactoring Engine.

### Specialist Models Connected:
- **Defect Sentinel**: [{args.username}/codesentinel-defect-sentinel](https://huggingface.co/{args.username}/codesentinel-defect-sentinel)
- **Clone Detector**: [{args.username}/codesentinel-clone-detector](https://huggingface.co/{args.username}/codesentinel-clone-detector)
- **Refactor Engine**: [{args.username}/codesentinel-codet5-refiner](https://huggingface.co/{args.username}/codesentinel-codet5-refiner)
"""
        with open(os.path.join(staging_dir, "README.md"), "w", encoding="utf-8") as f:
            f.write(space_readme)

        # 3. Upload to Space
        print(f"📤 Uploading Dockerfile, requirements, and backend files to Hugging Face...")
        api.upload_folder(
            folder_path=staging_dir,
            repo_id=repo_id,
            repo_type="space",
            commit_message="Deploy CodeSentinel AI Neural MoS Backend (Phase 5)"
        )

    print("\n" + "=" * 70)
    print(f"🎉 SUCCESS! CodeSentinel Backend is building at:")
    print(f"👉 https://huggingface.co/spaces/{repo_id}")
    print("=" * 70)
    print("\nNext step: Go to Space Settings -> Variables and secrets, and add:")
    print("  • OPENROUTER_API_KEY")
    print("  • OPENROUTER_MODEL = poolside/laguna-s-2.1:free")
    print(f"  • DEFECT_MODEL_ID = {args.username}/codesentinel-defect-sentinel")
    print(f"  • CLONE_MODEL_ID = {args.username}/codesentinel-clone-detector")
    print(f"  • REFACTOR_MODEL_ID = {args.username}/codesentinel-codet5-refiner")

if __name__ == "__main__":
    main()
