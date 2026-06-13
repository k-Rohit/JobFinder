"""FastAPI server: REST API + dashboard + daily background refresh."""
import json
import logging
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from . import db, fetchers, resume

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
log = logging.getLogger("jobfinder")

REFRESH_INTERVAL_HOURS = 24
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="JobFinder")
_refresh_lock = threading.Lock()
_progress = {"running": False, "current": "", "done": 0, "total": 0}


def run_refresh() -> dict:
    """Fetch all sources and store new jobs. Returns summary."""
    if not _refresh_lock.acquire(blocking=False):
        return {"status": "already-running"}
    try:
        _progress.update(running=True, current="", done=0,
                         total=len(fetchers.FETCHERS))

        def cb(name, done, total):
            _progress.update(current=name, done=done, total=total)

        jobs, stats = fetchers.fetch_all(progress=cb)
        new = db.upsert_jobs(jobs)
        db.prune_old()
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        summary = {"status": "ok", "matched": len(jobs), "new": new,
                   "sources": stats, "at": now}
        db.set_meta("last_refresh", json.dumps(summary))
        log.info("refresh done: %d matched, %d new", len(jobs), new)
        return summary
    finally:
        _progress["running"] = False
        _refresh_lock.release()


def _scheduler():
    while True:
        time.sleep(REFRESH_INTERVAL_HOURS * 3600)
        try:
            run_refresh()
        except Exception:
            log.exception("scheduled refresh failed")


@app.on_event("startup")
def startup():
    db.init_db()
    resume.init()
    threading.Thread(target=_scheduler, daemon=True).start()
    last = db.get_meta("last_refresh")
    stale = True
    if last:
        at = json.loads(last).get("at", "")
        try:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(at).replace(tzinfo=timezone.utc)
            stale = age.total_seconds() > REFRESH_INTERVAL_HOURS * 3600
        except ValueError:
            pass
    if stale:
        threading.Thread(target=run_refresh, daemon=True).start()


@app.get("/api/jobs")
def api_jobs(include_hidden: bool = False):
    return {"jobs": db.list_jobs(include_hidden=include_hidden)}


@app.post("/api/refresh")
def api_refresh():
    """Kick off a refresh in the background and return immediately."""
    if _progress["running"]:
        return {"status": "already-running"}
    threading.Thread(target=run_refresh, daemon=True).start()
    return {"status": "started"}


@app.get("/api/status")
def api_status():
    last = db.get_meta("last_refresh")
    out = json.loads(last) if last else {"status": "never-run"}
    out["refreshing"] = _progress["running"]
    if _progress["running"]:
        out["progress"] = {k: _progress[k] for k in ("current", "done", "total")}
    return out


@app.get("/api/config")
def api_config():
    """Profile info the dashboard needs to render (roles, country, freshness)."""
    from .config import CONFIG
    return {
        "roles": [{"key": r["key"], "label": r["label"]} for r in CONFIG["roles"]],
        "country": CONFIG["country"],
        "onsite_cities": CONFIG["onsite_cities"],
        "max_age_days": CONFIG["max_age_days"],
        "require_local_eligibility": CONFIG["require_local_eligibility"],
    }


@app.post("/api/jobs/status")
def api_set_status(payload: dict = Body(...)):
    """ID arrives in the body because some job IDs contain URLs/slashes."""
    job_id, status = payload.get("id"), payload.get("status")
    if status not in ("new", "saved", "applied", "hidden"):
        raise HTTPException(400, "bad status")
    if not db.set_status(job_id, status):
        raise HTTPException(404, "job not found")
    return {"ok": True}


# ----------------------------------------------------------- resume tailoring

@app.post("/api/resume")
async def api_upload_resume(file: UploadFile):
    blob = await file.read()
    if len(blob) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")
    try:
        return resume.save_resume(file.filename or "resume.pdf", blob)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/resume")
def api_resume_status():
    meta = resume.get_resume_meta()
    return meta or {"filename": None}


@app.post("/api/settings/openai-key")
def api_set_key(payload: dict = Body(...)):
    key = (payload.get("key") or "").strip()
    if not key:
        raise HTTPException(400, "Empty key")
    resume.set_api_key(key)
    return {"ok": True}


@app.post("/api/settings/jsearch-key")
def api_set_jsearch_key(payload: dict = Body(...)):
    key = (payload.get("key") or "").strip()
    if not key:
        raise HTTPException(400, "Empty key")
    db.set_meta("jsearch_key", key)
    return {"ok": True}


@app.get("/api/settings")
def api_settings():
    key = resume.get_api_key()
    jkey = fetchers._jsearch_key()
    return {"openai_key_set": bool(key),
            "openai_key_hint": f"…{key[-4:]}" if key else None,
            "jsearch_key_set": bool(jkey)}


@app.post("/api/jobs/{job_id}/tailor")
def api_tailor(job_id: str):
    try:
        return resume.tailor(job_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        log.exception("tailor failed")
        raise HTTPException(502, f"Tailoring failed: {e}")


@app.get("/api/jobs/{job_id}/tailor")
def api_get_tailored(job_id: str):
    t = resume.get_tailored(job_id)
    if not t:
        raise HTTPException(404, "Not tailored yet")
    return t


@app.get("/api/jobs/{job_id}/tailor/download")
def api_download_tailored(job_id: str, fmt: str = "docx"):
    t = resume.get_tailored(job_id)
    if not t:
        raise HTTPException(404, "Not tailored yet")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in job_id)[:60]
    if fmt == "md":
        return PlainTextResponse(
            t["resume_md"], media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="resume_{safe}.md"'})
    blob = resume.markdown_to_docx(t["resume_md"])
    return Response(
        blob,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="resume_{safe}.docx"'})


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html",
                        headers={"Cache-Control": "no-cache, must-revalidate"})


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
