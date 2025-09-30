"""OSM editing endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, field_validator

from ..models import POIResponse, osm_type_validator_to_short
from ..db import get_db, User, POI
from ..auth import get_current_user
from ..osm_api import OSMAPIClient

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/osm", tags=["osm-edits"])


class ConfirmInfoRequest(BaseModel):
    poi_osm_type: str
    poi_osm_id: int

    @field_validator('poi_osm_type')
    @classmethod
    def serialize_osm_type(cls, v: str) -> str:
        return osm_type_validator_to_short(v)



class OSMEditResponse(BaseModel):
    success: bool
    osm_id: int
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
    poi = db.query(POI).filter(POI.osm_type == request.poi_osm_type, POI.osm_id == request.poi_osm_id).first()
    logger.info(f"User {current_user.username} is confirming info for POI {request.poi_osm_type}/{request.poi_osm_id}")
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )

    osm_client = OSMAPIClient(current_user.osm_access_token)

    try:
        poi_data = POIResponse.model_validate(poi)
        logger.info(f"Adding/updating check_date tag for OSM element {poi.osm_type}/{poi.osm_id}")
        result = await osm_client.add_check_date(poi=poi_data)

        logger.info(f"Result from add_check_date: {result}")

        if poi.tags is None:
            poi.tags = {}
        poi.tags['check_date'] = result['check_date']
        poi.version = result['new_version']
        db.commit()

        logger.info("About to create OSMEditResponse")

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
        logger.error(f"Failed to update OSM element: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update OSM: {str(e)}"
        )


class NoteRequest(BaseModel):
    poi_osm_type: str
    poi_osm_id: int
    text: str


class NoteResponse(BaseModel):
    success: bool
    note_id: int
    message: str


@router.post("/note", response_model=NoteResponse)
async def create_osm_note(
    request: NoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a note in OpenStreetMap."""

    poi = db.query(POI).filter(POI.osm_type == request.poi_osm_type, POI.osm_id == request.poi_osm_id).first()
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )

    osm_client = OSMAPIClient(current_user.osm_access_token)

    try:
        logger.info(f"Creating OSM note at lat={poi.lat}, lon={poi.lon}, text='{request.text}'")
        note_id = await osm_client.create_note(
            lat=poi.lat,
            lon=poi.lon,
            text=request.text
        )
        logger.info(f"Successfully created OSM note with ID: {note_id}")

        return NoteResponse(
            success=True,
            note_id=note_id,
            message="Successfully created OSM note."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create OSM note: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create OSM note: {str(e)}"
        )