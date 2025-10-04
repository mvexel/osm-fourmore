"""Quest endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db, User, POI, QuestResponse
from ..auth import get_current_user
from ..models import (
    NormalizeOsmType,
    POIResponse,
    QuestApplicableListResponse,
    QuestApplicableResponse,
    QuestRespondRequest,
    QuestRespondResponse,
)
from ..quests import get_applicable_quests, get_quest_by_id
from ..osm_api import OSMAPIClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quests", tags=["quests"])


@router.get(
    "/applicable/{osm_type}/{osm_id}", response_model=QuestApplicableListResponse
)
async def get_applicable_quests_for_poi(
    osm_id: int,
    db: Session = Depends(get_db),
    osm_type: str = Depends(NormalizeOsmType),
    current_user: User = Depends(get_current_user),
):
    """
    Get applicable quests for a POI.
    Fetches fresh OSM data to check tag conditions.
    """

    user_settings = getattr(current_user, "settings", {}) or {}
    participate_in_quests = user_settings.get("participate_in_quests", True)

    if not participate_in_quests:
        logger.info(
            "User %s opted out of quests; returning empty quest list",
            current_user.id,
        )
        return QuestApplicableListResponse(quests=[], total=0)

    # Get POI from database (for poi_class)
    poi = db.query(POI).filter(POI.osm_type == osm_type, POI.osm_id == osm_id).first()

    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="POI not found"
        )

    # Fetch fresh OSM data
    logger.info(
        f"Fetching OSM data for {osm_type}/{osm_id} to determine applicable quests"
    )
    osm_client = OSMAPIClient(current_user.osm_access_token)

    try:
        element_data = await osm_client.get_element(osm_id, osm_type)
        osm_tags = element_data.get("tags", {})
        logger.info(
            f"OSM data fetched successfully for {osm_type}/{osm_id}, tags: {osm_tags}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch OSM data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch OSM data",
        )

    # Get applicable quests
    logger.info(f"Fetching applicable quests for {osm_type}/{osm_id}")
    applicable_quests = get_applicable_quests(
        poi_osm_type=osm_type,
        poi_osm_id=osm_id,
        poi_class=poi.poi_class,
        osm_tags=osm_tags,
        db=db,
        max_quests=3,
    )

    logger.info(
        f"Found {len(applicable_quests)} applicable quests for {osm_type}/{osm_id}"
    )
    # Convert to response format
    quest_responses = [
        QuestApplicableResponse(id=quest.id, question=quest.question)
        for quest in applicable_quests
    ]

    logger.info(
        f"Returning {len(quest_responses)} applicable quests for {osm_type}/{osm_id}"
    )
    return QuestApplicableListResponse(
        quests=quest_responses, total=len(quest_responses)
    )


@router.post("/respond", response_model=QuestRespondResponse)
async def respond_to_quest(
    request: QuestRespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Respond to a quest by submitting an answer.
    Updates OSM with the appropriate tags and records the response.
    """
    # Validate quest exists
    quest = get_quest_by_id(request.quest_id)
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quest not found: {request.quest_id}",
        )

    # Validate answer
    if request.answer not in quest.answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid answer. Must be one of: {', '.join(quest.answers.keys())}",
        )

    # Get POI from database
    poi = (
        db.query(POI)
        .filter(POI.osm_type == request.poi_osm_type, POI.osm_id == request.poi_osm_id)
        .first()
    )

    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="POI not found"
        )

    # Check if quest was already answered for this POI
    existing_response = (
        db.query(QuestResponse)
        .filter(
            QuestResponse.poi_osm_type == request.poi_osm_type,
            QuestResponse.poi_osm_id == request.poi_osm_id,
            QuestResponse.quest_id == request.quest_id,
        )
        .first()
    )

    if existing_response:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This quest has already been answered for this POI",
        )

    # Get tags to apply based on answer
    tags_to_apply = quest.get_tags_for_answer(request.answer)

    # Update OSM
    osm_client = OSMAPIClient(current_user.osm_access_token)
    changeset_id = None

    try:
        poi_data = POIResponse.model_validate(poi)
        changeset_comment = f"Quest: {quest.question} Answer: {request.answer.capitalize()} (via FourMore)"

        result = await osm_client.update_element_tags(
            poi=poi_data, new_tags=tags_to_apply, changeset_comment=changeset_comment
        )

        changeset_id = result["changeset_id"]
        logger.info(f"Successfully updated OSM: changeset {changeset_id}")

    except Exception as e:
        logger.error(f"Failed to update OSM: {e}")
        # Continue to record response even if OSM update fails

    # Record quest response in database
    quest_response = QuestResponse(
        poi_osm_type=request.poi_osm_type,
        poi_osm_id=request.poi_osm_id,
        quest_id=request.quest_id,
        answer=request.answer,
        osm_changeset_id=changeset_id,
    )

    db.add(quest_response)
    db.commit()

    if changeset_id:
        return QuestRespondResponse(
            success=True,
            changeset_id=changeset_id,
            message="Thank you for contributing to OpenStreetMap!",
        )
    else:
        return QuestRespondResponse(
            success=False,
            changeset_id=None,
            message="Failed to update OpenStreetMap. Please try again.",
        )
