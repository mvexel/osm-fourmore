#!/usr/bin/env python3
"""Generate TypeScript category metadata from category mapping JSON."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
OUTPUT_DIR = REPO_ROOT / "frontend" / "src" / "generated"
OUTPUT_FILE = OUTPUT_DIR / "category_metadata.tsx"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fourmore_shared.category_mapping import (
    CategoryMappingError,
    load_category_mapping,
    resolve_fallback_category,
    unique_icon_names,
)


def ts_string_literal(value: str) -> str:
    """Escape a string for TypeScript string literal."""
    escaped = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{escaped}'"


def generate_category_type(categories: List[Dict[str, Any]]) -> str:
    """Generate the CategoryKey union type."""
    category_keys = [ts_string_literal(cat["class"]) for cat in categories]
    return f"export type CategoryKey = {' | '.join(category_keys)}"


def generate_category_meta_object(categories: List[Dict[str, Any]]) -> str:
    """Generate the CATEGORY_META object."""
    lines = ["export const CATEGORY_META = {"]

    for category in categories:
        class_name = category["class"]
        label = ts_string_literal(category["label"])
        icon = category["icon"]

        lines.append(f"  {class_name}: {{ label: {label}, Icon: {icon} }},")

    lines.append("} as const")
    return "\n".join(lines)


def generate_typescript_file(categories: List[Dict[str, Any]]) -> str:
    """Generate the complete TypeScript file."""
    fallback_category = resolve_fallback_category(categories)
    fallback_icon = fallback_category["icon"]
    fallback_label = fallback_category["label"]

    icons = unique_icon_names(categories)
    ordered_icons = [fallback_icon] + [icon for icon in icons if icon != fallback_icon]
    icon_imports = ",\n  ".join(ordered_icons)

    content = f"""// This file is auto-generated from category_mapping.json
// Do not edit by hand. Update category_mapping.json and run generate_category_ts.py

import type {{ ComponentProps }} from 'react'
import {{
  {icon_imports},
}} from '@tabler/icons-react'

type IconProps = Partial<ComponentProps<typeof {ordered_icons[0]}>>
type IconComponent = typeof {ordered_icons[0]}

{generate_category_type(categories)}

type CategoryMeta = {{ label: string; Icon: IconComponent }}

{generate_category_meta_object(categories)}

const DEFAULT_META: CategoryMeta = {{ label: {ts_string_literal(fallback_label)}, Icon: {fallback_icon} }}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const humanize = (value: string) =>
  value
    .replace(/^amenity_/, '')
    .replace(/^shop_/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(' ')

const hasCategoryMeta = (className: string): className is CategoryKey =>
  Object.prototype.hasOwnProperty.call(CATEGORY_META, className)

const normalizeClassName = (className: string | undefined): string | undefined => {{
  if (!className) {{
    return undefined
  }}

  if (hasCategoryMeta(className)) {{
    return className
  }}
  
  return className
}}

const getCategoryMeta = (className: string | undefined): CategoryMeta | undefined => {{
  const normalized = normalizeClassName(className)
  if (normalized && hasCategoryMeta(normalized)) {{
    const meta = CATEGORY_META[normalized]
    return {{ label: meta.label, Icon: meta.Icon as IconComponent }}
  }}
  return undefined
}}

export const getCategoryIcon = (className: string, props: IconProps = {{}}) => {{
  const {{ size = 20, className: cssClass = '', color }} = props
  const iconProps: IconProps = {{ size, className: cssClass, color }}

  const meta = getCategoryMeta(className)
  const IconComponent: IconComponent = meta?.Icon ?? DEFAULT_META.Icon

  return <IconComponent {{...iconProps}} />
}}

export const getCategoryLabel = (className: string | undefined) => {{
  if (!className) {{
    return DEFAULT_META.label
  }}

  const meta = getCategoryMeta(className)

  if (meta) {{
    return meta.label
  }}

  if (className === 'misc') {{
    return DEFAULT_META.label
  }}

  return humanize(className)
}}
"""
    return content


def main() -> None:
    """Generate the TypeScript category metadata file."""
    print("Generating TypeScript category metadata...")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        categories = load_category_mapping()
    except CategoryMappingError as error:
        raise SystemExit(f"[generate_category_ts] {error}") from error

    # Generate TypeScript content
    ts_content = generate_typescript_file(categories)

    # Write to file
    OUTPUT_FILE.write_text(ts_content)

    print(f"Generated {OUTPUT_FILE}")
    print(f"Categories: {len(categories)}")


if __name__ == "__main__":
    main()
