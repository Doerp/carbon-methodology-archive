# Carbon Methodology Archive

Public archive of carbon registry methodologies. Documents are synced monthly via GitHub Actions.

## Registries covered

- **Verra (VCS):** REDD+, ARR, IFM methodologies
- **Isometric:** Biochar, enhanced weathering, reforestation protocols

## Structure

- `methodologies/verra/{ID}/` — PDFs + metadata for each Verra methodology
- `methodologies/isometric/{slug}/` — Markdown content + metadata for each Isometric protocol
- `extracted/taxonomy/` — AI-extracted structured taxonomy (see extraction pipeline)
- `CHANGELOG.md` — Auto-generated diff summary per monthly sync

## Using this archive

All methodology documents are public domain. You can use the `extracted/` JSON directly
for analysis without running the scrapers yourself.
