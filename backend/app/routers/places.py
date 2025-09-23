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
            func.ST_Transform(POI.location, 3857),  # Transform to Web Mercator for accurate distance
            func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857)
        ).label('distance')
    ).filter(
        func.ST_DWithin(
            func.ST_Transform(POI.location, 3857),
            func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857),
            request.radius
        )
    ).filter(POI.is_active == True)

    # Filter by category if provided
    if request.category:
        query = query.filter(POI.category == request.category)

    # Order by distance, apply offset and limit results
    query = query.order_by(func.ST_Distance(
        func.ST_Transform(POI.location, 3857),
        func.ST_Transform(func.ST_GeomFromText(f'POINT({request.lon} {request.lat})', 4326), 3857)
    )).offset(request.offset).limit(request.limit)

    results = query.all()

    # Convert to response format
    pois = []
    for poi, distance in results:
        poi_data = POIResponse(
            id=poi.id,
            osm_id=poi.osm_id,
            osm_type=poi.osm_type,
            name=poi.name,
            category=poi.category,
            subcategory=poi.subcategory,
            lat=db.execute(text(f"SELECT ST_Y(location) FROM pois WHERE id = {poi.id}")).scalar(),
            lon=db.execute(text(f"SELECT ST_X(location) FROM pois WHERE id = {poi.id}")).scalar(),
            address=poi.address,
            phone=poi.phone,
            website=poi.website,
            opening_hours=poi.opening_hours,
            tags=poi.tags if poi.tags else {},
            created_at=poi.created_at,
            updated_at=poi.updated_at,
            distance=round(distance, 1)  # Round to 1 decimal place
        )
        pois.append(poi_data)

    return pois

@router.get("/{poi_id}", response_model=POIResponse)
async def get_place_details(
    poi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific POI."""
    poi = db.query(POI).filter(POI.id == poi_id, POI.is_active == True).first()

    if not poi:
        raise HTTPException(status_code=404, detail="Place not found")

    # Get coordinates
    coords = db.execute(text(f"SELECT ST_X(location), ST_Y(location) FROM pois WHERE id = {poi.id}")).first()

    return POIResponse(
        id=poi.id,
        osm_id=poi.osm_id,
        osm_type=poi.osm_type,
        name=poi.name,
        category=poi.category,
        subcategory=poi.subcategory,
        lat=coords[1],
        lon=coords[0],
        address=poi.address,
        phone=poi.phone,
        website=poi.website,
        opening_hours=poi.opening_hours,
        tags=poi.tags if poi.tags else {},
        created_at=poi.created_at,
        updated_at=poi.updated_at
    )

@router.get("/categories/list")
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available POI categories."""
    categories = db.query(
        POI.category,
        func.count(POI.id).label('count')
    ).filter(POI.is_active == True).group_by(POI.category).all()

    return APIResponse(
        success=True,
        message="Categories retrieved successfully",
        data=[{"category": cat, "count": count} for cat, count in categories]
    )