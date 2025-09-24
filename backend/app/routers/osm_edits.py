"""OSM editing endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db import get_db, User, POI
from ..auth import get_current_user
from ..osm_api import OSMAPIClient


router = APIRouter(prefix="/osm", tags=["osm-edits"])


class ConfirmInfoRequest(BaseModel):
    poi_id: int


class OSMEditResponse(BaseModel):
    success: bool
    osm_id: str
    osm_type: str
    changeset_id: str
    new_version: int
    check_date: str
    message: str


@router.post("/confirm-info", response_model=OSMEditResponse)
async def confirm_poi_info(
    request: ConfirmInfoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm POI information is correct by adding check_date tag."""
    if not current_user.osm_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OSM access token not available. Please re-authenticate."
        )

    poi = db.query(POI).filter(POI.id == request.poi_id).first()
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )

    osm_client = OSMAPIClient(current_user.osm_access_token)

    try:
        result = await osm_client.add_check_date(
            osm_id=poi.osm_id,
            osm_type=poi.osm_type
        )

        if poi.tags is None:
            poi.tags = {}
        poi.tags['check_date'] = result['check_date']
        if poi.osm_version:
            poi.osm_version = result['new_version']
        db.commit()

        return OSMEditResponse(
            success=True,
            osm_id=result['osm_id'],
            osm_type=result['osm_type'],
            changeset_id=result['changeset_id'],
            new_version=result['new_version'],
            check_date=result['check_date'],
            message=f"Thanks for confirming! This helps keep OpenStreetMap up to date."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update OSM: {str(e)}"
        )