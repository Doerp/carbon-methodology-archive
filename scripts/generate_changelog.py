#!/usr/bin/env python3
"""Generate a CHANGELOG.md entry for today's sync using Claude."""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic


def generate_entry(changes: list[dict], today: str) -> str:
    """Call Claude to write a concise CHANGELOG entry for the given changes."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Write a concise CHANGELOG entry for the following carbon methodology "
                    f"registry updates. Format as a markdown section. Be factual and specific. "
                    f"Mention the registry, methodology/protocol ID, and what changed.\n\n"
                    f"Date: {today}\n"
                    f"Changes:\n{json.dumps(changes, indent=2)}\n\n"
                    f"Format exactly as:\n"
                    f"## {today}\n"
                    f"- [one bullet per changed item]"
                ),
            }
        ],
    )
    return message.content[0].text.strip()


def prepend_entry(entry: str, changelog_path: Path) -> None:
    """Insert a new entry after the '# Changelog' header line."""
    existing = (
        changelog_path.read_text(encoding="utf-8")
        if changelog_path.exists()
        else "# Changelog\n"
    )
    lines = existing.split("\n")
    header_line = lines[0]
    rest = "\n".join(lines[1:]).lstrip("\n")
    changelog_path.write_text(
        f"{header_line}\n\n{entry}\n\n{rest}",
        encoding="utf-8",
    )


def main() -> None:
    output_dir = Path(".")
    changes_file = output_dir / ".changes.json"

    if not changes_file.exists():
        print("No .changes.json found. Run run_sync.py first.")
        sys.exit(1)

    changes = json.loads(changes_file.read_text())
    if not changes:
        print("No changes to document.")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"Generating changelog for {len(changes)} change(s)...")
    entry = generate_entry(changes, today)

    changelog_path = output_dir / "CHANGELOG.md"
    prepend_entry(entry, changelog_path)
    print(f"CHANGELOG.md updated:\n{entry}")


if __name__ == "__main__":
    main()
