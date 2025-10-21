#!/usr/bin/env python3
"""Validate the canonical category mapping."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fourmore_shared.category_mapping import CategoryMappingError, load_category_mapping


def main() -> None:
    """Validate the mapping and report the result."""
    try:
        categories = load_category_mapping()
    except CategoryMappingError as error:
        print(f"Category mapping validation failed: {error}")
        raise SystemExit(1)

    print(f"Category mapping validated successfully ({len(categories)} categories)")


if __name__ == "__main__":
    main()
