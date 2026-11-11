import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './replay.css';

const number = (value, digits = 0) => value == null ? 'Unavailable' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
const percent = value => value == null ? 'Unavailable' : `${number(value * 100, 1)}%`;
const dayLabel = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
const clock = value => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const stamp = value => new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' });

function useResource(url) {
  const [state, setState] = useState({ url: '', data: null, error: '', loading: true });
  const [revision, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ url, data: null, error: '', loading: true });
    fetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status}). Check the API is running.`);
      }
      return response.json();
    }).then(data => { if (!controller.signal.aborted) setState({ url, data, error: '', loading: false }); })
      .catch(error => { if (!controller.signal.aborted) setState({ url, data: null, error: error.message, loading: false }); });
    return () => controller.abort();
  }, [url, revision]);
  return { ...(state.url === url ? state : { data: null, error: '', loading: true }), retry: () => retry(n => n + 1) };
}

function Status({ resource }) {
  if (resource.loading) return <div className="status" role="status"><span className="spinner" /> Loading Elexon snapshot…</div>;
  if (resource.error) return <div className="status error" role="alert"><h3>We couldn’t load this view</h3><p>{resource.error}</p><button onClick={resource.retry}>Try again</button></div>;
  return null;
}

function Metric({ label, value, unit, note }) {
  return <article className="metric"><p>{label}</p><div className="metric-value">{value}<small>{value !== 'Unavailable' && unit}</small></div><span>{note}</span></article>;
}

function Chart({ intervals, actuals }) {
  const values = intervals.flatMap(r => [r.forecast_mw, ...(actuals ? [r.actual_mw] : [])]).filter(v => v != null);
  if (!values.length) return <p className="status">No generation observations available for this selection.</p>;
  const maximum = Math.max(1000, Math.ceil(Math.max(...values) / 2000) * 2000);
  const x = i => 64 + i / Math.max(1, intervals.length - 1) * 866;
  const y = v => 260 - v / maximum * 220;
  return <div className="chart-wrap"><svg viewBox="0 0 960 320" role="img" aria-label="Wind generation in MW by London delivery time. Forecast observations are dots; optional retrospective actuals are squares. Exact values are in the interval table.">
    {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="64" x2="930" y1={y(maximum*i/4)} y2={y(maximum*i/4)} stroke="#e2e8e5" /><text x="53" y={y(maximum*i/4)+4} textAnchor="end">{number(maximum*i/4)}</text></g>)}
    <text x="64" y="20">MW</text>
    {intervals.map((r, i) => <g key={r.start_time}>
      {actuals && r.actual_mw != null && <rect x={x(i)-3} y={y(r.actual_mw)-3} width="6" height="6" fill="#d58741"><title>{clock(r.start_time)} actual: {number(r.actual_mw)} MW</title></rect>}
      {r.forecast_mw != null && <circle cx={x(i)} cy={y(r.forecast_mw)} r="4.5" fill="#16796b"><title>{clock(r.start_time)} forecast: {number(r.forecast_mw)} MW</title></circle>}
      {(i % 8 === 0 || i === intervals.length-1) && <text x={x(i)} y="286" textAnchor="middle">{clock(r.start_time)}</text>}
    </g>)}
    <text x="497" y="313" textAnchor="middle">Delivery time · Europe/London</text>
  </svg></div>;
}

function IntervalTable({ intervals, actuals }) {
  return <details className="panel"><summary>Inspect all delivery intervals and publication times</summary><div className="table-scroll"><table><caption>Exact source timestamps. A dash means unavailable, not zero.</caption><thead><tr><th>London time</th><th>Forecast MW</th><th>Published (London)</th>{actuals && <><th>Actual MW</th><th>Error MW</th></>}</tr></thead><tbody>{intervals.map(r => <tr key={r.start_time}><td>{clock(r.start_time)}</td><td>{r.forecast_mw == null ? '—' : number(r.forecast_mw)}</td><td>{r.publish_time ? stamp(r.publish_time) : '—'}</td>{actuals && <><td>{r.actual_mw == null ? '—' : number(r.actual_mw)}</td><td>{r.error_mw == null ? '—' : number(r.error_mw)}</td></>}</tr>)}</tbody></table></div></details>;
}

function Replay({ baseline }) {
  const [cutoff, setCutoff] = useState('12:00');
  const [draft, setDraft] = useState(cutoff);
  const resource = useResource(`/api/decision?date=${baseline.decision_date}&cutoff=${cutoff}`);
  const comparison = resource.data;
  const byTime = new Map(comparison?.intervals.map(r => [r.start_time, r]) || []);
  const pairs = baseline.intervals.filter(r => r.forecast_mw != null && byTime.get(r.start_time)?.forecast_mw != null)
    .map(r => ({ ...r, other: byTime.get(r.start_time), change: byTime.get(r.start_time).forecast_mw - r.forecast_mw }));
  const changed = pairs.filter(r => r.change !== 0);
  const largest = changed.reduce((best, r) => !best || Math.abs(r.change) > Math.abs(best.change) ? r : best, null);
  const updated = pairs.filter(r => r.publish_time !== r.other.publish_time).length;
  return <section className="panel replay"><p className="eyebrow">DECISION REPLAY</p><h3>What changed between decisions?</h3><p className="replay-description">Compare the same delivery timestamps at two cutoffs. Later information is shown for review, not as knowledge available at the earlier cutoff.</p>
    <form className="controls" onSubmit={e => { e.preventDefault(); setCutoff(draft); }}><span className="badge">Baseline: {baseline.cutoff}</span><label>Compare with (London)<input type="time" required step="60" value={draft} onChange={e => setDraft(e.target.value)} /></label><button className="primary" type="submit">Replay forecast ↗</button></form>
    <Status resource={resource} />
    {comparison && <><div className="replay-story" aria-live="polite"><strong>{baseline.cutoff} → {comparison.cutoff}</strong><h3>{!pairs.length ? 'No shared forecasts to compare.' : changed.length ? `${changed.length} of ${pairs.length} shared forecasts changed.` : 'No change in shared forecast values.'}</h3><p>{pairs.length ? `${updated} shared observations have a different publication. ${baseline.forecast_intervals} baseline and ${comparison.forecast_intervals} comparison observations are available.` : 'Choose another cutoff or day; missing observations are never treated as zero.'}</p></div>
      <div className="metrics"><Metric label="Mean forecast revision" value={pairs.length ? number(pairs.reduce((total, r) => total + r.change, 0)/pairs.length, 1) : 'Unavailable'} unit="MW" note="Comparison minus baseline, shared timestamps only" /><Metric label="Largest absolute revision" value={pairs.length ? number(largest ? Math.abs(largest.change) : 0) : 'Unavailable'} unit="MW" note={largest ? `${clock(largest.start_time)} delivery · ${largest.change > 0 ? 'higher' : 'lower'} forecast` : 'No changed shared observations'} /><Metric label="Shared forecast observations" value={number(pairs.length)} note={`${baseline.expected_half_hours} half-hours in the delivery day`} /></div>
      <details><summary>Inspect forecast revisions</summary><div className="table-scroll"><table><caption>Shared timestamps only. Revision = comparison − baseline, in MW.</caption><thead><tr><th>Delivery time</th><th>At {baseline.cutoff}</th><th>At {comparison.cutoff}</th><th>Revision</th><th>Comparison publication</th></tr></thead><tbody>{pairs.map(r => <tr key={r.start_time}><td>{clock(r.start_time)}</td><td>{number(r.forecast_mw)}</td><td>{number(r.other.forecast_mw)}</td><td>{number(r.change)}</td><td>{stamp(r.other.publish_time)}</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}

function Overforecast({ intervals }) {
  const matched = intervals.filter(r => r.error_mw != null);
  const over = matched.filter(r => r.error_mw < 0);
  const worst = over.reduce((best, r) => !best || r.error_mw < best.error_mw ? r : best, null);
  return <section className="panel spotlight"><p className="eyebrow">OVERFORECAST SPOTLIGHT · RETROSPECTIVE</p><h3>When less wind arrived than expected</h3><p>{matched.length ? `${over.length} of ${matched.length} matched observations had actual wind below forecast.` : 'No matched observations are available.'}</p>{worst && <p><strong>Largest observed gap: {number(-worst.error_mw)} MW at {clock(worst.start_time)}.</strong> Forecast: {number(worst.forecast_mw)} MW; actual: {number(worst.actual_mw)} MW.</p>}<p className="chart-note">This direction of error can increase additional supply needs. It is not a utility-specific purchase recommendation or a prediction of future error.</p></section>;
}

function Decision({ data }) {
  const [actuals, setActuals] = useState(false);
  const ages = data.intervals.map(r => r.forecast_age_hours).filter(v => v != null);
  return <>
    <div className="section-heading"><div><p className="eyebrow">NEXT-DAY DELIVERY</p><h2>{dayLabel(data.delivery_date)}</h2></div><span className="badge">As of {data.cutoff} · {dayLabel(data.decision_date)}</span></div>
    <div className="metrics">
      <Metric label="Available forecast observations" value={number(data.forecast_intervals)} unit={`/ ${data.expected_half_hours}`} note="Exact timestamps on the half-hour grid" />
      <Metric label="Newest selected forecast age" value={ages.length ? number(Math.min(...ages), 1) : 'Unavailable'} unit="hours" note="Age at your decision cutoff" />
      <Metric label="Oldest selected forecast age" value={ages.length ? number(Math.max(...ages), 1) : 'Unavailable'} unit="hours" note="Shows variation across selected publications" />
    </div>
    <section className="panel"><div className="chart-heading"><div><h3>Wind available to the market</h3><p>National generation forecast · MW</p></div><label className="toggle"><input type="checkbox" checked={actuals} onChange={e => setActuals(e.target.checked)} /> Show retrospective actuals</label></div>
      <div className="legend"><span><i className="dot" /> Decision-time forecast</span>{actuals && <span><i className="square" /> Actual generation · retrospective</span>}</div>
      <Chart intervals={data.intervals} actuals={actuals} />
      <p className="chart-note">Individual observations only. Missing half-hours are not interpolated; forecast energy is not estimated.</p>
    </section>
    {actuals && <><div className="notice">Retrospective evaluation: these actuals and errors were not available at the decision cutoff.</div><div className="metrics"><Metric label="Mean absolute error" value={number(data.metrics.mae_mw)} unit="MW" note={`${data.metrics.matched_intervals} matched observations`} /><Metric label="Signed bias" value={number(data.metrics.bias_mw)} unit="MW" note="Actual − forecast; negative means overforecast" /><Metric label="Forecast observations matched" value={percent(data.matched_forecast_coverage)} note={`${percent(data.matched_half_hour_coverage)} of all delivery half-hours`} /></div></>}
    <div className="notice"><strong>Data context</strong><ul>{data.warnings.filter(w => actuals || !w.startsWith('Actuals and accuracy')).map(w => <li key={w}>{w}</li>)}</ul><p>This is national wind generation, not your utility’s purchase requirement. Demand and contracted supply are outside this pilot.</p></div>
    {actuals && <Overforecast intervals={data.intervals} />}
    <Replay baseline={data} />
    <IntervalTable intervals={data.intervals} actuals={actuals} />
  </>;
}

function Accuracy({ data, onSelect }) {
  const matched = data.metrics.matched_intervals;
  return <>
    <div className="section-heading"><div><p className="eyebrow">RETROSPECTIVE PERFORMANCE</p><h2>How reliable were the forecasts?</h2></div><span className="badge">31 January decision days</span></div>
    <p className="notice">All January scores use forecasts available at {data.cutoff} London time for next-day delivery. This full-month evaluation was not available before each January decision.</p>
    <div className="metrics"><Metric label="Mean absolute error" value={number(data.metrics.mae_mw)} unit="MW" note="Average magnitude of matched errors" /><Metric label="Root mean square error" value={number(data.metrics.rmse_mw)} unit="MW" note="Gives greater weight to large errors" /><Metric label="Signed bias" value={number(data.metrics.bias_mw)} unit="MW" note="Negative: wind was overforecast on average" /></div>
    <section className="panel"><div className="chart-heading"><div><h3>Daily forecast accuracy</h3><p>Select a decision date to inspect its delivery forecast.</p></div></div><div className="coverage"><strong>{number(matched)} matched observations</strong><span>{percent(data.forecast_intervals ? matched/data.forecast_intervals : null)} of available forecasts</span><span>{percent(matched/data.expected_half_hours)} of all delivery half-hours</span></div>
      <div className="table-scroll"><table><caption>MAE, RMSE and bias are in MW. Scores use exact matching timestamps only.</caption><thead><tr><th>Decision date</th><th>Delivery date</th><th>MAE</th><th>RMSE</th><th>Bias</th><th>Matched / forecast</th></tr></thead><tbody>{data.days.map(d => <tr key={d.decision_date}><td><button className="text-button" onClick={() => onSelect(d.decision_date)}>{dayLabel(d.decision_date)}</button></td><td>{dayLabel(d.delivery_date)}</td><td>{number(d.metrics.mae_mw)}</td><td>{number(d.metrics.rmse_mw)}</td><td className={d.metrics.bias_mw < 0 ? 'negative' : ''}>{number(d.metrics.bias_mw)}</td><td>{d.metrics.matched_intervals} / {d.forecast_intervals}</td></tr>)}</tbody></table></div>
    </section>
  </>;
}

function App() {
  const [tab, setTab] = useState('decision');
  const [date, setDate] = useState('2026-01-15');
  const [cutoff, setCutoff] = useState('09:00');
  const [draftDate, setDraftDate] = useState(date);
  const [draftCutoff, setDraftCutoff] = useState(cutoff);
  const resource = useResource(tab === 'decision' ? `/api/decision?date=${date}&cutoff=${cutoff}` : `/api/accuracy?cutoff=${cutoff}`);
  const metadata = useResource('/api/metadata');
  const selectDay = selected => { setDate(selected); setDraftDate(selected); setTab('decision'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <><header className="topbar"><a className="brand" href="/"><span className="brand-icon">≋</span> windward<span className="brand-sub">DECISION INTELLIGENCE</span></a><span className="top-tag">ELEXON DATA <b>·</b> JAN 2026 PILOT</span></header>
    <main><section className="intro"><p className="eyebrow">WIND FORECAST WORKSPACE</p><h1>A clearer view of tomorrow’s wind.</h1><p>Understand what was known at the buying decision—and how the forecast performed.</p></section>
      <div className="workspace-bar"><nav aria-label="Dashboard views"><button className={tab === 'decision' ? 'active' : ''} aria-pressed={tab === 'decision'} onClick={() => setTab('decision')}>Decision view</button><button className={tab === 'accuracy' ? 'active' : ''} aria-pressed={tab === 'accuracy'} onClick={() => setTab('accuracy')}>Forecast accuracy</button></nav><span className="timezone">Europe/London · GMT</span></div>
      <form className="controls" onSubmit={e => { e.preventDefault(); setDate(draftDate); setCutoff(draftCutoff); }}>
        {tab === 'decision' && <label>Decision date<input type="date" required min="2026-01-01" max="2026-01-31" value={draftDate} onChange={e => setDraftDate(e.target.value)} /></label>}
        <label>Decision cutoff<input type="time" required step="60" value={draftCutoff} onChange={e => setDraftCutoff(e.target.value)} /></label><button className="primary" type="submit">Apply selection <span aria-hidden="true">↗</span></button><p>09:00 is an illustrative cutoff.<br />Adjust it to your buying process.</p>
      </form>
      <Status resource={resource} />
      {resource.data && (tab === 'decision' ? <Decision data={resource.data} /> : <Accuracy data={resource.data} onSelect={selectDay} />)}
      <details className="panel methodology"><summary>Methodology & source provenance</summary><p>For each next-day delivery timestamp, we select the latest WINDFOR publication at or before the decision cutoff. FUELHH actuals are filtered to WIND. Error = actual − forecast.</p><p>Forecast samples can be hourly while actuals are half-hourly averages. We score exact matching timestamps only, without interpolation. These are sampled timestamp errors, not a full-day settlement error measure. Missing data stays unavailable.</p><p>MAE is mean absolute error; RMSE is the square root of mean squared error; bias is mean signed error. Monthly metrics weight matched observations equally. Actuals use the latest revision in the downloaded snapshot.</p><p>Publication lookback starts 25 December 2025. January 31 decisions target February 1 delivery. This pilot does not estimate procurement volume, savings, or a calibrated uncertainty range.</p><Status resource={metadata} />{metadata.data && <p>Snapshot retrieved: {stamp(metadata.data.retrieved_at)} London time. {number(metadata.data.unique_forecasts)} forecast versions and {number(metadata.data.unique_actuals)} actual records.</p>}<a href="https://bmrs.elexon.co.uk/api-documentation" target="_blank" rel="noreferrer">Elexon API documentation ↗</a></details>
    </main><footer><span>windward / National wind pilot</span><span>Decision support, with the evidence in view.</span></footer></>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
