"""Check-in endpoints."""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from ..db import get_db, CheckIn, POI, User
from ..auth import get_current_user
from ..models import CheckInCreate, CheckInResponse, CheckInListResponse, POIResponse, APIResponse

router = APIRouter(prefix="/checkins", tags=["checkins"])

@router.post("", response_model=CheckInResponse)
async def create_checkin(
    checkin_data: CheckInCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new check-in."""
    # Verify POI exists
    poi = db.query(POI).filter(POI.id == checkin_data.poi_id, POI.is_active == True).first()
    if not poi:
        raise HTTPException(status_code=404, detail="Place not found")

    # Create user location point if coordinates provided
    user_location = None
    if checkin_data.user_lat is not None and checkin_data.user_lon is not None:
        user_location = f'SRID=4326;POINT({checkin_data.user_lon} {checkin_data.user_lat})'

    # Create check-in
    checkin = CheckIn(
        user_id=current_user.id,
        poi_id=checkin_data.poi_id,
        user_location=user_location,
        comment=checkin_data.comment
    )

    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Return with POI details
    return get_checkin_with_poi(db, checkin)

@router.get("", response_model=CheckInListResponse)
async def get_user_checkins(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's check-in history."""
    # Calculate offset
    offset = (page - 1) * per_page

    # Get check-ins with valid POIs only
    checkins = db.query(CheckIn).join(POI, CheckIn.poi_id == POI.id).filter(
        CheckIn.user_id == current_user.id,
        POI.is_active == True
    ).order_by(desc(CheckIn.created_at)).offset(offset).limit(per_page).all()

    # Get total count of valid check-ins
    total = db.query(CheckIn).join(POI, CheckIn.poi_id == POI.id).filter(
        CheckIn.user_id == current_user.id,
        POI.is_active == True
    ).count()

    # Convert to response format with POI details
    checkin_responses = [get_checkin_with_poi(db, checkin) for checkin in checkins]

    return CheckInListResponse(
        checkins=checkin_responses,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/{checkin_id}", response_model=CheckInResponse)
async def get_checkin_details(
    checkin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific check-in."""
    checkin = db.query(CheckIn).filter(
        CheckIn.id == checkin_id,
        CheckIn.user_id == current_user.id
    ).first()

    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")

    return get_checkin_with_poi(db, checkin)

@router.delete("/{checkin_id}")
async def delete_checkin(
    checkin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a check-in."""
    checkin = db.query(CheckIn).filter(
        CheckIn.id == checkin_id,
        CheckIn.user_id == current_user.id
    ).first()

    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")

    db.delete(checkin)
    db.commit()

    return APIResponse(
        success=True,
        message="Check-in deleted successfully"
    )

@router.get("/stats/summary")
async def get_checkin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's check-in statistics."""
    total_checkins = db.query(CheckIn).filter(CheckIn.user_id == current_user.id).count()

    unique_places = db.query(func.count(func.distinct(CheckIn.poi_id))).filter(
        CheckIn.user_id == current_user.id
    ).scalar()

    # Get most visited category
    category_stats = db.query(
        POI.category,
        func.count(CheckIn.id).label('count')
    ).join(CheckIn, POI.id == CheckIn.poi_id).filter(
        CheckIn.user_id == current_user.id
    ).group_by(POI.category).order_by(desc('count')).first()

    favorite_category = category_stats[0] if category_stats else None

    # Get first check-in date
    first_checkin = db.query(CheckIn).filter(
        CheckIn.user_id == current_user.id
    ).order_by(CheckIn.created_at).first()

    return APIResponse(
        success=True,
        message="Check-in statistics retrieved",
        data={
            "total_checkins": total_checkins,
            "unique_places": unique_places,
            "favorite_category": favorite_category,
            "member_since": first_checkin.created_at if first_checkin else None
        }
    )

def get_checkin_with_poi(db: Session, checkin: CheckIn) -> CheckInResponse:
    """Helper function to get checkin with POI details."""
    poi = db.query(POI).filter(POI.id == checkin.poi_id).first()

    if not poi:
        raise HTTPException(status_code=404, detail="Associated place not found")

    # Get POI coordinates
    from sqlalchemy import text
    coords = db.execute(text(f"SELECT ST_X(location), ST_Y(location) FROM pois WHERE id = {poi.id}")).first()

    poi_response = POIResponse(
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

    return CheckInResponse(
        id=checkin.id,
        poi_id=checkin.poi_id,
        user_id=checkin.user_id,
        comment=checkin.comment,
        created_at=checkin.created_at,
        poi=poi_response
    )