# Windward demo: recording guide and narration

Target 8:30-9:30 total. Part 1 must finish before 5:00; keep Part 2 below five minutes as well. The timings below are rehearsal targets, not a guarantee of final duration. Speak naturally and pause while the page updates.

## Prepare before recording

- Verify the production URL in incognito: https://k7m2q9-liart.vercel.app/
- Keep the app, repository README, `backend/analytics.py`, `backend/ingest.py`, `backend/main.py`, and test file ready in tabs/editor.
- Use a clear 1080p capture, readable browser zoom and microphone. Close notifications and unrelated tabs. A face camera is optional; readable screens and clear speech matter more.
- Make a 20-second trial recording. Play it back to check microphone level and text readability.
- Rehearse January 15 at 09:00 versus 12:00. If that comparison does not change, try 23:00 or another day and choose a real example. An unchanged forecast is valid; do not invent a change.
- Read the displayed numbers aloud only after verifying them. The narration deliberately avoids unverified numeric claims.
- Have actual test results ready if showing tests. Do not run installations or a fresh data download during the recording.

## Part 1: customer pilot presentation (0:00-4:30)

### 0:00-0:40 — Open on the decision view

“This is Windward, a pilot for a day-ahead electricity buying team. The question is not simply how much wind is forecast. It is: what forecast was available when we had to make the decision, and how reliable was that information?

“Windward brings those questions together using Elexon's national wind forecasts and actual generation. It evaluates published forecasts rather than creating a new forecasting model.”

### 0:40-1:30 — Select a decision date and apply 09:00

“Here I choose the date of the buying decision and the time at which information is cut off. The delivery day is tomorrow. Nine o'clock is a configurable pilot assumption, not a claim about an exchange deadline.

“Each green point comes from the latest publication available by that cutoff. These cards show how many observations exist and how old the selected forecasts were. I can inspect the original publication times below, so the result is traceable.”

### 1:30-2:25 — Scroll to Decision replay; compare cutoffs

“The decision replay makes forecast revisions visible. This compares the same delivery timestamps at our original cutoff and a second time on the same decision day.

“The summary shows how many shared forecasts changed, the average signed revision, and the largest absolute revision. I can expand the table to see the individual values and publications. A revision here is a change between forecasts, not an error against actual generation.

“The later view helps review how the information changed. It is never presented as knowledge we had at the earlier cutoff.”

Action: point to one real changed row, or explicitly explain an unchanged comparison. Do not say waiting would necessarily improve purchasing: market deadlines and prices are outside the dataset.

### 2:25-3:20 — Enable retrospective actuals; show spotlight

“Turning on actuals separates the outcome from the original forecast. Orange squares show what was subsequently recorded.

“The overforecast spotlight focuses on times when less wind arrived than expected. That direction of error can increase the need for additional supply. It shows the count of affected matched observations and the largest observed gap, without pretending this national figure is the utility's own purchase requirement.”

Action: read the actual largest-gap value and time visible on screen, if available.

### 3:20-4:30 — Open Forecast accuracy and methodology

“The monthly view quantifies reliability. Mean absolute error describes the typical error magnitude. Root mean square error gives larger mistakes more weight. Signed bias shows direction: negative means wind was overforecast on average.

“Coverage is essential. These forecast samples can be hourly while actuals are half-hourly averages, so we compare exact shared timestamps and do not invent intermediate values. All available forecasts can match actuals while still covering only half the delivery grid.

“This January analysis is retrospective, not an uncertainty estimate available before every January decision. The pilot's value is an auditable view of forecast information and its observed errors. Customer demand, existing contracts and prices would be needed to turn it into a complete purchasing tool.”

## Part 2: technical review (4:30-9:00)

### 4:30-5:10 — Show README architecture and folders

“For the technical review, this is a React frontend and Python FastAPI backend. The data path is Elexon ingestion, a versioned JSON snapshot, pure selection and analytics functions, API responses, and React presentation.

“I used a snapshot because the assignment is a bounded historical pilot. It makes the demonstration reproducible and avoids depending on Elexon's availability during every page request.”

### 5:10-6:00 — Show ingestion

“The ingestion module requests forecast publication history and WIND-filtered actuals in daily batches. Forecast retrieval starts before January to support early January cutoffs. The delivery range includes February first because a January thirty-first decision buys for the next day.

“Requests have timeouts and retries for transient failures. We validate source values, retain request metadata, and replace the snapshot only after successful completion. A refresh can include revised actuals, so it is explicit and followed by a restart or redeployment.”

### 6:00-6:55 — Show normalise and decision_view

“The core selection rule is here: for each delivery timestamp, publication time must be no later than the decision cutoff. Of those eligible records, select the latest. Datetimes are timezone-aware and decision boundaries use Europe/London.

“Identical duplicates collapse, conflicting versions are rejected, and actuals use the latest revision in the snapshot. Missing forecasts stay missing. The function builds a half-hour grid, but it does not interpolate the hourly forecast observations.”

### 6:55-7:35 — Show metrics and tests

“Error is actual minus forecast. The metric functions calculate MAE, RMSE and bias on matched observations only. Monthly scores pool those errors rather than averaging daily averages.

“The synthetic tests target the failure modes that would mislead the analysis: admitting a later publication, treating missing data as zero, losing a true zero, mishandling January's delivery boundary, conflicting duplicates, and incorrect metric arithmetic.”

Action: show the test file and, only if available, a genuine successful test run. Say the actual result rather than claiming an unobserved pass.

### 7:35-8:15 — Show API and frontend

“FastAPI separates the API routes from the domain functions and caches the normalized snapshot per process. Readiness verifies that the source datasets load and are nonempty.

“The frontend has loading, error and retry states. Requests are cancelled when selections change, which prevents stale responses from replacing the current view. SVG points preserve the missing intervals, and the tables expose exact values and publication evidence.”

### 8:15-9:00 — Show deployment configuration and finish

“Docker builds React in one stage and runs Python as a non-root user in the final image. The same Python application serves the built frontend. Vercel hosts the Python application with the frontend assets and the bundled snapshot; it does not run the Docker image.

“Codex assisted with research, implementation, tests and documentation. I handled local validation, commits and deployment, and the README discloses that assistance.

“The main next steps would be validating forecast interval semantics, agreeing operational cutoffs, and adding stronger deployment tests and scheduled ingestion. For this pilot, the focus is transparent decision-time selection, honest coverage, and a calculation path that a reviewer can inspect.”

## Finish the recording

1. Watch the complete video. Check readable text, clear voice, no credentials, no false claims, and duration below ten minutes.
2. Upload to YouTube with Unlisted visibility. A concise title is “Windward | Customer demo and technical walkthrough”.
3. Open the video link in an incognito window and play it without signing in. Wait for acceptable video quality before submitting.
4. Add its real URL to the README and use the submission checklist. Do not submit while the video link is pending.
