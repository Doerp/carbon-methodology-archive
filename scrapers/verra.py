from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, Tag

from .base import BaseScraper


# v1 demo: three representative methodologies (expanded to full scrape in v2)
DEMO_METHODOLOGY_URLS = [
    "https://verra.org/methodologies/vm0007-redd-methodology-framework-redd-mf-v1-8/",
    "https://verra.org/methodologies/vm0042-methodology-for-improved-cook-stoves-and-kitchen-regimes-v2-0/",
    "https://verra.org/methodologies/vm0047-afforestation-reforestation-and-revegetation-v1-0/",
]


class VerraScraper(BaseScraper):
    """Scrapes Verra (VCS) methodology PDFs."""

    def __init__(self, output_dir: Path):
        super().__init__(output_dir)
        self._method_dir = output_dir / "methodologies" / "verra"

    def get_methodology_page_urls(self) -> list[str]:
        """Return list of individual methodology page URLs to sync."""
        return DEMO_METHODOLOGY_URLS

    def extract_methodology_id(self, page_url: str) -> str:
        """Extract e.g. 'VM0007' from a methodology page URL."""
        match = re.search(r"/(vm\d+)", page_url, re.IGNORECASE)
        if not match:
            raise ValueError(f"Cannot extract methodology ID from URL: {page_url}")
        return match.group(1).upper()

    def get_documents_for_methodology(self, page_url: str) -> list[dict]:
        """Scrape a methodology page for document download URLs.

        Returns list of:
            {"label": str, "url": str, "is_current": bool (first item only)}
        """
        html = self.fetch_text(page_url)
        soup = BeautifulSoup(html, "lxml")
        docs = []
        for a in soup.find_all("a", href=re.compile(r"https://verra\.org/documents/")):
            if not isinstance(a, Tag):
                continue
            url = str(a["href"]).rstrip("/") + "/"
            label = a.get_text(strip=True) or str(a.get("title", url))
            docs.append({"label": label, "url": url})
        if docs:
            docs[0]["is_current"] = True
        return docs

    def sync_methodology(self, page_url: str) -> dict:
        """Sync one methodology. Downloads changed PDFs, updates metadata.json.

        Returns: {"id": str, "changed": list[str]}  (changed = list of labels)
        """
        methodology_id = self.extract_methodology_id(page_url)
        method_dir = self._method_dir / methodology_id
        metadata_path = method_dir / "metadata.json"

        metadata = self.load_metadata(metadata_path)
        existing_hashes: dict[str, str] = {
            v["url"]: v["hash"] for v in metadata.get("versions", [])
        }

        docs = self.get_documents_for_methodology(page_url)
        changed: list[str] = []
        versions: list[dict] = []

        for doc in docs:
            pdf_bytes = self.fetch_bytes(doc["url"])
            new_hash = self.hash_bytes(pdf_bytes)

            if existing_hashes.get(doc["url"]) != new_hash:
                # Derive filename from URL slug
                slug = doc["url"].rstrip("/").split("/")[-1]
                filename = f"{slug}.pdf"
                self.save_bytes(method_dir / filename, pdf_bytes)
                changed.append(doc["label"])

            versions.append({
                "label": doc["label"],
                "url": doc["url"],
                "hash": new_hash,
                "is_current": doc.get("is_current", False),
            })

        metadata.update(
            {
                "id": methodology_id,
                "registry": "verra",
                "page_url": page_url,
                "versions": versions,
            }
        )
        self.save_metadata(metadata_path, metadata)

        return {"id": methodology_id, "changed": changed}

    def sync_all(self) -> list[dict]:
        """Sync all demo methodologies. Returns list of change summaries."""
        return [self.sync_methodology(url) for url in self.get_methodology_page_urls()]
