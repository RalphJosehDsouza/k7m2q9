# Backend checkpoint: run from Windows CMD

These steps have not yet been executed by the assistant. The user owns test execution and commits.

## Set up and run automated checks

Python 3.11 or newer is required. If `py` reports that no Python is installed, install Python first, reopen CMD, and retry. The assistant's environment did not have a normal Python installation available through `py`.

```bat
cd /d C:\Users\ABCOM\Desktop\wellfound_assignment
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
python -m pytest backend\tests -q
```

Expected: **12 passed**. These tests use synthetic fixtures to check logic; they do not establish real-world accuracy or upstream availability.

## Download the assignment data

```bat
python -m backend.ingest
```

Expected: progress lines for WINDFOR publication dates from 25 December 2025 through 31 January 2026 and FUELHH delivery dates from 2 January through 1 February 2026. The command saves `data/january-2026.json` only after all requests and validation succeed. Allow a few minutes. It retries transient failures, but any final error should be shared before proceeding.

The seven-day publication lookback is explicitly bounded. Missing earlier forecasts are not invented. Data is downloaded separately from serving the application, so opening a page does not make upstream requests. Refreshes require an API restart.

## Inspect the API

```bat
python -m uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000/docs and try:

- `GET /api/health`: status `ok`, data file present `true` after ingestion.
- `GET /api/metadata`: acquisition timestamp, source URLs, row counts, and request provenance.
- `GET /api/decision`: date `2026-01-01`, cutoff `09:00`; delivery date must be `2026-01-02`. Every non-null publication must be at or before the cutoff.
- Repeat for `2026-01-31`; delivery date must be `2026-02-01`.
- `GET /api/accuracy`: 31 daily summaries and interval-weighted aggregate metrics.
- An out-of-scope decision date or cutoff `25:00` must return HTTP 422 after data is loaded.

Send the test summary, ingestion result, and the first decision response's metrics, forecast count, and warnings back to the assistant. Do not claim the stage is verified until these succeed.

## Methodology and source findings

Source documentation: https://data.elexon.co.uk/swagger/v1/swagger.json

- FUELHH describes generation as average MW over 30 minutes. Filter `fuelType=WIND`.
- WINDFOR accepts publication-time range filters; without them it returns the latest forecast, which is unsuitable for this backtest.
- A real 1 January 2026 WINDFOR publication sample contained hourly target timestamps. The API keeps a 48-half-hour delivery grid, leaves missing forecasts null, and scores only exact shared timestamps. It does not infer intermediate forecasts. This is a sampled timestamp comparison against half-hour actuals, not a full-day settlement error measure.
- Two coverage denominators are exposed: matched observations / all delivery half-hours and matched observations / available forecast timestamps. Hourly data can therefore show 50% half-hour coverage and 100% forecast coverage simultaneously.
- Actual energy is computed only when all 48 actual half-hours exist. Forecast energy is deliberately unavailable until the forecast interval interpretation is established; sparse points must not be presented as a full-day energy total.
- Actual revisions use the latest publication in the downloaded snapshot and are explicitly retrospective.
- Error = actual minus forecast. Negative bias means overforecast wind, potentially increasing additional procurement need; national wind alone does not determine a utility's purchase volume.
- The 09:00 Europe/London default is an illustrative configurable cutoff, not a verified exchange gate closure.
- January-wide scores are retrospective. They must not be described as risk information known at an earlier January decision.

## Commit after checks pass

```bat
git add .gitignore backend docs
git commit -m "feat: add Elexon ingestion and forecast accuracy analysis"
```

Downloaded data and virtual environments are ignored. No commits are made by the assistant.
