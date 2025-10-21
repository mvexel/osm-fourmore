#!/usr/bin/env python3
"""Generate the lua POI mapping from category metadata."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable, Sequence, Tuple

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
OUTPUT_FILE = ROOT / "poi_mapping.lua"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fourmore_shared.category_mapping import (
    CategoryMappingError,
    load_category_mapping,
    normalize_match,
)


def lua_quote(value: str) -> str:
    """Wrap a string for use in Lua source."""
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def format_match(match: Sequence[Tuple[str, str]]) -> str:
    pairs = ", ".join(f"{{{lua_quote(key)}, {lua_quote(val)}}}" for key, val in match)
    return f"            {{ {pairs} }},"


def render_entry(entry: dict) -> Iterable[str]:
    yield "    {"
    yield f"        class = {lua_quote(entry['class'])},"
    yield f"        label = {lua_quote(entry['label'])},"
    yield f"        icon = {lua_quote(entry['icon'])},"
    yield "        matches = {"
    for match in entry.get("matches", []):
        normalized = normalize_match(match)
        yield format_match(normalized)
    yield "        },"
    yield "    },"


def main() -> None:
    try:
        categories = load_category_mapping()
    except CategoryMappingError as error:
        raise SystemExit(f"[generate_poi_mapping] {error}") from error

    lines = [
        "-- POI category mapping generated from category_mapping.json",
        "-- Do not edit by hand. Update category_mapping.json and rerun generate_poi_mapping.py",
        "local poi_mapping = {",
    ]

    for entry in categories:
        lines.extend(render_entry(entry))

    lines.append("}")
    lines.append("")
    lines.append("return poi_mapping")

    OUTPUT_FILE.write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
