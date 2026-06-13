"""SQLite storage for jobs with dedupe and user status tracking."""
import os
import sqlite3
import threading
from pathlib import Path

# Data location is configurable so a Docker volume can hold the DB + resume.
DATA_HOME = Path(os.environ.get("JOBFINDER_DATA_DIR",
                                Path(__file__).resolve().parent.parent))
DATA_HOME.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_HOME / "jobs.db"
_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,        -- source:source_id
    source      TEXT NOT NULL,
    title       TEXT NOT NULL,
    company     TEXT NOT NULL,
    url         TEXT NOT NULL,
    location    TEXT DEFAULT '',
    work_mode   TEXT DEFAULT 'remote',   -- remote | hybrid
    role        TEXT NOT NULL,           -- data-engineer | ai-engineer
    experience  TEXT DEFAULT 'unspecified', -- entry | junior | unspecified
    salary      TEXT DEFAULT '',
    skills      TEXT DEFAULT '',         -- comma separated
    description TEXT DEFAULT '',
    posted_at   TEXT DEFAULT '',         -- ISO date
    fetched_at  TEXT NOT NULL,
    fit_score   INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'new',      -- new | saved | applied | hidden
    region      TEXT DEFAULT 'global'    -- india | global (who can apply)
);
CREATE INDEX IF NOT EXISTS idx_jobs_role ON jobs(role);
CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock, get_conn() as conn:
        conn.executescript(SCHEMA)
        try:  # migration for DBs created before the region column existed
            conn.execute("ALTER TABLE jobs ADD COLUMN region TEXT DEFAULT 'global'")
        except sqlite3.OperationalError:
            pass


def upsert_jobs(jobs: list[dict]) -> int:
    """Insert jobs, skipping ones already present. Returns number of new rows."""
    new = 0
    with _lock, get_conn() as conn:
        for j in jobs:
            cur = conn.execute(
                """INSERT OR IGNORE INTO jobs
                   (id, source, title, company, url, location, work_mode, role,
                    experience, salary, skills, description, posted_at, fetched_at,
                    fit_score, region)
                   VALUES (:id, :source, :title, :company, :url, :location, :work_mode,
                           :role, :experience, :salary, :skills, :description,
                           :posted_at, :fetched_at, :fit_score, :region)""",
                j,
            )
            new += cur.rowcount
    return new


def list_jobs(include_hidden=False) -> list[dict]:
    q = "SELECT * FROM jobs"
    if not include_hidden:
        q += " WHERE status != 'hidden'"
    q += " ORDER BY posted_at DESC, fetched_at DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(q).fetchall()]


def set_status(job_id: str, status: str) -> bool:
    """Returns False when no row matched (bad/stale id)."""
    with _lock, get_conn() as conn:
        cur = conn.execute("UPDATE jobs SET status = ? WHERE id = ?",
                           (status, job_id))
        return cur.rowcount > 0


def set_meta(key: str, value: str):
    with _lock, get_conn() as conn:
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def get_meta(key: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None


def prune_old(days: int = 7):
    """Drop postings older than a week unless the user saved/applied.
    Jobs without a posting date age out by fetch date instead."""
    with _lock, get_conn() as conn:
        conn.execute(
            "DELETE FROM jobs WHERE status IN ('new','hidden') AND ("
            "  (posted_at != '' AND date(posted_at) < date('now', ?))"
            "  OR (posted_at = '' AND fetched_at < datetime('now', ?)))",
            (f"-{days} days", f"-{days} days"),
        )
