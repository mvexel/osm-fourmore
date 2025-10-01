#!/usr/bin/env python3
"""Generate TypeScript category metadata from category mapping JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Any

ROOT = Path(__file__).resolve().parents[1]
CATEGORY_FILE = ROOT / "category_mapping.json"
OUTPUT_DIR = ROOT.parent / "frontend" / "src" / "generated"
OUTPUT_FILE = OUTPUT_DIR / "category_metadata.tsx"


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


def generate_legacy_mappings(categories: List[Dict[str, Any]]) -> str:
    """Generate legacy OSM tag to category mappings."""
    amenity_mappings = {}
    shop_mappings = {}

    for category in categories:
        class_name = category["class"]
        for match in category.get("matches", []):
            if "=" in match:
                key, value = match.split("=", 1)
                if key == "amenity":
                    amenity_mappings[value] = class_name
                elif key == "shop":
                    shop_mappings[value] = class_name

    # Generate amenity mappings
    amenity_lines = ["export const LEGACY_AMENITY_TO_CATEGORY: Record<string, CategoryKey> = {"]
    for amenity, category in sorted(amenity_mappings.items()):
        if amenity != "*":  # Skip wildcard entries
            amenity_lines.append(f"  {ts_string_literal(amenity)}: {ts_string_literal(category)},")
    amenity_lines.append("}")

    # Generate shop mappings
    shop_lines = ["export const LEGACY_SHOP_TO_CATEGORY: Record<string, CategoryKey> = {"]
    for shop, category in sorted(shop_mappings.items()):
        if shop != "*":  # Skip wildcard entries
            shop_lines.append(f"  {ts_string_literal(shop)}: {ts_string_literal(category)},")
    shop_lines.append("}")

    return "\n\n".join(["\n".join(amenity_lines), "\n".join(shop_lines)])


def generate_typescript_file(categories: List[Dict[str, Any]]) -> str:
    """Generate the complete TypeScript file."""
    # Get unique icons used
    icons = sorted(set(cat["icon"] for cat in categories))
    icon_imports = ",\n  ".join(icons)

    content = f'''// This file is auto-generated from category_mapping.json
// Do not edit by hand. Update category_mapping.json and run generate_category_ts.py

import type {{ ComponentProps }} from 'react'
import {{
  {icon_imports},
}} from '@tabler/icons-react'

type IconProps = Partial<ComponentProps<typeof {icons[0]}>>
type IconComponent = typeof {icons[0]}

{generate_category_type(categories)}

type CategoryMeta = {{ label: string; Icon: IconComponent }}

{generate_category_meta_object(categories)}

{generate_legacy_mappings(categories)}

const DEFAULT_META: CategoryMeta = {{ label: 'Other', Icon: {icons[0]} }}

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

  if (className.startsWith('amenity_')) {{
    const amenityType = className.replace('amenity_', '')
    return LEGACY_AMENITY_TO_CATEGORY[amenityType] ?? className
  }}

  if (className.startsWith('shop_')) {{
    const shopType = className.replace('shop_', '')
    return LEGACY_SHOP_TO_CATEGORY[shopType] ?? className
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
'''
    return content


def main() -> None:
    """Generate the TypeScript category metadata file."""
    print("Generating TypeScript category metadata...")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load categories
    categories = json.loads(CATEGORY_FILE.read_text())

    # Generate TypeScript content
    ts_content = generate_typescript_file(categories)

    # Write to file
    OUTPUT_FILE.write_text(ts_content)

    print(f"Generated {OUTPUT_FILE}")
    print(f"Categories: {len(categories)}")


if __name__ == "__main__":
    main()