import json
import pytest
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
