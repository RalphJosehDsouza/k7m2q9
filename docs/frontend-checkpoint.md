# React dashboard checkpoint

The user runs installation, build, and browser checks. These checks have not been run by the assistant.

## Start

Keep the backend running on port 8000 in your existing CMD window. Open another CMD window:

```bat
cd /d C:\Users\ABCOM\Desktop\wellfound_assignment\frontend
node --version
npm install
npm run build
npm run dev
```

Use Node 22.12 or newer. `npm install` creates `package-lock.json`; include it in the commit for reproducible installs. `npm run build` should finish successfully and create `frontend/dist`. Open the localhost URL printed by Vite (normally http://localhost:5173).

The development server forwards `/api` requests to the Python backend. Production hosting wiring belongs to the next checkpoint; `npm run preview` alone does not proxy API requests.

## Browser checks

1. Confirm the default January 15 decision shows January 16 delivery and real forecast observations.
2. Select January 1 and apply, then January 31 and apply. The latter must show February 1 delivery.
3. Change the cutoff and apply. Inspect publication times in the expandable interval table: none may exceed that decision's cutoff. A cutoff change need not change the forecast if no new publication occurred between cutoffs.
4. Actuals are hidden initially. Turn on retrospective actuals: orange squares, actual/error table columns, and daily accuracy cards should appear, clearly labelled retrospective.
5. Open Forecast accuracy. Check 31 rows and compare the displayed aggregate metrics with `/api/accuracy` in the API explorer. Click a decision date to return to that forecast.
6. Check coverage: hourly forecasts can yield 24/48 forecast timestamps with 100% matching against available forecasts. Missing cells display a dash; they must not display zero.
7. Change dates rapidly. Only the last applied selection should render; old data must not appear under new headings.
8. Stop the backend, apply a new date, and confirm an error state. Restart the backend and press Try again. The view should recover.
9. Check a narrow window and keyboard navigation. Tables and the chart may scroll horizontally; controls and cards should fit the page. Exact values are available in the interval table without hovering.
10. Expand Methodology & source provenance and check the snapshot timestamp and record counts.

The chart deliberately shows individual points without connecting or interpolating missing half-hours. Fonts load from Google Fonts, with local sans-serif fallbacks if unavailable. No external images are required.

## Commit after checks pass

### Additional decision replay checks

- Under Decision replay, compare the selected baseline cutoff with 12:00. Both must refer to the same decision and delivery dates. Revisions are comparison minus baseline, not actual forecast errors.
- Compare the same cutoff as the baseline: mean and largest revision must be zero if shared forecasts exist.
- Compare 09:00 with 23:00 on several days. Values may change, but unchanged values are valid. Inspect publication timestamps in the expanded revisions table.
- Turn on retrospective actuals and inspect Overforecast spotlight. It counts negative errors only; the largest gap must match the most negative error in the interval table.
- Change the decision date with replay open. The replay must load the newly selected day without showing the previous day's comparison.
- Repeat `npm run build` after these additions. No build or browser checks have been run by the assistant for this update.

From the repository root:

```bat
git add frontend docs/frontend-checkpoint.md
git commit -m "feat: add wind forecast and accuracy dashboard"
```

Report build output and any browser issues before committing. No deployment or commits are performed by the assistant.
