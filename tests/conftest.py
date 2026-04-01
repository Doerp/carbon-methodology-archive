import pytest
from pathlib import Path


@pytest.fixture
def tmp_output(tmp_path: Path) -> Path:
    """Temporary output directory for scrapers during tests."""
    return tmp_path
