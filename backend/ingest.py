"""Explicit bounded download; API requests never silently trigger upstream fetches."""

import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx

from backend.analytics import normalise

BASE = 'https://data.elexon.co.uk/bmrs/api/v1/datasets'
DATA_PATH = Path(os.environ.get('WIND_DATA_PATH', 'data/january-2026.json'))


def fetch(client, dataset, params):
    for attempt in range(4):
        try:
            response = client.get(f'{BASE}/{dataset}/stream', params=params)
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list):
                raise ValueError(f'{dataset}: expected a JSON array')
            return rows
        except (httpx.TransportError, httpx.HTTPStatusError) as exc:
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def download():
    forecasts, actuals, requests = [], [], []
    with httpx.Client(timeout=60, headers={'Accept': 'application/json'}) as client:
        # Seven-day publication lookback supports early Jan 1 cutoffs. It is bounded,
        # not a guarantee that an arbitrarily old forecast will be discovered.
        day = date(2025, 12, 25)
        while day <= date(2026, 1, 31):
            params = {'publishDateTimeFrom': f'{day}T00:00:00Z',
                      'publishDateTimeTo': f'{day + timedelta(days=1)}T00:00:00Z'}
            rows = fetch(client, 'WINDFOR', params)
            forecasts.extend(rows)
            requests.append({'dataset': 'WINDFOR', 'params': params, 'rows': len(rows)})
            print(f'WINDFOR {day}: {len(rows)} rows', flush=True)
            day += timedelta(days=1)
        day = date(2026, 1, 2)
        while day <= date(2026, 2, 1):
            params = {'settlementDateFrom': str(day), 'settlementDateTo': str(day), 'fuelType': 'WIND'}
            rows = fetch(client, 'FUELHH', params)
            actuals.extend(rows)
            requests.append({'dataset': 'FUELHH', 'params': params, 'rows': len(rows)})
            print(f'FUELHH {day}: {len(rows)} rows', flush=True)
            day += timedelta(days=1)
    # Validate before replacing a usable snapshot; preserve original source rows.
    normalise(forecasts, forecast=True)
    normalise(actuals)
    if not forecasts or not actuals:
        raise ValueError('Empty dataset; existing snapshot has not been replaced')
    payload = {'metadata': {
        'retrieved_at': datetime.now(timezone.utc).isoformat(),
        'source': BASE, 'publication_lookback_start': '2025-12-25',
        'requests': requests,
    }, 'forecasts': forecasts, 'actuals': actuals}
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = DATA_PATH.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload), encoding='utf-8')
    temporary.replace(DATA_PATH)
    print(f'Saved {DATA_PATH}. Restart the API after refreshing the snapshot.')


if __name__ == '__main__':
    download()
