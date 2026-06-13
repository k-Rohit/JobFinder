FROM python:3.12-slim

# Keep Python lean and unbuffered for live container logs
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    JOBFINDER_DATA_DIR=/data

WORKDIR /app

# Install dependencies first so this layer is cached across code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY jobfinder ./jobfinder

# Persistent data (SQLite DB + uploaded resume) lives here; mount a volume
RUN mkdir -p /data && \
    useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app /data
USER appuser

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/api/status')" || exit 1

CMD ["uvicorn", "jobfinder.app:app", "--host", "0.0.0.0", "--port", "8787"]
