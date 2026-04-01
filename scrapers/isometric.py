from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import markdownify
from bs4 import BeautifulSoup

from .base import BaseScraper


# v1 demo protocols — slug maps to /protocol/{slug}/{version}
DEMO_PROTOCOLS = [
    {"slug": "biochar", "version": "1.2"},
    {"slug": "enhanced-weathering-in-agriculture", "version": "1.2"},
    {"slug": "reforestation", "version": "1.1"},
]


class IsometricScraper(BaseScraper):
    """Scrapes Isometric protocol pages as Markdown (no PDFs available)."""

    BASE_URL = "https://registry.isometric.com"

    def __init__(self, output_dir: Path):
        super().__init__(output_dir)
        self._protocol_dir = output_dir / "methodologies" / "isometric"

    def get_protocol_list(self) -> list[dict]:
        """Return list of {slug, version} for demo protocols."""
        return DEMO_PROTOCOLS

    def protocol_url(self, slug: str, version: str) -> str:
        return f"{self.BASE_URL}/protocol/{slug}/{version}"

    def fetch_protocol_content(self, slug: str, version: str) -> str:
        """Fetch protocol page, strip nav/header/footer, return as Markdown."""
        url = self.protocol_url(slug, version)
        html = self.fetch_text(url)
        soup = BeautifulSoup(html, "lxml")

        for tag in soup.find_all(["nav", "footer", "header"]):
            tag.decompose()

        main = soup.find("main") or soup.find("div", id="__next") or soup.body
        if main is None:
            return ""

        return markdownify.markdownify(
            str(main),
            heading_style="ATX",
            strip=["script", "style"],
        )

    def sync_protocol(self, slug: str, version: str) -> dict:
        """Sync one protocol. Saves Markdown if content changed, updates metadata.json.

        Returns: {"id": str, "version": str, "changed": list[str]}
        """
        protocol_dir = self._protocol_dir / slug
        metadata_path = protocol_dir / "metadata.json"
        content_path = protocol_dir / f"v{version}.md"

        metadata = self.load_metadata(metadata_path)
        old_hash: str | None = metadata.get("current_hash")

        content = self.fetch_protocol_content(slug, version)
        new_hash = self.hash_bytes(content.encode("utf-8"))

        changed: list[str] = []
        if old_hash != new_hash:
            protocol_dir.mkdir(parents=True, exist_ok=True)
            content_path.write_text(content, encoding="utf-8")
            changed.append("content")

        # Always update metadata even when content is unchanged, so current_hash stays current
        metadata.update(
            {
                "id": slug,
                "registry": "isometric",
                "version": version,
                "current_hash": new_hash,
                "protocol_url": self.protocol_url(slug, version),
                "last_synced": datetime.now(timezone.utc).isoformat(),
            }
        )
        self.save_metadata(metadata_path, metadata)

        return {"id": slug, "version": version, "changed": changed}

    def sync_all(self) -> list[dict]:
        """Sync all demo protocols. Returns list of change summaries."""
        return [self.sync_protocol(p["slug"], p["version"]) for p in self.get_protocol_list()]
