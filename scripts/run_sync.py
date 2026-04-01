#!/usr/bin/env python3
"""Main sync entry point: runs all scrapers and writes .changes.json."""
import json
import sys
from pathlib import Path

# Add repo root to path so `scrapers` is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from scrapers.verra import VerraScraper
from scrapers.isometric import IsometricScraper


def run_sync(output_dir: Path) -> list[dict]:
    """Run all scrapers. Returns list of items that changed."""
    all_changes: list[dict] = []

    print("Syncing Verra methodologies...")
    with VerraScraper(output_dir) as scraper:
        for result in scraper.sync_all():
            status = f"changed: {result['changed']}" if result["changed"] else "no changes"
            print(f"  {result['id']}: {status}")
            if result["changed"]:
                all_changes.append(result)

    print("Syncing Isometric protocols...")
    with IsometricScraper(output_dir) as scraper:
        for result in scraper.sync_all():
            status = "changed" if result["changed"] else "no changes"
            print(f"  {result['id']} v{result['version']}: {status}")
            if result["changed"]:
                all_changes.append(result)

    # Write for changelog script to consume
    changes_file = output_dir / ".changes.json"
    changes_file.write_text(json.dumps(all_changes, indent=2))

    print(f"\nSync complete. {len(all_changes)} item(s) changed.")
    return all_changes


if __name__ == "__main__":
    run_sync(Path(__file__).parent.parent)
