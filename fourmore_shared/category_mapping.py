"""Category mapping utilities for Fourmore data pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import (
    Any,
    Dict,
    Iterable,
    List,
    Mapping,
    MutableMapping,
    Sequence,
    Tuple,
    Union,
)


class CategoryMappingError(RuntimeError):
    """Raised when the category mapping file is malformed."""


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MAPPING_PATH = REPO_ROOT / "data-pipeline" / "category_mapping.json"

MatchInput = Union[str, Sequence[str], Sequence[Sequence[str]]]
NormalizedMatch = Tuple[Tuple[str, str], ...]


def normalize_match(match: MatchInput) -> NormalizedMatch:
    """Normalize a match definition into a tuple of (key, value) pairs."""
    if isinstance(match, str):
        parts = [segment.strip() for segment in match.split("&") if segment.strip()]
        normalized: List[Tuple[str, str]] = []
        for part in parts:
            if "=" not in part:
                raise CategoryMappingError(
                    f"Match segment '{part}' must be in key=value form"
                )
            key, value = part.split("=", 1)
            normalized.append((key.strip(), value.strip()))
        return tuple(normalized)

    if (
        isinstance(match, (list, tuple))
        and match
        and isinstance(match[0], (list, tuple))
    ):
        normalized = []
        for pair in match:
            if len(pair) != 2:
                raise CategoryMappingError(
                    f"Match pair {pair!r} must have exactly two elements"
                )
            key, value = pair
            normalized.append((str(key).strip(), str(value).strip()))
        return tuple(normalized)

    if isinstance(match, (list, tuple)) and match and isinstance(match[0], str):
        normalized = []
        for part in match:
            if "=" not in part:
                raise CategoryMappingError(
                    f"Match segment '{part}' must be in key=value form"
                )
            key, value = str(part).split("=", 1)
            normalized.append((key.strip(), value.strip()))
        return tuple(normalized)

    raise CategoryMappingError(f"Unsupported match format: {match!r}")


def iter_normalized_matches(category: Mapping[str, Any]) -> Iterable[NormalizedMatch]:
    """Yield normalized matches for a category in a deterministic order."""
    for match in category.get("matches", []) or []:
        yield normalize_match(match)


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise CategoryMappingError(message)


def validate_category_mapping(categories: Any) -> None:
    """Validate the structure and contents of the category mapping."""
    _expect(isinstance(categories, list), "Category mapping must be a list")

    seen_classes: set[str] = set()
    fallback_flags = 0

    for index, category in enumerate(categories):
        _expect(
            isinstance(category, dict), f"Category at index {index} must be an object"
        )

        for field in ("class", "label", "icon"):
            _expect(
                field in category,
                f"Category at index {index} missing required field '{field}'",
            )
            _expect(
                isinstance(category[field], str) and category[field].strip(),
                f"Category '{category.get('class', index)}' field '{field}' must be a non-empty string",
            )

        class_name = category["class"]
        _expect(
            class_name not in seen_classes, f"Duplicate category class '{class_name}'"
        )
        seen_classes.add(class_name)

        matches = category.get("matches", [])
        _expect(
            matches is None or isinstance(matches, list),
            f"Category '{class_name}' field 'matches' must be a list if provided",
        )

        if matches:
            for match in matches:
                normalize_match(match)

        if category.get("is_fallback"):
            fallback_flags += 1

    _expect(len(seen_classes) > 0, "Category mapping must contain at least one entry")
    _expect(
        fallback_flags == 1,
        "Category mapping must define exactly one fallback category (is_fallback=true)",
    )


def load_category_mapping(path: Union[str, Path, None] = None) -> List[Dict[str, Any]]:
    """Load and validate the category mapping JSON."""
    target_path = Path(path) if path else DEFAULT_MAPPING_PATH
    try:
        categories = json.loads(target_path.read_text())
    except FileNotFoundError as exc:
        raise CategoryMappingError(
            f"Category mapping file not found: {target_path}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise CategoryMappingError(
            f"Category mapping file is not valid JSON: {target_path}"
        ) from exc

    validate_category_mapping(categories)
    return categories


def unique_icon_names(categories: Sequence[Mapping[str, Any]]) -> List[str]:
    """Return sorted unique icon component names used across categories."""
    icons = {str(category["icon"]) for category in categories}
    return sorted(icons)


def resolve_fallback_category(
    categories: Sequence[Mapping[str, Any]],
) -> Mapping[str, Any]:
    """Return the single fallback category defined in the mapping."""
    fallback_candidates = [
        category for category in categories if category.get("is_fallback")
    ]
    if not fallback_candidates:
        raise CategoryMappingError("No fallback category marked with is_fallback=true")
    if len(fallback_candidates) > 1:
        raise CategoryMappingError(
            "Multiple categories marked with is_fallback=true; expected exactly one"
        )
    return fallback_candidates[0]
