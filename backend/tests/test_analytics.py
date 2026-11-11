import pytest

from backend.analytics import decision_view, metrics, month_view, normalise


def row(value, start='2026-01-02T00:00:00Z', publish='2026-01-01T08:00:00Z', fuel='WIND'):
    return {'startTime': start, 'publishTime': publish, 'generation': value, 'fuelType': fuel}


def test_cutoff_inclusive_and_no_future_leakage():
    forecasts = normalise([row(100), row(120, publish='2026-01-01T09:00:00Z'),
                           row(999, publish='2026-01-01T09:00:01Z')], True)
    result = decision_view(forecasts, normalise([row(110)]), '2026-01-01')
    assert result['intervals'][0]['forecast_mw'] == 120
    assert result['metrics']['bias_mw'] == -10
    assert result['metrics']['mae_mw'] == 10


def test_missing_forecasts_are_not_zero_or_interpolated():
    result = decision_view(normalise([row(100)], True), normalise([row(110), row(120, start='2026-01-02T00:30:00Z')]), '2026-01-01')
    assert result['intervals'][1]['forecast_mw'] is None
    assert result['metrics']['matched_intervals'] == 1
    assert result['matched_half_hour_coverage'] == 1/48
    assert result['matched_forecast_coverage'] == 1
    assert result['actual_energy_mwh'] is None


def test_zero_generation_is_valid():
    result = decision_view(normalise([row(0)], True), normalise([row(0)]), '2026-01-01')
    assert result['metrics']['mae_mw'] == 0


def test_no_matches_returns_null_metrics():
    result = decision_view([], [], '2026-01-01')
    assert result['metrics']['mae_mw'] is None
    assert result['metrics']['bias_mw'] is None
    assert result['matched_forecast_coverage'] is None


def test_january_31_targets_february_1():
    result = decision_view(normalise([row(100, start='2026-02-01T00:00:00Z', publish='2026-01-31T08:00:00Z')], True), [], '2026-01-31')
    assert result['delivery_date'] == '2026-02-01'
    assert result['forecast_intervals'] == 1
    assert result['expected_half_hours'] == 48


def test_duplicates_conflicts_and_non_wind():
    assert len(normalise([row(100), row(100), row(200, fuel='GAS')])) == 1
    with pytest.raises(ValueError, match='Conflicting'):
        normalise([row(100), row(101)], True)


def test_metric_math():
    result = metrics([-3, 4])
    assert result['mae_mw'] == 3.5
    assert result['bias_mw'] == 0.5
    assert result['rmse_mw'] == pytest.approx(12.5 ** 0.5)


def test_invalid_dates_and_timezone_rejected():
    with pytest.raises(ValueError, match='January'):
        decision_view([], [], '2026-02-01')
    with pytest.raises(ValueError, match='timezone'):
        normalise([row(100, start='2026-01-02T00:00:00')], True)


def test_latest_actual_revision_and_month_weighting():
    forecasts = normalise([row(100), row(200, start='2026-01-03T00:00:00Z')], True)
    actuals = normalise([row(50), row(110, publish='2026-01-03T00:00:00Z'),
                         row(180, start='2026-01-03T00:00:00Z')])
    result = month_view(forecasts, actuals)
    assert result['metrics']['matched_intervals'] == 2
    assert result['metrics']['mae_mw'] == 15
    assert result['metrics']['bias_mw'] == -5
    assert len(result['days']) == 31


@pytest.mark.parametrize('value', [-1, float('nan'), float('inf')])
def test_invalid_generation_rejected(value):
    with pytest.raises(ValueError, match='finite'):
        normalise([row(value)], True)
