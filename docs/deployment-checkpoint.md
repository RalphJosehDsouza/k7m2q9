# Docker and Vercel checkpoint

Target: one Vercel Hobby project with a React build and the Python FastAPI application. Docker separately runs the identical application locally. Vercel does not run this Docker image.

The user runs checks, commits, and deployment. Nothing is deployed merely by adding these files.

## 1. Check the combined application locally

From the project root in CMD, with the Python virtual environment activated:

```bat
python -m pip install -r backend\requirements.txt
python -m pytest backend\tests -q
npm run build --prefix frontend
python -m uvicorn backend.main:app --port 8080
```

Stop any existing process on port 8080 first. Open http://127.0.0.1:8080: the full dashboard must now work without Vite running. Check http://127.0.0.1:8080/api/ready returns `ready`, and try decision replay and the monthly accuracy view. Stop this process with Ctrl+C before the Docker check.

## 2. Check Docker

Install/start Docker Desktop with Linux containers if needed. From the project root:

```bat
docker compose up --build
```

Open http://localhost:8080 and repeat the key dashboard checks. From another CMD window:

```bat
docker compose ps
```

Expected: the web service becomes healthy. React is compiled in the first build stage; the final image contains Python, the built frontend, and the approximately 3 MB public historical snapshot. No database, API key, or paid service is required by the app.

To stop:

```bat
docker compose down
```

Report errors before committing. Docker and deployment checks have not been executed by the assistant.

## 3. Commit after local checks pass

The snapshot is now deliberately tracked; other downloaded JSON files remain ignored.

```bat
git add .gitignore .dockerignore .vercelignore .python-version Dockerfile compose.yaml vercel.json app.py requirements.txt backend/requirements.txt backend/main.py backend/ingest.py data/january-2026.json data/README.md docs/deployment-checkpoint.md
git commit -m "build: add Docker and Vercel deployment configuration"
```

## 4. Publish repository and deploy

Create a public GitHub repository with an anonymous name as required by the assignment. Do not initialise it with another README. Use GitHub's displayed commands to connect and push this existing repository. Keep the assignment PDF out of the repository.

In Vercel, use a personal Hobby account and import that repository:

- Root Directory: repository root, not `frontend`.
- Framework Preset: FastAPI.
- Build Command: use the configured `npm ci --prefix frontend && npm run build --prefix frontend`.
- Node.js: 22.x or newer supported LTS.
- Python: `.python-version` selects 3.12.
- Output Directory: leave at the framework default; do not override it to `frontend/dist`.
- No environment variables are required.

The root `app.py` exports the backend. The built `frontend/dist` is mounted after API routes. Vercel supports FastAPI static mounts and can serve their files from its CDN. The data snapshot is bundled with Python and read without network requests; ingestion never runs during a request or startup.

If Vercel proposes a paid upgrade, stop and share the message rather than accepting it. Hobby limits still apply; this configuration does not promise unlimited usage.

## 5. Verify the real deployment

- Open the production URL in an incognito window. It must be accessible without Vercel login.
- Open `/api/ready`: expect `ready` and nonzero counts.
- Open `/api/decision?date=2026-01-31&cutoff=09:00`: delivery must be February 1.
- Try the monthly accuracy page and decision replay, including after a cold start.
- Compare the retrieval timestamp and key scores with local results.
- If the page is blank, check build logs and browser errors. If API calls fail, share their status and Vercel function logs. Do not share credentials.

Send the production URL back to the assistant so it can be included in the final README and video script. Deployment is not verified until these checks pass.

## References

- https://vercel.com/docs/frameworks/backend/fastapi
- https://vercel.com/docs/functions/runtimes/python
- https://vercel.com/docs/plans/hobby

The plan is intended for this personal assignment demo; commercial use and usage eligibility are governed by Vercel's current plan terms.
