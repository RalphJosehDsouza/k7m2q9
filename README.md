# Windward

A decision-time wind forecast portal for a UK electricity procurement pilot. Windward shows what Elexon's forecast said at a chosen buying cutoff, compares forecast revisions, and evaluates the forecast against actual national wind generation.

- **App:** https://k7m2q9-liart.vercel.app/
- **Repository:** https://github.com/RalphJosehDsouza/k7m2q9
- **Video:** pending recording and unlisted YouTube upload; add the link before submission.

## What you can do

- Select a January 2026 decision date and a London-time cutoff to inspect next-day wind forecasts.
- Inspect publication timestamps and forecast age rather than assuming the latest forecast was available earlier.
- Replay two cutoffs against the same delivery timestamps and see forecast revisions.
- Enable clearly labelled retrospective actuals and an overforecast spotlight.
- Review daily and monthly MAE, RMSE, signed bias, and observation coverage.

This app evaluates published forecasts; it does not train a forecasting model. National wind alone cannot establish a utility's purchase requirement without customer demand and contracted supply.

## Run with Docker

Requires Docker Desktop running Linux containers, or Docker Engine with Compose.

```sh
docker compose up --build
```

Open http://localhost:8080. The committed historical snapshot is bundled in the image; no API key or ingestion step is required. `docker compose ps` reports the readiness health check. Stop with `docker compose down`.

## Local development on Windows CMD

Requires Python 3.11+ (deployment uses 3.12) and Node.js 22.12+.

```bat
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

In a second terminal:

```bat
cd frontend
npm ci
npm run dev
```

Open Vite's printed URL, normally http://localhost:5173. It proxies `/api` to port 8000. API documentation is at http://127.0.0.1:8000/docs.

To serve the production frontend through Python, run `npm run build --prefix frontend` from the repository root, then restart the backend and open http://127.0.0.1:8000. The backend mounts the built frontend after its API routes.

## Data and methodology

Only Elexon [WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream) and [FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to `fuelType=WIND`, are used.

1. Decision dates run from January 1 through January 31, 2026. Delivery is the following day, including February 1. All decision boundaries use `Europe/London`.
2. The default 09:00 cutoff is illustrative and configurable, not a verified exchange gate closure.
3. For each delivery timestamp, select the latest forecast with `publishTime <= cutoff`. Publication history is downloaded explicitly; using an endpoint's unfiltered latest forecast would introduce future information.
4. Forecast data contains hourly timestamps, while FUELHH is average MW over half-hour intervals. Score only exact shared timestamps. No interpolation, forward filling, or zero filling is performed. This is a sampled timestamp comparison, not a complete daily settlement error measure.
5. Error is `actual - forecast`. Negative error means wind was overforecast. MAE is mean absolute error; RMSE is the square root of mean squared error; bias is mean signed error. Monthly metrics weight matched observations equally, rather than averaging rounded daily scores.
6. Show both matched/all-half-hours coverage and matched/available-forecasts coverage. An hourly forecast can have 50% half-hour coverage while every available forecast matches an actual.
7. Use the latest actual revision in the snapshot. Actuals and January-wide scores are retrospective and must not be presented as knowledge available before each buying decision.

Forecast energy is not estimated from sparse points. The API returns actual energy only when all actual half-hours exist, multiplying average MW by 0.5 hours. Decision replay compares two forecasts, not forecast errors: revision is comparison minus baseline over shared timestamps only.

The seven-day publication lookback begins December 25, 2025. Missing older publications are not reconstructed. Conflicting values for identical source timestamps/publications are rejected; identical duplicates are collapsed. Missing matches produce null metrics, not a misleading zero.

### Refresh the snapshot

```bat
python -m backend.ingest
```

Run from the repository root with dependencies installed. Ingestion makes bounded daily requests, retries transient upstream failures, validates the responses, and replaces the snapshot only after successful completion. Retrieval time and request parameters are retained. Review the snapshot changes, commit, and redeploy; source revisions can change scores.

Normal app requests never download data. The snapshot is cached once per Python process and is read-only during serving. `WIND_DATA_PATH` optionally overrides its location. Restart the process after a refresh.

## Architecture and files

```text
Elexon WINDFOR + FUELHH
        | explicit ingestion
        v
