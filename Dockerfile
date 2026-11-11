# CodeSentinel AI — Production Hugging Face Space Docker Container
# Free Tier Optimized: 2 vCPU · 16 GB RAM · Port 7860
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    TRANSFORMERS_CACHE=/tmp/hf_cache \
    HF_HOME=/tmp/hf_cache

WORKDIR /app

# Install minimal OS build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only first (saves ~1.2 GB of GPU CUDA bloat)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install backend Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ /app/

# Set non-root user permissions for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 appuser && \
    mkdir -p /tmp/hf_cache /app/pdfs && \
    chown -R appuser:appuser /app /tmp/hf_cache
USER appuser

EXPOSE 7860

# Launch FastAPI on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
