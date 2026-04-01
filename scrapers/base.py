import hashlib
import json
from pathlib import Path

import httpx


class BaseScraper:
    """Shared utilities: HTTP client, hash tracking, file I/O."""

    USER_AGENT = (
        "carbon-methodology-archive/1.0 "
        "(public research archival; github.com/carbon-methodology-archive)"
    )

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self._client: httpx.Client | None = None

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(
                timeout=60.0,
                follow_redirects=True,
                headers={"User-Agent": self.USER_AGENT},
            )
        return self._client

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None

    def __enter__(self) -> "BaseScraper":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        self.close()

    @staticmethod
    def hash_bytes(data: bytes) -> str:
        return "sha256:" + hashlib.sha256(data).hexdigest()

    @staticmethod
    def hash_file(path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return "sha256:" + sha256.hexdigest()

    def save_bytes(self, path: Path, data: bytes) -> str:
        """Save bytes to path, creating parent dirs. Returns sha256 hash."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return self.hash_bytes(data)

    def load_metadata(self, path: Path) -> dict:
        """Load JSON metadata. Returns empty dict if file does not exist."""
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {}

    def save_metadata(self, path: Path, metadata: dict) -> None:
        """Write dict as indented JSON, creating parent dirs."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    def fetch_bytes(self, url: str) -> bytes:
        response = self.client.get(url)
        response.raise_for_status()
        return response.content

    def fetch_text(self, url: str) -> str:
        response = self.client.get(url)
        response.raise_for_status()
        return response.text
