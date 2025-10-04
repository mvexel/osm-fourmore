"""Current user endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db, User, CheckIn, QuestResponse
from ..auth import get_current_user
from ..models import APIResponse, UserSettingsUpdate, UserResponse

router = APIRouter(prefix="/me", tags=["current-user"])


@router.get("")
async def get_current_user_info(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return current_user


@router.patch("/settings", response_model=UserResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user settings stored in JSONB field.
    Only provided fields will be updated, preserving existing settings.
    """
    # Get current settings or initialize empty dict
    settings_value = getattr(current_user, "settings", None)
    current_settings: dict = dict(settings_value) if settings_value else {}

    # Update only the fields that were provided in the request
    updated = False

    if settings_update.expert is not None:
        current_settings["expert"] = settings_update.expert
        updated = True

    if settings_update.theme is not None:
        current_settings["theme"] = settings_update.theme
        updated = True

    if settings_update.notifications is not None:
        current_settings["notifications"] = settings_update.notifications
        updated = True

    if settings_update.participate_in_quests is not None:
        current_settings["participate_in_quests"] = (
            settings_update.participate_in_quests
        )
        updated = True

    if settings_update.display_name is not None:
        setattr(current_user, "display_name", settings_update.display_name)
        updated = True

    # Update settings and timestamp if any changes were made
    if updated:
        setattr(current_user, "settings", current_settings)
        setattr(current_user, "updated_at", datetime.utcnow())
        db.commit()
        db.refresh(current_user)

    return current_user


@router.delete("")
async def delete_account(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Delete user account and all associated data."""
    # Delete all user's quest responses
    db.query(QuestResponse).filter(
        QuestResponse.poi_osm_id.in_(
            db.query(CheckIn.poi_osm_id).filter(CheckIn.user_id == current_user.id)
        )
    ).delete(synchronize_session=False)

    # Delete all user's checkins
    db.query(CheckIn).filter(CheckIn.user_id == current_user.id).delete()

    # Delete user account
    db.delete(current_user)

    db.commit()

    return APIResponse(
        success=True, message="Account and all associated data deleted successfully"
    )
