"""Categories endpoints."""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from ..models import APIResponse

router = APIRouter(prefix="/categories", tags=["categories"])

# Path to the category mapping file
CATEGORY_FILE = Path(__file__).resolve().parents[3] / "data-pipeline" / "category_mapping.json"


def load_categories() -> List[Dict[str, Any]]:
    """Load categories from the JSON file."""
    try:
        with open(CATEGORY_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Category mapping file not found"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Invalid category mapping file"
        )


@router.get("/", response_model=APIResponse)
async def get_categories():
    """Get all available categories with their metadata."""
    categories = load_categories()

    return APIResponse(
        success=True,
        message="Categories retrieved successfully",
        data=categories
    )


@router.get("/metadata", response_model=APIResponse)
async def get_category_metadata():
    """Get category metadata formatted for frontend consumption."""
    categories = load_categories()

    # Transform to frontend-friendly format
    metadata = {}
    legacy_amenity_map = {}
    legacy_shop_map = {}

    for category in categories:
        class_name = category["class"]
        metadata[class_name] = {
            "label": category["label"],
            "icon": category["icon"]
        }

        # Build legacy mappings for backward compatibility
        for match in category.get("matches", []):
            if "=" in match:
                key, value = match.split("=", 1)
                if key == "amenity" and value != "*":
                    legacy_amenity_map[value] = class_name
                elif key == "shop" and value != "*":
                    legacy_shop_map[value] = class_name

    return APIResponse(
        success=True,
        message="Category metadata retrieved successfully",
        data={
            "categories": metadata,
            "legacy_mappings": {
                "amenity": legacy_amenity_map,
                "shop": legacy_shop_map
            }
        }
    )


@router.get("/{category_class}")
async def get_category_details(category_class: str):
    """Get detailed information about a specific category."""
    categories = load_categories()

    category = next(
        (cat for cat in categories if cat["class"] == category_class),
        None
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category_class}' not found"
        )

    return APIResponse(
        success=True,
        message="Category details retrieved successfully",
        data=category
    )