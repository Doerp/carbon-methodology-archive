import pytest
import httpx
import respx
from scrapers.verra import VerraScraper


SAMPLE_METHODOLOGY_PAGE = """
<html><body>
<div class="entry-content">
  <h2>Documents</h2>
  <p><a href="https://verra.org/documents/vm0007-redd-methodology-framework-v1-8-clean/">Version 1.8 (Clean)</a></p>
  <p><a href="https://verra.org/documents/vm0007-redd-methodology-framework-v1-8-greenlined/">Version 1.8 (Track Changes)</a></p>
  <p><a href="https://verra.org/documents/vm0007-redd-methodology-framework-reddmf-v1-7/">Version 1.7</a></p>
  <p><a href="https://verra.org/wp-content/some-image.png">An image (should be ignored)</a></p>
</div>
</body></html>
"""


def test_extract_methodology_id_from_url(tmp_path):
    scraper = VerraScraper(tmp_path)
    assert scraper.extract_methodology_id(
        "https://verra.org/methodologies/vm0007-redd-methodology-framework-redd-mf-v1-8/"
    ) == "VM0007"
    assert scraper.extract_methodology_id(
        "https://verra.org/methodologies/vm0042-methodology-for-improved-cook-stoves-v2-0/"
    ) == "VM0042"


def test_extract_methodology_id_raises_on_unrecognised_url(tmp_path):
    scraper = VerraScraper(tmp_path)
    with pytest.raises(ValueError):
        scraper.extract_methodology_id("https://verra.org/not-a-methodology/")


@respx.mock
def test_get_documents_only_returns_document_urls(tmp_path):
    scraper = VerraScraper(tmp_path)
    url = "https://verra.org/methodologies/vm0007-test/"
    respx.get(url).mock(return_value=httpx.Response(200, text=SAMPLE_METHODOLOGY_PAGE))

    docs = scraper.get_documents_for_methodology(url)

    # Should only include /documents/ links, not wp-content images
    assert len(docs) == 3
    assert all("verra.org/documents/" in d["url"] for d in docs)
    assert docs[0]["is_current"] is True
    assert "is_current" not in docs[1]


@respx.mock
def test_sync_methodology_downloads_new_file(tmp_path):
    scraper = VerraScraper(tmp_path)
    page_url = "https://verra.org/methodologies/vm0007-redd-test-v1-8/"
    doc_url = "https://verra.org/documents/vm0007-v1-8-clean/"
    fake_pdf = b"%PDF-1.7 fake methodology content"

    respx.get(page_url).mock(
        return_value=httpx.Response(200, text=f"""
        <html><body>
        <a href="{doc_url}">Version 1.8 (Clean)</a>
        </body></html>
        """)
    )
    respx.get(doc_url).mock(return_value=httpx.Response(200, content=fake_pdf))

    result = scraper.sync_methodology(page_url)

    assert result["id"] == "VM0007"
    assert len(result["changed"]) == 1

    # PDF was saved
    method_dir = tmp_path / "methodologies" / "verra" / "VM0007"
    pdf_files = list(method_dir.glob("*.pdf"))
    assert len(pdf_files) == 1
    assert pdf_files[0].read_bytes() == fake_pdf

    # Metadata was saved
    import json
    metadata = json.loads((method_dir / "metadata.json").read_text())
    assert metadata["id"] == "VM0007"
    assert metadata["registry"] == "verra"
    assert len(metadata["versions"]) == 1
    assert metadata["versions"][0]["is_current"] is True


@respx.mock
def test_sync_methodology_skips_unchanged_file(tmp_path):
    """Running sync twice with identical PDF content produces no changes on second run."""
    scraper = VerraScraper(tmp_path)
    page_url = "https://verra.org/methodologies/vm0007-redd-test-v1-8/"
    doc_url = "https://verra.org/documents/vm0007-v1-8-clean/"
    fake_pdf = b"%PDF-1.7 fake methodology content"

    respx.get(page_url).mock(
        return_value=httpx.Response(200, text=f"""
        <html><body><a href="{doc_url}">Version 1.8 (Clean)</a></body></html>
        """)
    )
    respx.get(doc_url).mock(return_value=httpx.Response(200, content=fake_pdf))

    scraper.sync_methodology(page_url)          # first run → downloads
    result = scraper.sync_methodology(page_url) # second run → no changes

    assert result["changed"] == []


@respx.mock
def test_sync_methodology_re_downloads_when_pdf_changes(tmp_path):
    """If the PDF hash changes, the file is re-downloaded and marked changed."""
    scraper = VerraScraper(tmp_path)
    page_url = "https://verra.org/methodologies/vm0007-redd-test-v1-8/"
    doc_url = "https://verra.org/documents/vm0007-v1-8-clean/"

    def make_page():
        return httpx.Response(200, text=f"""
        <html><body><a href="{doc_url}">Version 1.8 (Clean)</a></body></html>
        """)

    respx.get(page_url).side_effect = [make_page(), make_page()]
    respx.get(doc_url).side_effect = [
        httpx.Response(200, content=b"%PDF old version"),
        httpx.Response(200, content=b"%PDF updated version"),
    ]

    scraper.sync_methodology(page_url)
    result = scraper.sync_methodology(page_url)

    assert len(result["changed"]) == 1
