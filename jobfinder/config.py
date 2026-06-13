"""User-customizable search profile.

Everything that makes JobFinder specific to one person — which roles to look
for, how much experience, which cities count for office jobs, which country
must be able to apply, and how fresh postings must be — lives here.

Defaults reproduce the original profile (entry-level Data Engineer & AI/LLM/
GenAI roles, hiring in India, last 7 days). To customize, drop a `config.json`
next to the data directory (or set JOBFINDER_CONFIG to its path) overriding any
of these keys. Example config.json:

    {
      "roles": [
        {"key": "frontend", "label": "Frontend Engineer",
         "title_keywords": ["frontend engineer", "react developer"],
         "search_terms": ["frontend engineer", "react developer"]}
      ],
      "country": "Germany",
      "onsite_cities": ["Berlin", "Munich"],
      "max_experience_years": 5
    }
"""
import json
import logging
import os
from pathlib import Path

from .db import DATA_HOME

log = logging.getLogger("jobfinder.config")

DEFAULTS = {
    # Roles to search for. `title_keywords` decide whether a job title matches;
    # `search_terms` are fed to board search APIs (LinkedIn / JSearch / Muse).
    "roles": [
        {
            "key": "data-engineer",
            "label": "Data Engineer",
            "title_keywords": [
                "data engineer", "data platform engineer", "analytics engineer",
                "etl developer", "data pipeline",
            ],
            "search_terms": ["data engineer"],
        },
        {
            "key": "ai-engineer",
            "label": "AI / LLM / GenAI",
            "title_keywords": [
                "ai engineer", "artificial intelligence engineer", "llm",
                "generative ai", "gen ai", "genai", "machine learning engineer",
                "ml engineer", "mlops engineer", "prompt engineer",
                "ai/ml engineer", "nlp engineer",
            ],
            "search_terms": [
                "ai engineer OR llm OR generative ai",
                "machine learning engineer",
            ],
        },
    ],

    # Title words that mark a job as too senior / not an IC engineering role.
    "exclude_title_keywords": [
        "senior", "sr.", "sr", "staff", "principal", "lead", "head", "director",
        "manager", "vp", "chief", "architect", "iii", "iv", "consultant",
        "professor", "recruiter", "sales", "marketing", "account executive",
    ],

    # Experience handling (years). Jobs asking for more than max are dropped.
    "comfortable_years": 1,        # <= this -> "junior"
    "max_experience_years": 3,     # comfortable+1 .. this -> "stretch"; above -> drop

    # Office / hybrid jobs are only kept in these cities (remote can be global).
    "onsite_cities": ["Bangalore", "Bengaluru", "Hyderabad", "Pune"],

    # Candidate-eligibility filter for remote roles.
    "require_local_eligibility": True,
    "country": "India",
    # Terms meaning "open to your country" (location or description mentions).
    "home_terms": [
        "india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai",
        "delhi", "chennai", "apac", "asia",
    ],
    # Terms meaning "open to anyone, anywhere".
    "global_terms": ["worldwide", "anywhere", "global", "international", "100% remote"],
    # Location terms that exclude your country (job is dropped).
    "excluded_terms": [
        "usa", "us", "u.s.", "united states", "americas", "canada", "uk",
        "united kingdom", "europe", "european", "eu", "emea", "latam",
        "latin america", "south america", "australia", "new zealand", "germany",
        "france", "netherlands", "spain", "portugal", "poland", "nordics",
        "switzerland", "austria", "italy", "ireland", "belgium", "mexico",
        "brazil", "argentina", "colombia", "philippines", "africa",
        "middle east", "japan", "china", "singapore", "vietnam", "indonesia",
        "korea", "puerto rico", "costa rica", "sweden", "denmark", "norway",
        "finland", "czechia", "romania", "hungary", "greece", "ukraine",
        "turkey", "israel", "uae", "dubai", "saudi", "qatar", "egypt", "kenya",
        "nigeria",
    ],
    # Residency phrases that exclude your country (checked in description).
    "residency_exclude_terms": [
        "us", "usa", "u.s.", "united states", "europe", "eu", "uk", "canada",
        "australia",
    ],

    # Only show postings newer than this many days.
    "max_age_days": 7,
}


def _config_path() -> Path:
    env = os.environ.get("JOBFINDER_CONFIG")
    if env:
        return Path(env)
    return DATA_HOME / "config.json"


def load() -> dict:
    cfg = dict(DEFAULTS)
    path = _config_path()
    if path.exists():
        try:
            user = json.loads(path.read_text(encoding="utf-8"))
            cfg.update(user)
            log.info("loaded user config from %s (%d overrides)", path, len(user))
        except (json.JSONDecodeError, OSError) as e:
            log.warning("ignoring bad config %s: %s", path, e)
    return cfg


CONFIG = load()
