#!/usr/bin/env python3
"""Generate the lua POI mapping from category metadata."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Sequence, Tuple, Union

ROOT = Path(__file__).resolve().parents[1]
CATEGORY_FILE = ROOT / "category_mapping.json"
OUTPUT_FILE = ROOT / "poi_mapping.lua"


def lua_quote(value: str) -> str:
    """Wrap a string for use in Lua source."""
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def normalize_match(match: Union[str, Sequence[Sequence[str]], Sequence[str]]) -> Sequence[Tuple[str, str]]:
    if isinstance(match, str):
        parts = [segment.strip() for segment in match.split('&') if segment.strip()]
        normalized = []
        for part in parts:
            if '=' not in part:
                raise ValueError(f"Match segment '{part}' must be in key=value form")
            key, value = part.split('=', 1)
            normalized.append((key, value))
        return tuple(normalized)

    if match and isinstance(match[0], (list, tuple)):
        return tuple((str(key), str(value)) for key, value in match)  # type: ignore[arg-type]

    if match and isinstance(match[0], str):
        normalized = []
        for part in match:  # type: ignore[arg-type]
            if '=' not in part:
                raise ValueError(f"Match segment '{part}' must be in key=value form")
            key, value = part.split('=', 1)
            normalized.append((key, value))
        return tuple(normalized)

    raise TypeError(f"Unsupported match format: {match!r}")


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
    categories = json.loads(CATEGORY_FILE.read_text())

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
