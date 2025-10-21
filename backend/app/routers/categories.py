"""Categories endpoints."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from ..models import APIResponse

router = APIRouter(prefix="/categories", tags=["categories"])

REPO_ROOT = Path(__file__).resolve().parents[3]

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fourmore_shared.category_mapping import (
    CategoryMappingError,
    load_category_mapping,
)


def load_categories() -> List[Dict[str, Any]]:
    """Load categories from the canonical mapping file."""
    try:
        return load_category_mapping()
    except CategoryMappingError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/", response_model=APIResponse)
async def get_categories():
    """Get all available categories with their metadata."""
    categories = load_categories()

    return APIResponse(
        success=True, message="Categories retrieved successfully", data=categories
    )


@router.get("/metadata", response_model=APIResponse)
async def get_category_metadata():
    """Get category metadata formatted for frontend consumption."""
    categories = load_categories()

    # Transform to frontend-friendly format
    metadata: Dict[str, Dict[str, Any]] = {}

    for category in categories:
        class_name = category["class"]
        metadata[class_name] = {"label": category["label"], "icon": category["icon"]}

    return APIResponse(
        success=True,
        message="Category metadata retrieved successfully",
        data={
            "categories": metadata,
        },
    )


@router.get("/{category_class}")
async def get_category_details(category_class: str):
    """Get detailed information about a specific category."""
    categories = load_categories()

    category = next((cat for cat in categories if cat["class"] == category_class), None)

    if not category:
        raise HTTPException(
            status_code=404, detail=f"Category '{category_class}' not found"
        )

    return APIResponse(
        success=True, message="Category details retrieved successfully", data=category
    )
