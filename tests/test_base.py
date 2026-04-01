import json
import pytest
import respx
import httpx
from pathlib import Path
from scrapers.base import BaseScraper


def test_hash_bytes_returns_sha256_prefixed_string():
    data = b"hello world"
    result = BaseScraper.hash_bytes(data)
    assert result.startswith("sha256:")
    assert len(result) == 7 + 64  # "sha256:" + 64 hex chars


def test_hash_bytes_is_deterministic():
    data = b"test data"
    assert BaseScraper.hash_bytes(data) == BaseScraper.hash_bytes(data)


def test_hash_bytes_differs_for_different_content():
    assert BaseScraper.hash_bytes(b"foo") != BaseScraper.hash_bytes(b"bar")


def test_hash_file_matches_hash_bytes(tmp_path):
    path = tmp_path / "test.bin"
    data = b"file content here"
    path.write_bytes(data)
    assert BaseScraper.hash_file(path) == BaseScraper.hash_bytes(data)


def test_save_bytes_creates_parent_dirs(tmp_path):
    scraper = BaseScraper(tmp_path)
    dest = tmp_path / "deep" / "nested" / "file.pdf"
    returned_hash = scraper.save_bytes(dest, b"pdf content")
    assert dest.exists()
    assert dest.read_bytes() == b"pdf content"
    assert returned_hash == BaseScraper.hash_bytes(b"pdf content")


def test_save_and_load_metadata_roundtrips(tmp_path):
    scraper = BaseScraper(tmp_path)
    path = tmp_path / "meta.json"
    data = {"id": "VM0007", "registry": "verra", "versions": []}
    scraper.save_metadata(path, data)
    loaded = scraper.load_metadata(path)
    assert loaded == data


def test_load_metadata_returns_empty_dict_for_missing_file(tmp_path):
    scraper = BaseScraper(tmp_path)
    result = scraper.load_metadata(tmp_path / "nonexistent.json")
    assert result == {}


def test_save_metadata_creates_parent_dirs(tmp_path):
    scraper = BaseScraper(tmp_path)
    path = tmp_path / "nested" / "dir" / "meta.json"
    scraper.save_metadata(path, {"key": "value"})
    assert path.exists()
    assert json.loads(path.read_text())["key"] == "value"


@respx.mock
def test_fetch_bytes_returns_response_content(tmp_path):
    respx.get("https://example.com/file.pdf").mock(
        return_value=httpx.Response(200, content=b"%PDF-content")
    )
    scraper = BaseScraper(tmp_path)
    assert scraper.fetch_bytes("https://example.com/file.pdf") == b"%PDF-content"
    scraper.close()


@respx.mock
def test_fetch_bytes_raises_on_http_error(tmp_path):
    respx.get("https://example.com/missing").mock(
        return_value=httpx.Response(404)
    )
    scraper = BaseScraper(tmp_path)
    with pytest.raises(httpx.HTTPStatusError):
        scraper.fetch_bytes("https://example.com/missing")
    scraper.close()


def test_context_manager_closes_client(tmp_path):
    """Verify __exit__ calls close() so the HTTP client is released."""
    with BaseScraper(tmp_path) as scraper:
        # Trigger client creation
        _ = scraper.client
        assert scraper._client is not None
    # After exiting context manager, client should be None
    assert scraper._client is None
