"""Pure decision-time selection and retrospective, exact-timestamp scoring."""

from datetime import date, datetime, time, timedelta, timezone
from math import isfinite, sqrt
from zoneinfo import ZoneInfo

LONDON = ZoneInfo('Europe/London')


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Source timestamps must include a timezone')
    return parsed.astimezone(timezone.utc)


def normalise(rows, forecast=False):
    """Deduplicate identical records; reject ambiguous same-version conflicts."""
    result = {}
    for row in rows:
        if not forecast and row.get('fuelType') != 'WIND':
            continue
        start = timestamp(row['startTime'])
        published = timestamp(row['publishTime'])
        value = float(row['generation'])
        if not isfinite(value) or value < 0:
            raise ValueError('Generation must be finite and non-negative')
        if start.minute not in (0, 30) or start.second or start.microsecond:
            raise ValueError('Unexpected source interval alignment')
        key = (start, published)
        if key in result and result[key]['generation'] != value:
            raise ValueError('Conflicting values for the same timestamp and publication')
        result[key] = {'start': start, 'published': published, 'generation': value}
    return list(result.values())


def metrics(errors):
    n = len(errors)
    return {
        'matched_intervals': n,
        'mae_mw': sum(abs(x) for x in errors) / n if n else None,
        'rmse_mw': sqrt(sum(x*x for x in errors) / n) if n else None,
        'bias_mw': sum(errors) / n if n else None,
    }


def decision_view(forecasts, actuals, decision_date, cutoff='09:00'):
    day = date.fromisoformat(decision_date)
    if day.year != 2026 or day.month != 1:
        raise ValueError('Decision date must be in January 2026')
    clock = time.fromisoformat(cutoff)
    if clock.tzinfo or clock.second or clock.microsecond:
        raise ValueError('Cutoff must be a local HH:MM time')
    as_of = datetime.combine(day, clock, LONDON)
    start = datetime.combine(day + timedelta(days=1), time.min, LONDON)
    end = start + timedelta(days=1)
    selected, observed = {}, {}
    for records, target, limit in ((forecasts, selected, as_of), (actuals, observed, None)):
        for record in records:
            t = record['start']
            if start <= t < end and (limit is None or record['published'] <= limit):
                if t not in target or record['published'] > target[t]['published']:
                    target[t] = record
    intervals, errors = [], []
    t = start
    while t < end:
        f, a = selected.get(t), observed.get(t)
        error = a['generation'] - f['generation'] if f and a else None
        if error is not None:
            errors.append(error)
        intervals.append({
            'start_time': t.isoformat(),
            'forecast_mw': f['generation'] if f else None,
            'actual_mw': a['generation'] if a else None,
            'error_mw': error,
            'publish_time': f['published'].isoformat() if f else None,
            'forecast_age_hours': (as_of - f['published']).total_seconds()/3600 if f else None,
        })
        t += timedelta(minutes=30)
    n = len(intervals)
    warnings = ['Actuals and accuracy are retrospective, not information available at the decision cutoff.']
    if len(selected) < n:
        warnings.append('Forecasts do not cover all half-hours. Exact timestamps only; no interpolation or energy estimate.')
    if len(errors) < len(selected):
        warnings.append('Some forecast timestamps have no matching actual.')
    if not errors:
        warnings.append('No matched observations; accuracy metrics are unavailable.')
    return {
        'decision_date': day.isoformat(), 'delivery_date': start.date().isoformat(),
        'cutoff': cutoff, 'as_of': as_of.isoformat(), 'timezone': 'Europe/London',
        'expected_half_hours': n, 'forecast_intervals': len(selected),
        'actual_intervals': len(observed),
        'matched_half_hour_coverage': len(errors)/n,
        'matched_forecast_coverage': len(errors)/len(selected) if selected else None,
        'actual_energy_mwh': sum(a['generation'] * 0.5 for a in observed.values()) if len(observed) == n else None,
        'metrics': metrics(errors), 'intervals': intervals, 'warnings': warnings,
    }


def month_view(forecasts, actuals, cutoff='09:00'):
    days = [decision_view(forecasts, actuals, f'2026-01-{d:02}', cutoff) for d in range(1, 32)]
    errors = [r['error_mw'] for day in days for r in day['intervals'] if r['error_mw'] is not None]
    return {
        'cutoff': cutoff, 'metrics': metrics(errors),
        'expected_half_hours': sum(d['expected_half_hours'] for d in days),
        'forecast_intervals': sum(d['forecast_intervals'] for d in days),
        'days': [{k: v for k, v in d.items() if k != 'intervals'} for d in days],
        'interpretation': 'Retrospective January evaluation; not an uncertainty estimate available before each decision.',
    }
