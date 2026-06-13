"""Role matching, seniority filtering, skill extraction, and fit scoring.

The profile-specific matchers are built from jobfinder.config so the whole
app can be retargeted to other roles / countries by editing config.json.
"""
import re

from .config import CONFIG


def _kw_to_pattern(keyword: str) -> str:
    """Turn a plain keyword ('data engineer', 'ai/ml engineer') into a
    word-boundary regex with flexible whitespace."""
    escaped = re.escape(keyword.strip())
    escaped = escaped.replace(r"\ ", r"\s+")  # spaces -> flexible whitespace
    return rf"(?<!\w){escaped}(?!\w)"


def _kw_alt(keywords: list[str]) -> re.Pattern:
    return re.compile("|".join(_kw_to_pattern(k) for k in keywords), re.I)


def _years_alt(lo: int, hi: int) -> str:
    """Regex alternation matching integers in [lo, hi] (hi capped at 40)."""
    return "(?:" + "|".join(str(n) for n in range(lo, min(hi, 40) + 1)) + ")"


def _exp_re(lo: int, hi: int) -> re.Pattern:
    """'<n> [to m] [+] years of [...] experience' for n in [lo, hi]."""
    return re.compile(
        rf"\b(?:minimum\s+of\s+)?{_years_alt(lo, hi)}\s*\+?\s*(?:to\s+\d+\s*)?"
        r"(?:years?|yrs?)\b(?:\s+of)?\s+(?:relevant\s+|professional\s+|"
        r"industry\s+|hands[\s-]on\s+)?(?:experience|exp)\b",
        re.I,
    )


# ---------------------------------------------------------------- role match
# {role_key: compiled title matcher}
_ROLE_RES = {r["key"]: _kw_alt(r["title_keywords"]) for r in CONFIG["roles"]}
ROLE_LABELS = {r["key"]: r["label"] for r in CONFIG["roles"]}

# Titles that are clearly NOT individual-contributor engineering roles
EXCLUDE_TITLE = _kw_alt(CONFIG["exclude_title_keywords"])

ENTRY_HINTS = re.compile(
    r"\b(entry[\s-]?level|junior|jr\.?|graduate|grad|fresher|early[\s-]?career|"
    r"associate|intern(ship)?|trainee|new\s+grad|campus|apprentice)\b",
    re.I,
)

_COMFORT = int(CONFIG["comfortable_years"])
_MAX_EXP = int(CONFIG["max_experience_years"])
# Experience demands that rule a job out (more than max_experience_years).
TOO_SENIOR_EXP = _exp_re(_MAX_EXP + 1, 40)
# Between comfortable and max: a stretch, but worth applying to.
STRETCH_EXP = _exp_re(_COMFORT + 1, _MAX_EXP)
OK_EXP = re.compile(
    r"\b(0|1|one|zero)\s*[-–to]*\s*[12]?\s*(?:years?|yrs?)\b|\bno\s+experience\b",
    re.I,
)

HYBRID_RE = re.compile(r"\bhybrid\b", re.I)

# Onsite/hybrid jobs are only useful in the user's cities; remote can be global
ONSITE_CITIES = _kw_alt(CONFIG["onsite_cities"])
INDIA_HUBS = ONSITE_CITIES  # backwards-compatible alias

# ------------------------------------------------- who can the job hire?
_REQUIRE_LOCAL = bool(CONFIG["require_local_eligibility"])
HOME_REGION_RE = _kw_alt(CONFIG["home_terms"])
GLOBAL_REGION_RE = _kw_alt(CONFIG["global_terms"])
EXCLUDED_REGION_RE = _kw_alt(CONFIG["excluded_terms"])
RESIDENCY_RE = re.compile(
    r"(?:located|based|residing|live|reside|eligible\s+to\s+work|"
    r"authorized\s+to\s+work)\s+in\s+(?:the\s+)?(?:"
    + "|".join(re.escape(t) for t in CONFIG["residency_exclude_terms"]) + r")\b",
    re.I,
)


def hiring_region(location: str, description: str = "") -> str:
    """'home'   - explicitly open to / located in your country
       'global' - worldwide or no stated restriction
       'other'  - restricted to a region that excludes your country (drop)"""
    if not _REQUIRE_LOCAL:
        return "global"
    loc = location or ""
    if HOME_REGION_RE.search(loc):
        return "home"
    if GLOBAL_REGION_RE.search(loc):
        return "global"
    if EXCLUDED_REGION_RE.search(loc):
        return "other"
    text = (description or "")[:2000]
    if RESIDENCY_RE.search(text):
        return "other"
    if HOME_REGION_RE.search(text):
        return "home"
    return "global"


ONSITE_RE = re.compile(r"\bon[\s-]?site\b|\bin[\s-]?office\b|\boffice[\s-]?based\b", re.I)
REMOTE_RE = re.compile(r"\bremote\b|\bwork\s+from\s+home\b|\bwfh\b|\bflexible\b|\banywhere\b", re.I)

