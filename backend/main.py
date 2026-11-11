import json
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query

from backend.analytics import decision_view, month_view, normalise
from backend.ingest import DATA_PATH

app = FastAPI(title='Wind Decision API', version='0.1.0')


@lru_cache(maxsize=1)
def snapshot():
    if not DATA_PATH.exists():
        raise HTTPException(503, 'Data not loaded. Run python -m backend.ingest, then restart the API.')
    try:
        raw = json.loads(DATA_PATH.read_text(encoding='utf-8'))
        return normalise(raw['forecasts'], True), normalise(raw['actuals']), raw['metadata']
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(503, 'Invalid data snapshot. Refresh the data and restart the API.') from exc


@app.get('/api/health')
def health():
    return {'status': 'ok', 'data_file_present': DATA_PATH.exists()}


@app.get('/api/metadata')
def metadata():
    forecasts, actuals, meta = snapshot()
    return {**meta, 'unique_forecasts': len(forecasts), 'unique_actuals': len(actuals),
            'method': 'Latest publication at or before cutoff, per exact delivery timestamp.',
            'error_sign': 'actual minus forecast; negative means overforecast',
            'scope': 'National wind only. Utility demand and contracted supply are not included.'}


@app.get('/api/decision')
def decision(date: str = '2026-01-15', cutoff: str = Query('09:00', pattern=r'^([01]\d|2[0-3]):[0-5]\d$')):
    forecasts, actuals, _ = snapshot()
    try:
        return decision_view(forecasts, actuals, date, cutoff)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get('/api/accuracy')
def accuracy(cutoff: str = Query('09:00', pattern=r'^([01]\d|2[0-3]):[0-5]\d$')):
    forecasts, actuals, _ = snapshot()
    return month_view(forecasts, actuals, cutoff)
