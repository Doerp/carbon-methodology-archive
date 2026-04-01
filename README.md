# Carbon Methodology Archive

> Open, version-controlled archive of carbon registry methodology documents. Updated monthly via GitHub Actions.

Carbon projects generate credits by following approved methodologies set by registries like Verra and Isometric. This archive tracks those documents across registries — so researchers, developers, and practitioners can audit changes, compare approaches, and build analysis tools without scraping registries themselves.

## What's here

| Path | Contents |
|---|---|
| `methodologies/verra/{ID}/` | Verra (VCS) methodology PDFs + structured metadata |
| `methodologies/isometric/{slug}/` | Isometric protocol content (Markdown) + metadata |
| `extracted/taxonomy/` | AI-extracted structured taxonomy (in progress) |
| `CHANGELOG.md` | Auto-generated summary of each monthly update |

## Registries covered (v1)

**Verra (VCS)**
- VM0007 — REDD+ Methodology Framework (REDD-MF)
- VM0042 — Improved Agricultural Land Management
- VM0047 — Afforestation, Reforestation and Revegetation

**Isometric**
- Biochar production and storage
- Enhanced weathering in agriculture
- Reforestation

## Using the data

No API key, no scraping. Clone and use:

```bash
git clone https://github.com/Doerp/carbon-methodology-archive
```

Each methodology directory contains the document file and a `metadata.json`:

```json
{
  "id": "VM0007",
  "registry": "verra",
  "page_url": "https://verra.org/methodologies/vm0007-...",
  "versions": [
    {
      "label": "Version 1.8 (Clean)",
      "url": "https://verra.org/documents/vm0007-.../",
      "hash": "sha256:3a9f...",
      "is_current": true
    }
  ],
  "last_synced": "2026-04-01T06:00:00+00:00"
}
```

Use `git log -- methodologies/verra/VM0007/` to see the full version history of any methodology.

## How updates work

A GitHub Actions workflow runs on the 1st of every month:

1. Fetches each methodology page and downloads documents
2. Computes SHA-256 hashes and compares against stored values
3. Commits new and changed files (unchanged files are not touched)
4. Calls Claude to write a human-readable `CHANGELOG.md` entry

Trigger a manual sync anytime: **Actions → Monthly Methodology Sync → Run workflow**

## Running the scraper locally

```bash
git clone https://github.com/Doerp/carbon-methodology-archive
cd carbon-methodology-archive
pip install -e .
python scripts/run_sync.py
```

## Roadmap

- [ ] Expand to full Verra methodology index (~200 methodologies)
- [ ] Gold Standard and Puro.earth registries
- [ ] AI-extracted taxonomy: baseline approach, additionality test, monitoring protocol, and more
- [ ] Methodology Explorer web app — compare methodologies, track changes

## Document licensing

Verra methodology documents are © Verra. Isometric protocol documents are © Isometric. This archive redistributes publicly available documents for research and transparency purposes. Refer to each registry's terms of use.
