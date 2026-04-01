import json
import httpx
import respx
from scrapers.isometric import IsometricScraper


SAMPLE_PROTOCOL_HTML = """
<html><body>
<nav>Site Navigation</nav>
<header>Site Header</header>
<main>
  <h1>Biochar Production and Storage v1.2</h1>
  <h2>1. Summary</h2>
  <p>This protocol certifies biochar production for carbon removal.</p>
  <h2>2. Scope and Eligibility</h2>
  <p>Applicable to biochar producers with verified feedstock sourcing.</p>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Permanence</td><td>100+ years</td></tr>
  </table>
</main>
<footer>Footer text</footer>
</body></html>
"""


def test_protocol_url_construction(tmp_path):
    scraper = IsometricScraper(tmp_path)
    url = scraper.protocol_url("biochar", "1.2")
    assert url == "https://registry.isometric.com/protocol/biochar/1.2"


@respx.mock
def test_fetch_protocol_content_returns_markdown(tmp_path):
    scraper = IsometricScraper(tmp_path)
    url = "https://registry.isometric.com/protocol/biochar/1.2"
    respx.get(url).mock(return_value=httpx.Response(200, text=SAMPLE_PROTOCOL_HTML))

    content = scraper.fetch_protocol_content("biochar", "1.2")

    assert "Biochar Production and Storage" in content
    assert "1. Summary" in content
    assert "carbon removal" in content
    # Nav, header and footer should be stripped
    assert "Site Navigation" not in content
    assert "Site Header" not in content
    assert "Footer text" not in content


@respx.mock
def test_sync_protocol_saves_markdown_file(tmp_path):
    scraper = IsometricScraper(tmp_path)
    url = "https://registry.isometric.com/protocol/biochar/1.2"
    respx.get(url).mock(return_value=httpx.Response(200, text=SAMPLE_PROTOCOL_HTML))

    result = scraper.sync_protocol("biochar", "1.2")

    assert result == {"id": "biochar", "version": "1.2", "changed": ["content"]}

    content_path = tmp_path / "methodologies" / "isometric" / "biochar" / "v1.2.md"
    assert content_path.exists()
    assert "Biochar Production" in content_path.read_text()

    metadata = json.loads((tmp_path / "methodologies" / "isometric" / "biochar" / "metadata.json").read_text())
    assert metadata["id"] == "biochar"
    assert metadata["registry"] == "isometric"
    assert metadata["version"] == "1.2"
    assert metadata["current_hash"].startswith("sha256:")


@respx.mock
def test_sync_protocol_skips_unchanged_content(tmp_path):
    scraper = IsometricScraper(tmp_path)
    url = "https://registry.isometric.com/protocol/biochar/1.2"
    respx.get(url).mock(return_value=httpx.Response(200, text=SAMPLE_PROTOCOL_HTML))

    scraper.sync_protocol("biochar", "1.2")  # first run
    result = scraper.sync_protocol("biochar", "1.2")  # second run, same content

    assert result["changed"] == []


@respx.mock
def test_sync_protocol_detects_content_change(tmp_path):
    scraper = IsometricScraper(tmp_path)
    url = "https://registry.isometric.com/protocol/biochar/1.2"

    updated_html = SAMPLE_PROTOCOL_HTML.replace(
        "This protocol certifies biochar production for carbon removal.",
        "Updated: This protocol certifies biochar production for permanent carbon removal."
    )

    respx.get(url).side_effect = [
        httpx.Response(200, text=SAMPLE_PROTOCOL_HTML),
        httpx.Response(200, text=updated_html),
    ]

    scraper.sync_protocol("biochar", "1.2")
    result = scraper.sync_protocol("biochar", "1.2")

    assert result["changed"] == ["content"]
