# Historical Elexon snapshot

`january-2026.json` contains public WINDFOR and WIND-filtered FUELHH API responses, plus retrieval time and request parameters. It is intentionally tracked for this bounded historical pilot, so a fresh checkout and deployment use the same observations. It is not synthetic demo data.

Regenerate explicitly with `python -m backend.ingest`, review the changes, then commit and redeploy. A refresh can include source revisions and therefore change retrospective scores. The application does not write to this file during requests.

Sources: https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream and https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream

The original assignment PDF, virtual environments, and secrets are not part of the deployment bundle.