# ---------------------------------------------------------------- skills
SKILLS = {
    "Python": r"\bpython\b",
    "SQL": r"\bsql\b",
    "Spark": r"\b(?:py)?spark\b",
    "Airflow": r"\bairflow\b",
    "dbt": r"\bdbt\b",
    "Kafka": r"\bkafka\b",
    "AWS": r"\baws\b|\bamazon\s+web\s+services\b",
    "GCP": r"\bgcp\b|\bgoogle\s+cloud\b|\bbigquery\b",
    "Azure": r"\bazure\b",
    "Snowflake": r"\bsnowflake\b",
    "Databricks": r"\bdatabricks\b",
    "Redshift": r"\bredshift\b",
    "PostgreSQL": r"\bpostgres(?:ql)?\b",
    "MongoDB": r"\bmongo(?:db)?\b",
    "Docker": r"\bdocker\b",
    "Kubernetes": r"\bkubernetes\b|\bk8s\b",
    "Terraform": r"\bterraform\b",
    "ETL/ELT": r"\betl\b|\belt\b",
    "Pandas": r"\bpandas\b",
    "Scala": r"\bscala\b",
    "Java": r"\bjava\b(?!script)",
    "Go": r"\bgolang\b",
    "PyTorch": r"\bpytorch\b|\btorch\b",
    "TensorFlow": r"\btensorflow\b",
    "Hugging Face": r"\bhugging\s?face\b|\btransformers\b",
    "LangChain": r"\blangchain\b|\blanggraph\b",
    "LLMs": r"\bllms?\b|\blarge\s+language\s+models?\b",
    "RAG": r"\brag\b|\bretrieval[\s-]augmented\b",
    "Vector DBs": r"\bvector\s+(?:database|db|store)s?\b|\bpinecone\b|\bweaviate\b|\bqdrant\b|\bchroma\b|\bfaiss\b|\bmilvus\b",
    "OpenAI API": r"\bopenai\b|\bgpt-?[345o]\b",
    "Claude/Anthropic": r"\banthropic\b|\bclaude\b",
    "Fine-tuning": r"\bfine[\s-]?tun(?:e|ing)\b|\blora\b|\bpeft\b",
    "Prompt Engineering": r"\bprompt\s+engineering\b",
    "MLOps": r"\bmlops\b|\bmlflow\b|\bkubeflow\b|\bsagemaker\b|\bvertex\s+ai\b",
    "NLP": r"\bnlp\b|\bnatural\s+language\b",
    "FastAPI": r"\bfastapi\b",
    "REST APIs": r"\brest(?:ful)?\s+apis?\b",
    "CI/CD": r"\bci/?cd\b|\bgithub\s+actions\b|\bjenkins\b",
    "Git": r"\bgit\b(?!hub\s+actions)",
    "Linux": r"\blinux\b",
    "Data Modeling": r"\bdata\s+model(?:ing|ling)?\b|\bdimensional\s+model\b",
    "Streaming": r"\bstream(?:ing)?\s+(?:data|processing|pipelines?)\b|\bflink\b|\bkinesis\b",
    "Hadoop": r"\bhadoop\b|\bhive\b",
    "Tableau/BI": r"\btableau\b|\bpower\s?bi\b|\blooker\b",
}
_SKILL_RES = {name: re.compile(pat, re.I) for name, pat in SKILLS.items()}


def match_role(title: str) -> str | None:
    """Return the matching role key (e.g. 'data-engineer') or None."""
    for key, rx in _ROLE_RES.items():
        if rx.search(title):
            return key
    return None


def classify_experience(title: str, description: str) -> str | None:
    """Return experience tag, or None if the job is clearly too senior.

    entry      - explicitly junior/entry/fresher friendly
    junior     - asks for <= 1 year
    stretch    - asks for 2-3 years (worth applying as a fresher)
    unspecified- no clear requirement (kept; many entry-friendly posts don't say)
    """
    if EXCLUDE_TITLE.search(title):
        return None
    text = f"{title}\n{description}"
    if ENTRY_HINTS.search(text):
        return "entry"
    if TOO_SENIOR_EXP.search(description):
        return None
    if OK_EXP.search(description):
        return "junior"
    if STRETCH_EXP.search(description):
        return "stretch"
    return "unspecified"


def extract_skills(text: str) -> list[str]:
    return [name for name, rx in _SKILL_RES.items() if rx.search(text)]


def detect_work_mode(title: str, location: str, description: str,
                     hint: str | None = None) -> str:
    """Classify remote / hybrid / onsite. `hint` comes from source metadata
    (e.g. a board's own remote flag) and wins unless the text says hybrid."""
    text = f"{title} {location} {description[:2000]}"
    if HYBRID_RE.search(text):
        return "hybrid"
    if hint in ("remote", "onsite"):
        return hint
    if REMOTE_RE.search(f"{title} {location}"):
        return "remote"
    if ONSITE_RE.search(text):
        return "onsite"
    # a concrete city with no remote wording usually means an office role
    if location and location.lower() not in ("remote", "anywhere", "worldwide"):
        return "onsite"
    return "remote"


def fit_score(experience: str, skills: list[str], role: str) -> int:
    """0-100 rough relevance score for an entry-level candidate."""
    score = {"entry": 50, "junior": 40, "unspecified": 20, "stretch": 15}.get(experience, 0)
    score += min(len(skills) * 4, 40)
    if role:
        score += 10
    return min(score, 100)
