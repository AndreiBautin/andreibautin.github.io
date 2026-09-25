# Andrei Bautin portfolio

Public portfolio: https://andreibautin.github.io/ — no login required.

Static portfolio grounded in the September 4, 2026 resume. Double-click `start-app.bat` (Node.js required), or run `npm run dev`, then open http://127.0.0.1:4317.

The published source is `dist/`: there is no framework, dependency install, domain layer, or transpilation. `npm run verify` checks JavaScript syntax, resume facts, local links, text formatting, the PDF, and the static deployment manifest. Browser appearance and external profile destinations are not automatically tested.

Keep factual claims grounded in the resume; avoid invented metrics and client details. The one-page PDF is generated from `scripts/build_resume.py` using ReportLab (`python -m pip install reportlab`, then `python scripts/build_resume.py`). It preserves the verified resume experience and adds DJ Visualizer and LifeOS project evidence. After any edit, check text extraction with pypdf and render the PDF to inspect clipping, spacing, and links. GitHub Pages publishes only `dist/` after `npm run verify` succeeds in `.github/workflows/pages.yml`. Pull requests run verification without deploying. The original Sites hosting metadata is retained for the existing backup site.
