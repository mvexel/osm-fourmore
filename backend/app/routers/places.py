"""Places/POI endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from ..db import get_db, POI
from ..auth import get_current_user, User
from ..models import POIResponse, POINearbyRequest, APIResponse

router = APIRouter(prefix="/places", tags=["places"])

@router.post("/nearby", response_model=List[POIResponse])
async def get_nearby_places(
    request: POINearbyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get POIs near a given location."""
    # Build the spatial query
    # ST_DWithin uses meters when using geography type
    query = db.query(
        POI,
        func.ST_Distance(
            func.ST_Transform(POI.geom, 3857),  # Transform to Web Mercator for accurate distance
            func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857)
        ).label('distance')
    ).filter(
        func.ST_DWithin(
            func.ST_Transform(POI.geom, 3857),
            func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857),
            request.radius
        )
    )

    # Filter by class if provided
    if request.poi_class:
        query = query.filter(POI.poi_class == request.poi_class)

    # Order by distance, apply offset and limit results
    query = query.order_by(func.ST_Distance(
        func.ST_Transform(POI.geom, 3857),
        func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857)
    )).offset(request.offset).limit(request.limit)

    results = query.all()

    # Convert to response format
    pois = []
    for poi, distance in results:
        poi_data = POIResponse.model_validate(poi)
        poi_data.distance = round(distance, 1)  # Round to 1 decimal place
        pois.append(poi_data)

    return pois

@router.get("/{osm_type}/{osm_id}", response_model=POIResponse)
async def get_place_details(
    osm_type: str,
    osm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific POI."""
    poi = db.query(POI).filter(POI.osm_type == osm_type, POI.osm_id == osm_id).first()

    if not poi:
        raise HTTPException(status_code=404, detail="Place not found")

    return POIResponse.model_validate(poi)

@router.get("/classes/list")
async def get_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available POI classes."""
    classes = db.query(
        POI.poi_class,
        func.count().label('count')
    ).group_by(POI.poi_class).all()

    return APIResponse(
        success=True,
        message="Classes retrieved successfully",
        data=[{"class": cls, "count": count} for cls, count in classes]
    )