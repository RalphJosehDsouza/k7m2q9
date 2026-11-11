# Wind forecast decision portal

## Assignment scope

Build a pilot for a UK utility's day-ahead electricity procurement team, using only Elexon national wind generation actuals (FUELHH, fuelType WIND) and forecasts (WINDFOR).

- React frontend and Python backend.
- Docker support and deployment on Vercel or Heroku.
- Decisions made in January 2026; delivery is the following day. This includes delivery on 1 February for a 31 January decision.
- Show the latest forecast available at a specified decision time.
- Quantify the historical accuracy of those decision-time forecasts.
- Public GitHub repository with an anonymous name.
- README covering project structure, startup, deployed URL, and explicit AI assistance disclosure.
- Unlisted YouTube video, maximum 10 minutes: customer pitch and technical review, each at most 5 minutes.
- Verify submitted links in an incognito window.
- Keep the assignment within the stated 16-hour effort limit.

## Analysis decisions to verify before implementation

- Inspect Elexon's endpoint documentation and real responses before defining data ingestion.
- Use Europe/London for decision dates and delivery-day boundaries; retain timezone-aware timestamps internally.
- Make the decision cutoff explicit and configurable. A proposed 09:00 London default is an illustrative pilot assumption, not a claim about an exchange's gate closure.
- For each delivery interval, select the most recently published forecast whose publishTime is no later than the decision cutoff.
- Join forecast and actual by delivery interval. Never silently substitute a later forecast, zero-fill missing intervals, or fabricate observations.
- Calculate MAE, RMSE, and signed bias on matched intervals. Define error as actual minus forecast; negative bias therefore means wind was overforecast.
- Show matched-interval coverage and missing-data warnings alongside every aggregate.
- Distinguish MW power from MWh energy; integrate half-hourly average power using 0.5 hours only after confirming source resolution.
- Keep retrospective actuals visibly separate from information available at decision time.
- Explain that national wind data alone cannot determine a utility's actual purchase volume: customer demand and contracted supply are outside the supplied scope.
- If a historical error range is shown as decision support, use only observations available before that decision and describe its limitations.

## Proposed application

A decision dashboard with a January decision-date selector and configurable cutoff, next-day wind forecast chart, energy summary, publication freshness, and coverage indicators. A historical accuracy view shows matched actuals, forecast errors, MAE, RMSE, bias, and daily performance.

Use a small Python API with separate ingestion, forecast selection, and analytics modules. Persist or cache the bounded historical dataset so routine page loads do not repeatedly fetch upstream data. Expose source and acquisition metadata. Keep the React presentation separate from domain calculations.

## Commit and testing checkpoints

The user runs all commits and execution tests. The assistant supplies changes, commands, expected results, and fixes based on reported output. Stop at each checkpoint so changes remain separately commit-able.

1. Requirements and plan: `docs: capture assignment scope and implementation plan`
2. Data pipeline and decision-time analytics: `feat: add Elexon ingestion and forecast accuracy analysis`
3. React decision dashboard: `feat: add wind forecast and accuracy dashboard`
4. Docker and deployment configuration: `build: add containers and deployment setup`
5. README, validation checklist, and video script: `docs: add setup guide and demo walkthrough`

Do not advance a stage as verified until the user has reported the relevant test results. Keep proposed and completed work clearly distinguished.

## Demo outline

### Customer segment: approximately 4 minutes 30 seconds

1. Explain the procurement problem and the pilot's national-wind scope.
2. Select a decision date and show the next delivery day's forecast available at the cutoff.
3. Explain generation, energy, publication freshness, and data coverage.
4. Inspect historical errors and explain the operational meaning of overforecasting.
5. State the pilot's value and limitations without claiming unsupported savings.

### Technical segment: approximately 4 minutes 30 seconds

1. Trace Elexon data through ingestion, storage/cache, API, and React.
2. Explain decision-time forecast selection, timestamp handling, and interval matching.
3. Walk through metric definitions, coverage handling, and meaningful tests.
4. Explain Docker, deployment, reproducibility, and AI assistance.
5. Close with tradeoffs and practical future improvements.

Write the final narration against the finished, tested app. Record real app behavior and reported results; leave time for transitions within the 10-minute limit.
