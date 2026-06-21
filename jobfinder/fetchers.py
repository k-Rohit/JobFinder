"""Fetch jobs from public job-board APIs and RSS feeds, then normalize/filter.

Sources (all free, no API key, ToS-friendly):
  - RemoteOK        JSON API
  - We Work Remotely RSS feeds
  - Remotive        JSON API
  - Jobicy          JSON API
  - Arbeitnow       JSON API
  - Himalayas       JSON API

LinkedIn and Indeed have no public APIs and forbid scraping, so the dashboard
links to pre-filtered searches there instead.
"""
import html
import logging
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

from . import config, db, filters

log = logging.getLogger("jobfinder.fetch")

UA = {"User-Agent": "JobFinder/1.0 (personal job dashboard)"}
TIMEOUT = 30

# Profile-derived constants — (re)built by rebuild() at import and on save.
MAX_AGE_DAYS = 7
COUNTRY = ""
ONSITE_CITIES = []
SEARCH_TERMS = []
LI_QUERIES = []
JSEARCH_QUERIES = []

TAG_RE = re.compile(r"<[^>]+>")


def strip_html(text: str) -> str:
    return html.unescape(TAG_RE.sub(" ", text or "")).strip()


def _iso(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _get_json(url: str, **kw):
    r = requests.get(url, headers=UA, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    return r.json()


# ------------------------------------------------------------------ sources

def fetch_remoteok() -> list[dict]:
    data = _get_json("https://remoteok.com/api")
    out = []
    for item in data:
        if not isinstance(item, dict) or "id" not in item:
            continue  # first element is a legal notice
        out.append({
            "source": "RemoteOK",
            "source_id": str(item["id"]),
            "title": item.get("position") or item.get("title") or "",
            "company": item.get("company") or "",
            "url": item.get("url") or "",
            "location": item.get("location") or "Remote",
            "salary": _remoteok_salary(item),
            "description": strip_html(item.get("description") or "")
                           + " " + " ".join(item.get("tags") or []),
            "posted_at": (item.get("date") or "")[:19],
        })
    return out


def _remoteok_salary(item: dict) -> str:
    lo, hi = item.get("salary_min"), item.get("salary_max")
    if lo and hi:
        return f"${int(lo)//1000}k–${int(hi)//1000}k"
    return ""


WWR_FEEDS = [
    "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/remote-jobs.rss",
]


def fetch_weworkremotely() -> list[dict]:
    out, seen = [], set()
    for feed in WWR_FEEDS:
        try:
            r = requests.get(feed, headers=UA, timeout=TIMEOUT)
            r.raise_for_status()
            root = ET.fromstring(r.content)
        except Exception as e:
            log.warning("WWR feed %s failed: %s", feed, e)
            continue
        for item in root.iter("item"):
            link = (item.findtext("link") or "").strip()
            if not link or link in seen:
                continue
            seen.add(link)
            raw_title = item.findtext("title") or ""
            # WWR titles look like "Company: Job Title"
            company, _, title = raw_title.partition(":")
            if not title:
                title, company = raw_title, ""
            posted = ""
            pub = item.findtext("pubDate")
            if pub:
                try:
                    posted = _iso(parsedate_to_datetime(pub))
                except Exception:
                    pass
            region = item.findtext("region") or "Remote"
            out.append({
                "source": "WeWorkRemotely",
                "source_id": link.rstrip("/").rsplit("/", 1)[-1],
                "title": title.strip(),
                "company": company.strip(),
                "url": link,
                "location": region.strip(),
                "salary": "",
                "description": strip_html(item.findtext("description") or ""),
                "posted_at": posted,
            })
    return out


def fetch_remotive() -> list[dict]:
    out = []
    for search in ("data engineer", "ai engineer", "machine learning", "llm"):
        try:
            data = _get_json("https://remotive.com/api/remote-jobs",
                             params={"search": search, "limit": 100})
        except Exception as e:
            log.warning("Remotive search %r failed: %s", search, e)
            continue
        for item in data.get("jobs", []):
            out.append({
                "source": "Remotive",
                "source_id": str(item["id"]),
                "title": item.get("title") or "",
                "company": item.get("company_name") or "",
                "url": item.get("url") or "",
                "location": item.get("candidate_required_location") or "Remote",
                "salary": item.get("salary") or "",
                "description": strip_html(item.get("description") or "")[:6000],
                "posted_at": (item.get("publication_date") or "")[:19],
            })
    return out


def fetch_jobicy() -> list[dict]:
    out = []
    for industry in ("data-science", "engineering"):
        try:
            data = _get_json("https://jobicy.com/api/v2/remote-jobs",
                             params={"count": 100, "industry": industry})
        except Exception as e:
            log.warning("Jobicy %s failed: %s", industry, e)
            continue
        for item in data.get("jobs", []):
            out.append({
                "source": "Jobicy",
                "source_id": str(item["id"]),
                "title": item.get("jobTitle") or "",
                "company": item.get("companyName") or "",
                "url": item.get("url") or "",
                "location": item.get("jobGeo") or "Remote",
                "salary": _jobicy_salary(item),
                "description": strip_html(item.get("jobDescription") or "")[:6000],
                "posted_at": (item.get("pubDate") or "").replace(" ", "T")[:19],
            })
    return out


def _jobicy_salary(item: dict) -> str:
    lo, hi = item.get("annualSalaryMin"), item.get("annualSalaryMax")
    cur = item.get("salaryCurrency") or ""
    if lo and hi:
        return f"{cur} {int(lo)//1000}k–{int(hi)//1000}k".strip()
    return ""


def fetch_arbeitnow() -> list[dict]:
    out = []
    for page in (1, 2, 3):
        try:
            data = _get_json("https://www.arbeitnow.com/api/job-board-api",
                             params={"page": page})
        except Exception as e:
            log.warning("Arbeitnow page %s failed: %s", page, e)
            break
        for item in data.get("data", []):
            posted = ""
            if item.get("created_at"):
                posted = _iso(datetime.fromtimestamp(item["created_at"], tz=timezone.utc))
            out.append({
                "source": "Arbeitnow",
                "work_mode_hint": "remote" if item.get("remote") else None,
                "source_id": item.get("slug") or item.get("url", ""),
                "title": item.get("title") or "",
                "company": item.get("company_name") or "",
                "url": item.get("url") or "",
                "location": item.get("location") or ("Remote" if item.get("remote") else ""),
                "salary": "",
                "description": strip_html(item.get("description") or "")[:6000],
                "posted_at": posted,
            })
    return out


def fetch_himalayas() -> list[dict]:
    out = []
    for offset in range(0, 200, 20):
        try:
            data = _get_json("https://himalayas.app/jobs/api",
                             params={"limit": 20, "offset": offset})
        except Exception as e:
            log.warning("Himalayas offset %s failed: %s", offset, e)
            break
        items = data.get("jobs", [])
        if not items:
            break
        out.extend(_himalayas_items(items))
    return out


def _himalayas_items(items: list[dict]) -> list[dict]:
    out = []
    for item in items:
        posted = ""
        if item.get("pubDate"):
            posted = _iso(datetime.fromtimestamp(item["pubDate"], tz=timezone.utc))
        out.append({
            "source": "Himalayas",
            "source_id": item.get("guid") or item.get("applicationLink", ""),
            "title": item.get("title") or "",
            "company": item.get("companyName") or "",
            "url": item.get("applicationLink") or item.get("guid") or "",
            "location": ", ".join(item.get("locationRestrictions") or []) or "Remote",
            "salary": _himalayas_salary(item),
            "description": strip_html(item.get("description") or "")[:6000],
            "posted_at": posted,
        })
    return out


def _himalayas_salary(item: dict) -> str:
    lo, hi = item.get("minSalary"), item.get("maxSalary")
    cur = item.get("salaryCurrency") or "$"
    if lo and hi:
        return f"{cur}{int(lo)//1000}k–{cur}{int(hi)//1000}k"
    return ""


def fetch_themuse() -> list[dict]:
    out = []
    # two passes: global remote roles, then office roles in the user's cities
    city_locations = [f"{c}, {COUNTRY}" for c in ONSITE_CITIES]
    for location, pages, hint in (("Flexible / Remote", 15, "remote"),
                                  (city_locations, 15, None)):
        params_base = {"category": ["Data and Analytics", "Data Science",
                                    "Software Engineering"],
                       "level": ["Entry Level", "Mid Level"],
                       "location": location}
        for page in range(0, pages):
            try:
                data = _get_json("https://www.themuse.com/api/public/jobs",
                                 params={**params_base, "page": page})
            except Exception as e:
                log.warning("TheMuse page %s failed: %s", page, e)
                break
            items = data.get("results", [])
            if not items:
                break
            for item in items:
                locs = [l.get("name", "") for l in item.get("locations", [])]
                out.append({
                    "source": "TheMuse",
                    "work_mode_hint": hint,
                    "source_id": str(item["id"]),
                    "title": item.get("name") or "",
                    "company": (item.get("company") or {}).get("name", ""),
                    "url": (item.get("refs") or {}).get("landing_page", ""),
                    "location": ", ".join(locs) or "Remote",
                    "salary": "",
                    "description": strip_html(item.get("contents") or "")[:6000],
                    "posted_at": (item.get("publication_date") or "")[:19],
                })
    return out


def fetch_workingnomads() -> list[dict]:
    try:
        data = _get_json("https://www.workingnomads.com/api/exposed_jobs/")
    except Exception as e:
        log.warning("WorkingNomads failed: %s", e)
        return []
    out = []
    for item in data:
        out.append({
            "source": "WorkingNomads",
            "source_id": item.get("url", "").rstrip("/").rsplit("/", 1)[-1] or item.get("title", ""),
            "title": item.get("title") or "",
            "company": item.get("company_name") or "",
            "url": item.get("url") or "",
            "location": item.get("location") or "Remote",
            "salary": "",
            "description": strip_html(item.get("description") or "")[:6000]
                           + " " + (item.get("tags") or ""),
            "posted_at": (item.get("pub_date") or "")[:19],
        })
    return out


# HTML entities (&nbsp; etc.) are invalid in strict XML; map them to text first
_ENTITY_RE = re.compile(rb"&(?!amp;|lt;|gt;|quot;|apos;|#)(\w+);")


def _fix_entity(m: re.Match) -> bytes:
    text = html.unescape(f"&{m.group(1).decode('ascii', 'replace')};")
    if text.startswith("&"):  # unknown entity, drop it
        return b""
    return html.escape(text).encode("utf-8")


def _parse_rss_items(content: bytes):
    try:
        return ET.fromstring(_ENTITY_RE.sub(_fix_entity, content)).iter("item")
    except ET.ParseError as e:
        log.warning("RSS parse failed: %s", e)
        return []


def fetch_jobspresso() -> list[dict]:
    out = []
    for page in range(1, 6):
        try:
            r = requests.get("https://jobspresso.co/",
                             params={"feed": "job_feed", "paged": page},
                             headers=UA, timeout=TIMEOUT)
            r.raise_for_status()
        except Exception as e:
            log.warning("Jobspresso page %s failed: %s", page, e)
            break
        items = list(_parse_rss_items(r.content))
        if not items:
            break
        out.extend(_jobspresso_items(items))
    return out


def _jobspresso_items(items) -> list[dict]:
    out = []
    for item in items:
        link = (item.findtext("link") or "").strip()
        if not link:
            continue
        # dc:creator holds "Company<br>⚲ Location"
        creator = item.findtext("{http://purl.org/dc/elements/1.1/}creator") or ""
        company, _, location = strip_html(creator).partition("⚲")
        posted = ""
        pub = item.findtext("pubDate")
        if pub:
            try:
                posted = _iso(parsedate_to_datetime(pub))
            except Exception:
                pass
        out.append({
            "source": "Jobspresso",
            "source_id": link.rstrip("/").rsplit("/", 1)[-1],
            "title": (item.findtext("title") or "").strip(),
            "company": company.strip(),
            "url": link,
            "location": location.strip() or "Remote",
            "salary": "",
            "description": strip_html(item.findtext("description") or "")[:6000],
            "posted_at": posted,
        })
    return out


def fetch_nodesk() -> list[dict]:
    try:
        r = requests.get("https://nodesk.co/remote-jobs/index.xml",
                         headers=UA, timeout=TIMEOUT)
        r.raise_for_status()
    except Exception as e:
        log.warning("NoDesk failed: %s", e)
        return []
    out = []
    for item in _parse_rss_items(r.content):
        link = (item.findtext("link") or "").strip()
        raw_title = (item.findtext("title") or "").strip()
        if not link or not raw_title:
            continue
        # titles look like "Job Title at Company"
        title, _, company = raw_title.rpartition(" at ")
        if not title:
            title, company = raw_title, ""
        posted = ""
        pub = item.findtext("pubDate")
        if pub:
            try:
                posted = _iso(parsedate_to_datetime(pub))
            except Exception:
                pass
        out.append({
            "source": "NoDesk",
            "source_id": link.rstrip("/").rsplit("/", 1)[-1] or link,
            "title": title.strip(),
            "company": company.strip(),
            "url": link,
            "location": "Remote",
            "salary": "",
            "description": strip_html(item.findtext("description") or "")[:6000],
            "posted_at": posted,
        })
    return out


# ------------------------------------------------------------------ linkedin

BROWSER_UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/124.0 Safari/537.36"}
LI_SEARCH = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
LI_DETAIL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{}"

_LI_CARD_RE = re.compile(r'data-entity-urn="urn:li:jobPosting:(\d+)"')
_LI_URL_RE = re.compile(r'base-card__full-link[^>]*href="([^"]+)"')
_LI_TITLE_RE = re.compile(r'base-search-card__title">\s*(.*?)\s*</h3>', re.S)
_LI_COMPANY_RE = re.compile(r'base-search-card__subtitle">\s*(?:<a[^>]*>)?\s*(.*?)\s*(?:</a>)?\s*</h4>', re.S)
_LI_LOC_RE = re.compile(r'job-search-card__location">\s*(.*?)\s*</span>', re.S)
_LI_DATE_RE = re.compile(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"')
_LI_DESC_RE = re.compile(r'show-more-less-html__markup[^>]*>(.*?)</div>', re.S)

# (keywords, location, f_WT work-type: 1 onsite, 2 remote, 3 hybrid)
# Built per role: worldwide-remote + country-remote + country-office.
def _build_li_queries() -> list[tuple[str, str, str]]:
    q = []
    for role in config.CONFIG["roles"]:
        term = (role.get("search_terms") or [role["label"]])[0]
        q.append((term, "Worldwide", "2"))
        q.append((term, COUNTRY, "2"))
        q.append((term, COUNTRY, "1,3"))
    return q


LI_DETAIL_CAP = 30  # full-description fetches per refresh, keep volume polite


def fetch_linkedin() -> list[dict]:
    out, seen = [], set()
    for keywords, location, wt in LI_QUERIES:
        for start in (0, 10, 20):
            try:
                r = requests.get(LI_SEARCH, headers=BROWSER_UA, timeout=TIMEOUT,
                                 params={"keywords": keywords, "location": location,
                                         "f_WT": wt, "f_E": "1,2,3",
                                         "f_TPR": "r604800", "start": start})
                if r.status_code == 429:
                    log.warning("LinkedIn rate-limited; stopping early")
                    return _linkedin_details(out)
                r.raise_for_status()
            except Exception as e:
                log.warning("LinkedIn %r/%s failed: %s", keywords, start, e)
                break
            cards = _LI_CARD_RE.split(r.text)[1:]
            if not cards:
                break
            # split() alternates [id, card_html, id, card_html, ...]
            for job_id, card in zip(cards[::2], cards[1::2]):
                if job_id in seen:
                    continue
                seen.add(job_id)
                title = _search1(_LI_TITLE_RE, card)
                url = _search1(_LI_URL_RE, card).split("?")[0]
                if not title or not url:
                    continue
                out.append({
                    "source": "LinkedIn",
                    "work_mode_hint": {"2": "remote"}.get(wt),
                    "source_id": job_id,
                    "title": strip_html(title),
                    "company": strip_html(_search1(_LI_COMPANY_RE, card)),
                    "url": url,
                    "location": strip_html(_search1(_LI_LOC_RE, card)),
                    "salary": "",
                    "description": "",
                    "posted_at": _search1(_LI_DATE_RE, card),
                })
            time.sleep(1.2)
    return _linkedin_details(out)


def _search1(rx: re.Pattern, text: str) -> str:
    m = rx.search(text)
    return m.group(1) if m else ""


def _linkedin_details(items: list[dict]) -> list[dict]:
    """Fetch full descriptions, but only for role-matched jobs (capped)."""
    fetched = 0
    for item in items:
        if fetched >= LI_DETAIL_CAP or not filters.match_role(item["title"]):
            continue
        try:
            r = requests.get(LI_DETAIL.format(item["source_id"]),
                             headers=BROWSER_UA, timeout=TIMEOUT)
            r.raise_for_status()
            item["description"] = strip_html(_search1(_LI_DESC_RE, r.text))[:6000]
            fetched += 1
            time.sleep(1.0)
        except Exception as e:
            log.warning("LinkedIn detail %s failed: %s", item["source_id"], e)
    return items


# ------------------------------------------------- jsearch (indeed coverage)

def _jsearch_key() -> str | None:
    return os.environ.get("JSEARCH_API_KEY") or db.get_meta("jsearch_key")


# (query, suffix, remote_only) built from configured roles/country/cities
def _build_jsearch_queries() -> list[tuple[str, str, bool]]:
    q = []
    cities = " OR ".join(ONSITE_CITIES)
    for term in SEARCH_TERMS:
        q.append((f"entry level {term}", "remote jobs", True))
        q.append((f"{term} remote jobs in {COUNTRY}", "", True))
        if cities:
            q.append((f"{term} in {cities}, {COUNTRY}", "", False))
    return q


def rebuild(cfg: dict | None = None) -> None:
    """(Re)compute profile-derived fetch constants. Called at import and again
    whenever the user saves a new search profile."""
    cfg = cfg or config.CONFIG
    global MAX_AGE_DAYS, COUNTRY, ONSITE_CITIES, SEARCH_TERMS
    global LI_QUERIES, JSEARCH_QUERIES
    MAX_AGE_DAYS = int(cfg["max_age_days"])
    COUNTRY = cfg["country"]
    ONSITE_CITIES = cfg["onsite_cities"]
    SEARCH_TERMS = [t for r in cfg["roles"] for t in r.get("search_terms", [])]
    LI_QUERIES = _build_li_queries()
    JSEARCH_QUERIES = _build_jsearch_queries()


rebuild()


def fetch_jsearch() -> list[dict]:
    """Aggregates Indeed, Naukri, LinkedIn, Glassdoor & more via the JSearch
    API, which reads Google-for-Jobs (needs a free RapidAPI key in Settings).
    This is the ToS-compliant way to get Indeed/Naukri listings without
    scraping them directly. Skips silently when no key is set."""
    key = _jsearch_key()
    if not key:
        return []
    out = []
    headers = {"X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}
    for query, suffix, remote_only in JSEARCH_QUERIES:
        params = {"query": f"{query} {suffix}".strip(), "page": 1,
                  "num_pages": 2, "date_posted": "week"}
        if remote_only:
            params["remote_jobs_only"] = "true"
        try:
            r = requests.get("https://jsearch.p.rapidapi.com/search",
                             headers=headers, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            log.warning("JSearch %r failed: %s", query, e)
            continue
        for item in data.get("data", []):
            loc = ", ".join(filter(None, [item.get("job_city"),
                                          item.get("job_state"),
                                          item.get("job_country")]))
            out.append({
                "source": item.get("job_publisher") or "JSearch",
                "work_mode_hint": "remote" if item.get("job_is_remote") else None,
                "source_id": item.get("job_id") or item.get("job_apply_link", ""),
                "title": item.get("job_title") or "",
                "company": item.get("employer_name") or "",
                "url": item.get("job_apply_link") or "",
                "location": loc or ("Remote" if item.get("job_is_remote") else ""),
                "salary": _jsearch_salary(item),
                "description": (item.get("job_description") or "")[:6000],
                "posted_at": (item.get("job_posted_at_datetime_utc") or "")[:19],
            })
    return out


def _jsearch_salary(item: dict) -> str:
    lo, hi = item.get("job_min_salary"), item.get("job_max_salary")
    cur = item.get("job_salary_currency") or ""
    if lo and hi:
        return f"{cur} {int(lo):,}–{int(hi):,}".strip()
    return ""


# ------------------------------------------------- favourite companies

def _fetch_lever(token: str, company: str) -> list[dict]:
    """Fetch a company's postings from its public Lever board."""
    try:
        data = _get_json(f"https://api.lever.co/v0/postings/{token}?mode=json")
    except Exception as e:
        log.warning("Lever %s failed: %s", token, e)
        return []
    out = []
    for item in data:
        cats = item.get("categories") or {}
        posted = ""
        if item.get("createdAt"):
            posted = _iso(datetime.fromtimestamp(item["createdAt"] / 1000, tz=timezone.utc))
        out.append({
            "source": company,
            "favorite": True,
            "source_id": item.get("id") or item.get("hostedUrl", ""),
            "title": item.get("text") or "",
            "company": company,
            "url": item.get("hostedUrl") or item.get("applyUrl") or "",
            "location": cats.get("location") or "",
            "salary": "",
            "description": strip_html(item.get("descriptionPlain")
                                      or item.get("description") or "")[:6000],
            "posted_at": posted,
        })
    return out


# Role anchors that surface a company's DE/AI postings on LinkedIn. Each is
# combined with the company name ("data scientist Swiggy"), which reliably
# returns that employer's matching roles.
FAV_ANCHORS = ["data engineer", "data scientist", "machine learning engineer",
               "ai engineer"]


def fetch_favorite_companies() -> list[dict]:
    """DE/AI roles at the user's favourite companies: official ATS boards where
    they exist, plus company-targeted LinkedIn searches per role anchor."""
    out, seen = [], set()
    for fav in CONFIG.get("favorite_companies", []):
        name = fav["name"]
        if fav.get("lever"):
            out.extend(_fetch_lever(fav["lever"], name))
        if fav.get("greenhouse"):
            out.extend(_fetch_greenhouse(fav["greenhouse"], name))
        # "{anchor} {company}" surfaces the employer's roles; we keep only cards
        # whose company actually matches the favourite (off-company hits ignored).
        for anchor in FAV_ANCHORS:
            try:
                r = requests.get(LI_SEARCH, headers=BROWSER_UA, timeout=TIMEOUT,
                                 params={"keywords": f"{anchor} {name}",
                                         "location": COUNTRY, "start": 0})
                if r.status_code != 200:
                    break
                cards = _LI_CARD_RE.split(r.text)[1:]
                for job_id, card in zip(cards[::2], cards[1::2]):
                    if job_id in seen:
                        continue
                    title = strip_html(_search1(_LI_TITLE_RE, card))
                    url = _search1(_LI_URL_RE, card).split("?")[0]
                    company = strip_html(_search1(_LI_COMPANY_RE, card))
                    if not title or not url or not filters.match_favorite(company):
                        continue
                    seen.add(job_id)
                    out.append({
                        "source": "LinkedIn",
                        "favorite": True,
                        "source_id": job_id,
                        "title": title,
                        "company": company,
                        "url": url,
                        "location": strip_html(_search1(_LI_LOC_RE, card)),
                        "salary": "",
                        "description": "",
                        "posted_at": _search1(_LI_DATE_RE, card),
                    })
                time.sleep(0.8)
            except Exception as e:
                log.warning("LinkedIn favourite %s/%s failed: %s", name, anchor, e)
                continue
    return out


def _fetch_greenhouse(token: str, company: str) -> list[dict]:
    """Fetch a company's postings from its public Greenhouse board."""
    try:
        data = _get_json(
            f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true")
    except Exception as e:
        log.warning("Greenhouse %s failed: %s", token, e)
        return []
    out = []
    for item in data.get("jobs", []):
        out.append({
            "source": company,
            "favorite": True,
            "source_id": str(item.get("id") or item.get("absolute_url", "")),
            "title": item.get("title") or "",
            "company": company,
            "url": item.get("absolute_url") or "",
            "location": (item.get("location") or {}).get("name", ""),
            "salary": "",
            "description": strip_html(item.get("content") or "")[:6000],
            "posted_at": (item.get("updated_at") or "")[:19],
        })
    return out


FETCHERS = [
    fetch_remoteok,
    fetch_weworkremotely,
    fetch_remotive,
    fetch_jobicy,
    fetch_arbeitnow,
    fetch_himalayas,
    fetch_themuse,
    fetch_workingnomads,
    fetch_jobspresso,
    fetch_nodesk,
    fetch_linkedin,
    fetch_jsearch,
    fetch_favorite_companies,
]


# ------------------------------------------------------------- normalization

def normalize(raw: dict) -> dict | None:
    """Apply role/experience filters; return a DB-ready row or None."""
    title = raw["title"].strip()
    if not title or not raw["url"]:
        return None
    favorite = bool(raw.get("favorite") or filters.match_favorite(raw["company"]))
    # Freshness applies to the broad boards; favourite companies are tracked
    # regardless of how long the posting has been open.
    if raw["posted_at"] and not favorite:
        try:
            posted = datetime.fromisoformat(raw["posted_at"])
            if posted.tzinfo:
                posted = posted.astimezone(timezone.utc).replace(tzinfo=None)
            if (datetime.now(timezone.utc).replace(tzinfo=None) - posted).days > MAX_AGE_DAYS:
                return None
        except ValueError:
            pass
    # favourites use a broader role vocabulary (Data Scientist, SDE-Data, …)
    role = filters.match_favorite_role(title) if favorite else filters.match_role(title)
    if not role:
        return None
    experience = filters.classify_experience(title, raw["description"],
                                             allow_senior=favorite)
    if experience is None:
        return None
    text = f"{title}\n{raw['description']}"
    skills = filters.extract_skills(text)
    # remote-only boards don't set a hint; default them to remote
    hint = raw.get("work_mode_hint", "remote")
    work_mode = filters.detect_work_mode(title, raw["location"], raw["description"],
                                         hint=hint)
    # remote roles can be anywhere; office/hybrid only in the configured cities —
    # but favourite companies are kept wherever they are.
    if (work_mode != "remote" and not favorite
            and not filters.ONSITE_CITIES.search(raw["location"])):
        return None
    # every job must be open to candidates in the configured country
    # (favourites are exempt — you want them regardless of stated region)
    if work_mode == "remote" and not favorite:
        region = filters.hiring_region(raw["location"], raw["description"])
        if region == "other":
            return None
    else:
        region = "local"
    # normalize home->local so the value is country-agnostic for the UI
    if region == "home":
        region = "local"
    return {
        "id": f"{raw['source']}:{raw['source_id']}",
        "source": raw["source"],
        "title": title,
        "company": raw["company"].strip(),
        "url": raw["url"],
        "location": raw["location"].strip() or "Remote",
        "work_mode": work_mode,
        "region": region,
        "role": role,
        "experience": experience,
        "salary": raw["salary"],
        "skills": ",".join(skills),
        "description": raw["description"][:4000],
        "posted_at": raw["posted_at"],
        "fetched_at": _iso(datetime.now(timezone.utc)),
        "fit_score": filters.fit_score(experience, skills, role),
        "favorite": int(favorite),
    }


def fetch_all(progress=None) -> tuple[list[dict], dict]:
    """Run every fetcher; return (normalized jobs, per-source stats).
    `progress(name, done, total)` is called as each source starts."""
    jobs, stats = [], {}
    for idx, fn in enumerate(FETCHERS):
        name = fn.__name__.replace("fetch_", "")
        if progress:
            progress(name, idx, len(FETCHERS))
        try:
            raw_items = fn()
        except Exception as e:
            log.error("%s failed entirely: %s", name, e)
            stats[name] = {"fetched": 0, "matched": 0, "error": str(e)}
            continue
        matched = [n for r in raw_items if (n := normalize(r))]
        stats[name] = {"fetched": len(raw_items), "matched": len(matched)}
        jobs.extend(matched)
        log.info("%s: %d fetched, %d matched", name, len(raw_items), len(matched))
    # de-dupe across sources by (title, company) keeping highest fit score
    best: dict[tuple, dict] = {}
    for j in jobs:
        key = (j["title"].lower(), j["company"].lower())
        prev = best.get(key)
        if prev is None or j["fit_score"] > prev["fit_score"]:
            if prev:  # don't lose a favourite flag set on the discarded copy
                j["favorite"] = j["favorite"] or prev["favorite"]
            best[key] = j
        elif j["favorite"]:
            prev["favorite"] = 1
    return list(best.values()), stats
