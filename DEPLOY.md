# Deploying JobFinder

JobFinder is two pieces:

- **Frontend** — a Next.js app in [`frontend/`](frontend/) → deploy to **Vercel**.
- **Backend** — the FastAPI app in [`jobfinder/`](jobfinder/) → deploy to a
  persistent host (**Railway** / Render / Fly). It can't run on Vercel because it
  uses a SQLite database, a background daily-refresh scheduler, and multi-minute
  fetch jobs — none of which fit serverless.

Deploy the **backend first** so you have its URL for the frontend.

---

## 1 · Backend → Railway

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**,
   pick this repo. Railway detects the `Dockerfile` (and `railway.json`) and builds it.
3. **Add a Volume** and mount it at **`/data`** (Settings → Volumes). This is where
   `jobs.db` and your uploaded résumé live — without it, data resets on redeploy.
   The image already sets `JOBFINDER_DATA_DIR=/data`.
4. **Variables** (Settings → Variables):
   - `CORS_ORIGINS` = your Vercel URL, e.g. `https://jobfinder.vercel.app`
     (comma-separate multiple; omit to allow all origins).
   - *(optional)* `OPENAI_API_KEY`, `OPENAI_MODEL`, `JSEARCH_API_KEY` — or set them
     later from the app's Settings drawer.
5. Deploy. Railway gives you a public URL like
   `https://jobfinder-production.up.railway.app`. Confirm `…/api/status` responds.

> Render/Fly work the same way via the `Dockerfile` (or the `Procfile` on Render's
> native Python builder). Any host that gives you a persistent disk + a long-running
> process is fine.

---

## 2 · Frontend → Vercel

1. On [vercel.com](https://vercel.com): **Add New → Project**, import this repo.
2. Set **Root Directory** to **`frontend`** (Vercel then auto-detects Next.js).
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_BASE` = your backend URL from step 1
     (e.g. `https://jobfinder-production.up.railway.app`, no trailing slash).
4. Deploy. Open the Vercel URL — the dashboard loads and talks to your backend.

If you change `NEXT_PUBLIC_API_BASE` later, redeploy the frontend (it's baked in at
build time).

---

## Local development

```sh
# terminal 1 — backend
./run.sh                       # http://localhost:8787

# terminal 2 — frontend
cd frontend
cp .env.example .env.local     # already points at localhost:8787
npm install
npm run dev                    # http://localhost:3000
```

The old single-file dashboard is still served by the backend at
`http://localhost:8787/` if you ever want it.
