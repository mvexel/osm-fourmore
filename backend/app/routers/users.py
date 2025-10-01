"""User endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db, User, CheckIn, QuestResponse
from ..auth import get_current_user
from ..models import APIResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.delete("/delete")
async def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user account and all associated data."""
    # Delete all user's quest responses
    db.query(QuestResponse).filter(QuestResponse.poi_osm_id.in_(
        db.query(CheckIn.poi_osm_id).filter(CheckIn.user_id == current_user.id)
    )).delete(synchronize_session=False)

    # Delete all user's checkins
    db.query(CheckIn).filter(CheckIn.user_id == current_user.id).delete()

    # Delete user account
    db.delete(current_user)

    db.commit()

    return APIResponse(
        success=True,
        message="Account and all associated data deleted successfully"
    )
