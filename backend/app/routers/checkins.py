"""Check-in endpoints."""

from typing import List
from datetime import datetime
from io import StringIO
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
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
    poi = db.query(POI).filter(
        POI.osm_type == checkin_data.poi_osm_type,
        POI.osm_id == checkin_data.poi_osm_id
    ).first()
    if not poi:
        raise HTTPException(status_code=404, detail="Place not found")

    # Create user location point if coordinates provided
    user_location = None
    if checkin_data.user_lat is not None and checkin_data.user_lon is not None:
        user_location = f'SRID=4326;POINT({checkin_data.user_lon} {checkin_data.user_lat})'

    # Create check-in
    checkin = CheckIn(
        user_id=current_user.id,
        poi_osm_type=checkin_data.poi_osm_type,
        poi_osm_id=checkin_data.poi_osm_id,
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
    checkins = db.query(CheckIn).join(
        POI,
        (CheckIn.poi_osm_type == POI.osm_type) & (CheckIn.poi_osm_id == POI.osm_id)
    ).filter(
        CheckIn.user_id == current_user.id
    ).order_by(desc(CheckIn.created_at)).offset(offset).limit(per_page).all()

    # Get total count of valid check-ins
    total = db.query(CheckIn).join(
        POI,
        (CheckIn.poi_osm_type == POI.osm_type) & (CheckIn.poi_osm_id == POI.osm_id)
    ).filter(
        CheckIn.user_id == current_user.id
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

    unique_places = db.query(func.count(func.distinct(func.concat(CheckIn.poi_osm_type, CheckIn.poi_osm_id)))).filter(
        CheckIn.user_id == current_user.id
    ).scalar()

    # Get most visited class
    class_stats = db.query(
        POI.poi_class,
        func.count(CheckIn.id).label('count')
    ).join(
        CheckIn,
        (POI.osm_type == CheckIn.poi_osm_type) & (POI.osm_id == CheckIn.poi_osm_id)
    ).filter(
        CheckIn.user_id == current_user.id
    ).group_by(POI.poi_class).order_by(desc('count')).first()

    favorite_class = class_stats[0] if class_stats else None

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
            "favorite_class": favorite_class,
            "member_since": first_checkin.created_at if first_checkin else None
        }
    )

@router.get("/export/csv")
async def export_checkins_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all user checkins as CSV."""
    # Get all checkins with POI details
    checkins = db.query(CheckIn, POI).join(
        POI,
        (CheckIn.poi_osm_type == POI.osm_type) & (CheckIn.poi_osm_id == POI.osm_id)
    ).filter(
        CheckIn.user_id == current_user.id
    ).order_by(desc(CheckIn.created_at)).all()

    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(['datetime', 'osm_type', 'osm_id', 'name'])

    # Write data rows
    for checkin, poi in checkins:
        osm_type_full = {"N": "node", "W": "way"}.get(checkin.poi_osm_type, checkin.poi_osm_type)
        writer.writerow([
            checkin.created_at.isoformat(),
            osm_type_full,
            checkin.poi_osm_id,
            poi.name or ''
        ])

    # Prepare response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=fourmore_checkins_{current_user.username}.csv"
        }
    )

def get_checkin_with_poi(db: Session, checkin: CheckIn) -> CheckInResponse:
    """Helper function to get checkin with POI details."""
    poi = db.query(POI).filter(
        POI.osm_type == checkin.poi_osm_type,
        POI.osm_id == checkin.poi_osm_id
    ).first()

    if not poi:
        raise HTTPException(status_code=404, detail="Associated place not found")

    # Create CheckInResponse with POI included
    return CheckInResponse(
        id=checkin.id,
        poi_osm_type=checkin.poi_osm_type,
        poi_osm_id=checkin.poi_osm_id,
        user_id=checkin.user_id,
        created_at=checkin.created_at,
        comment=checkin.comment,
        poi=POIResponse.model_validate(poi)
    )