versioned JSON snapshot -> Python selection + analytics -> FastAPI -> React
```

| Path | Purpose |
| --- | --- |
| `backend/ingest.py` | Elexon downloads, retry handling, validation, atomic snapshot replacement |
| `backend/analytics.py` | Timestamp normalization, cutoff selection, matching and metrics |
| `backend/main.py` | API routes, process-local snapshot cache, readiness and frontend serving |
| `backend/tests/test_analytics.py` | Synthetic tests of domain rules and edge cases |
| `backend/requirements.txt` | Development dependencies, including pytest |
| `requirements.txt` | Runtime Python dependencies |
| `frontend/src/main.jsx` | React views, request cancellation, charts, replay and tables |
| `frontend/src/styles.css`, `replay.css` | Responsive presentation and replay styling |
| `frontend/package-lock.json` | Locked frontend dependency tree for `npm ci` |
| `frontend/vite.config.js` | Local API proxy |
| `data/january-2026.json` | Public source snapshot and acquisition metadata |
| `app.py`, `vercel.json`, `.python-version` | Vercel FastAPI entrypoint and build settings |
| `Dockerfile`, `compose.yaml` | Multi-stage frontend build, non-root Python runtime and health check |
| `.gitignore`, `.dockerignore`, `.vercelignore` | Exclude local dependencies, installers, secrets and assignment PDF |
| `docs/` | Test checkpoints, deployment guide, video script and submission checklist |
| `PLAN.md` | Original scope and staged implementation plan |

## API

| Route | Purpose |
| --- | --- |
| `/api/health` | Process liveness and snapshot-file presence |
| `/api/ready` | Validates loaded datasets are nonempty |
| `/api/metadata` | Source, acquisition details and record counts |
| `/api/decision?date=2026-01-15&cutoff=09:00` | Next-day forecast, intervals, coverage and retrospective metrics |
| `/api/accuracy?cutoff=09:00` | January summaries with matched-observation-weighted metrics |

Invalid dates/cutoffs return 422 when data is available. Missing or invalid snapshots return 503. The frontend offers loading, error, retry, and unavailable-value states.

## Validation

```bat
python -m pytest backend\tests -q
npm run build --prefix frontend
```

There are 12 parametrized test cases covering cutoff inclusion, exclusion of later forecasts, missing observations, genuine zeros, month boundaries, duplicate conflicts, metric arithmetic, invalid timestamps/generation, and actual revisions.

The developer reported working backend/frontend interactions, a successful frontend build, a healthy Docker service, and incognito access to production. On November 14, 2026, an assistant browser smoke test confirmed deployed date selection, January-to-February delivery, identical-cutoff zero revisions, actuals, overforecast spotlight, monthly accuracy and daily-row navigation. Production readiness returned 22,192 forecast records and 1,488 actual records. Test commands are provided for independent reproduction; automated browser and API integration tests are not included. This smoke test does not establish exhaustive cross-browser or load-test coverage.

## Deployment

Configured for Vercel Hobby with the repository root as Root Directory and FastAPI as the preset. The build installs locked frontend packages and builds React; `app.py` exports the Python application. The snapshot is bundled with the deployment. No database or secret environment variables are needed.

Docker is the local/container deployment option; Vercel uses its Python runtime rather than running the Docker image. See [deployment instructions](docs/deployment-checkpoint.md). Hosted behavior and public access must be verified after deployment.

## Tradeoffs and next steps

This bounded pilot uses a JSON snapshot instead of a database, pure Python aggregation instead of a dataframe dependency, and SVG points instead of a chart library. That makes the source data and calculation path straightforward to inspect. Python runtime dependencies currently use bounded version ranges rather than a fully locked dependency tree.

Before operational adoption: agree on market-specific cutoffs, validate forecast interval semantics, introduce versioned scheduled ingestion and monitoring, add endpoint/browser tests, and evaluate uncertainty using only observations available before each decision. Utility-level procurement would additionally require demand and portfolio data, outside this assignment.

## AI assistance

OpenAI Codex assisted with requirements interpretation, source-documentation research, implementation, test-case authoring, troubleshooting, and documentation/demo preparation. The developer ran local checks, managed Git commits and publishing, and performed deployment setup. AI assistance is disclosed explicitly as requested by the assignment.
