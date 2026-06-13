#!/bin/zsh
# Start the JobFinder portal at http://localhost:8787
cd "$(dirname "$0")"
exec .venv/bin/uvicorn jobfinder.app:app --host 127.0.0.1 --port 8787
