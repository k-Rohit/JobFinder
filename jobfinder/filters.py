"""Role matching, seniority filtering, skill extraction, and fit scoring.

The profile-specific matchers are built from jobfinder.config so the whole
app can be retargeted to other roles / countries by editing config.json.
"""
import re

from . import config


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


# Config-independent matchers (never change with the search profile).
ENTRY_HINTS = re.compile(
    r"\b(entry[\s-]?level|junior|jr\.?|graduate|grad|fresher|early[\s-]?career|"
    r"associate|intern(ship)?|trainee|new\s+grad|campus|apprentice)\b",
    re.I,
)
OK_EXP = re.compile(
    r"\b(0|1|one|zero)\s*[-–to]*\s*[12]?\s*(?:years?|yrs?)\b|\bno\s+experience\b",
    re.I,
)
HYBRID_RE = re.compile(r"\bhybrid\b", re.I)

# "senior" markers vs "not an IC engineer" markers (see rebuild()).
_SENIOR_WORDS = {"senior", "sr", "sr.", "staff", "principal", "lead", "architect",
                 "iii", "iv", "ii"}


def rebuild(cfg: dict | None = None) -> None:
    """(Re)compute every profile-derived matcher from the active config.
    Called at import and again whenever the user saves a new search profile."""
    cfg = cfg or config.CONFIG
    global _ROLE_RES, ROLE_LABELS, SENIOR_TITLE, NON_IC_TITLE, EXCLUDE_TITLE
    global _COMFORT, _MAX_EXP, TOO_SENIOR_EXP, STRETCH_EXP
    global ONSITE_CITIES, INDIA_HUBS, _REQUIRE_LOCAL
    global HOME_REGION_RE, GLOBAL_REGION_RE, EXCLUDED_REGION_RE, RESIDENCY_RE
    global _FAV, _FAV_ALIASES, _FAV_ROLE_RES

    _ROLE_RES = {r["key"]: _kw_alt(r["title_keywords"]) for r in cfg["roles"]}
    ROLE_LABELS = {r["key"]: r["label"] for r in cfg["roles"]}

    excl = cfg["exclude_title_keywords"]
    SENIOR_TITLE = _kw_alt([w for w in excl if w.lower() in _SENIOR_WORDS] or ["senior"])
    NON_IC_TITLE = _kw_alt([w for w in excl if w.lower() not in _SENIOR_WORDS] or ["manager"])
    EXCLUDE_TITLE = _kw_alt(excl)  # senior + non-IC (used for non-favourites)

    _COMFORT = int(cfg["comfortable_years"])
    _MAX_EXP = int(cfg["max_experience_years"])
    TOO_SENIOR_EXP = _exp_re(_MAX_EXP + 1, 40)
    STRETCH_EXP = _exp_re(_COMFORT + 1, _MAX_EXP)

    ONSITE_CITIES = _kw_alt(cfg["onsite_cities"] or ["__no_city__"])
    INDIA_HUBS = ONSITE_CITIES  # backwards-compatible alias

    _REQUIRE_LOCAL = bool(cfg["require_local_eligibility"])
    HOME_REGION_RE = _kw_alt(cfg["home_terms"] or ["__none__"])
    GLOBAL_REGION_RE = _kw_alt(cfg["global_terms"] or ["__none__"])
    EXCLUDED_REGION_RE = _kw_alt(cfg["excluded_terms"] or ["__none__"])
    RESIDENCY_RE = re.compile(
        r"(?:located|based|residing|live|reside|eligible\s+to\s+work|"
        r"authorized\s+to\s+work)\s+in\s+(?:the\s+)?(?:"
        + "|".join(re.escape(t) for t in (cfg["residency_exclude_terms"] or ["__none__"]))
        + r")\b", re.I)

    _FAV = cfg.get("favorite_companies", [])
    _FAV_ALIASES = {a.lower(): c["name"] for c in _FAV for a in c.get("match", [])}
    _FAV_ROLE_RES = {key: _kw_alt(kws)
                     for key, kws in cfg.get("favorite_role_keywords", {}).items()}


# A location ending in a US state code ("San Francisco, CA") is location-bound.
US_STATE_RE = re.compile(
    r",\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|"
    r"MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|"
    r"WA|WV|WI|WY)\b")


def hiring_region(location: str, description: str = "") -> str:
    """'home'   - explicitly open to / located in your country
       'global' - worldwide / anywhere / plain remote (no place named)
       'other'  - tied to a foreign place that excludes your country (drop)"""
    if not _REQUIRE_LOCAL:
        return "global"
    loc = location or ""
    if HOME_REGION_RE.search(loc):
        return "home"
    if GLOBAL_REGION_RE.search(loc):
        return "global"
    if EXCLUDED_REGION_RE.search(loc) or US_STATE_RE.search(loc):
        return "other"
    text = (description or "")[:2000]
    if RESIDENCY_RE.search(text):
        return "other"
    if HOME_REGION_RE.search(text):
        return "home"
    # A location that names a specific (non-home, non-worldwide) place is
    # usually location-bound; only treat bare "remote"/empty as truly global.
    cleaned = re.sub(r"\b(remote|hybrid|on[\s-]?site|flexible|work from home|wfh)\b",
                     "", loc, flags=re.I)
    if re.search(r"[a-z]", cleaned, re.I):   # leftover place name -> foreign
        return "other"
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


# ------------------------------------------------- favourite companies
# _FAV, _FAV_ALIASES and _FAV_ROLE_RES are populated by rebuild().

def match_favorite(company: str) -> str | None:
    """Return the canonical favourite-company name if `company` is one, else None."""
    c = (company or "").lower()
    for alias, name in _FAV_ALIASES.items():
        if alias in c:
            return name
    return None


def match_favorite_role(title: str) -> str | None:
    """Role key using the broader favourite vocabulary, else None."""
    for key, rx in _FAV_ROLE_RES.items():
        if rx.search(title):
            return key
    return match_role(title)


def match_role(title: str) -> str | None:
    """Return the matching role key (e.g. 'data-engineer') or None."""
    for key, rx in _ROLE_RES.items():
        if rx.search(title):
            return key
    return None


def classify_experience(title: str, description: str,
                        allow_senior: bool = False) -> str | None:
    """Return experience tag, or None if the job should be dropped.

    entry      - explicitly junior/entry/fresher friendly
    junior     - asks for <= 1 year
    stretch    - asks for 2-3 years (worth applying as a fresher)
    senior     - clearly senior (only kept when allow_senior, e.g. favourites)
    unspecified- no clear requirement (kept; many entry-friendly posts don't say)

    Non-IC titles (manager/director/…) are always dropped. With allow_senior
    (favourite companies), senior IC roles are labelled "senior" instead of
    dropped, so the company tracker shows their whole DE/AI board.
    """
    if NON_IC_TITLE.search(title):
        return None
    senior = bool(SENIOR_TITLE.search(title) or TOO_SENIOR_EXP.search(description))
    if senior and not allow_senior:
        return None
    text = f"{title}\n{description}"
    if ENTRY_HINTS.search(text):
        return "entry"
    if senior:
        return "senior"
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
    score = {"entry": 50, "junior": 40, "unspecified": 20, "stretch": 15,
             "senior": 5}.get(experience, 0)
    score += min(len(skills) * 4, 40)
    if role:
        score += 10
    return min(score, 100)


rebuild()  # populate all profile-derived matchers from the active config
