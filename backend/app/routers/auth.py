"""Authentication endpoints."""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import (
    OSMAuth,
    create_access_token,
    create_or_update_user,
    user_is_whitelisted,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..models import AuthCallback, Token, APIResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/login")
async def login():
    """Get OSM OAuth login URL."""
    auth_url = OSMAuth.get_authorization_url()
    return APIResponse(
        success=True,
        message="OAuth authorization URL generated",
        data={"auth_url": auth_url},
    )


@router.get("/callback", response_model=Token)
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """Handle OAuth callback and create user session."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        logger.debug(f"Auth callback received with code: {code[:10]}...")

        # Exchange code for token
        token_data = await OSMAuth.exchange_code_for_token(code)
        logger.debug(
            f"Token exchange successful, got token: {token_data.get('access_token', '')[:10]}..."
        )
        access_token = token_data["access_token"]

        # Get user info from OSM
        osm_user_data = await OSMAuth.get_user_info(access_token)
        logger.info(
            f"User data retrieved: {osm_user_data.get('user', {}).get('display_name', 'unknown')}"
        )

        if not user_is_whitelisted(osm_user_data):
            user_info = osm_user_data.get("user", {})
            logger.warning(
                "OSM user %s (ID %s) attempted login but is not whitelisted",
                user_info.get("display_name"),
                user_info.get("id"),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "waitlist_required",
                    "email": "mvexel@gmail.com",
                    "message": (
                        "Thanks for your interest! We're inviting people in waves. "
                        "Email mvexel@gmail.com and we'll add you to the waitlist."
                    ),
                },
            )

        # Create or update user in our database (store OSM token for API writes)
        user = create_or_update_user(db, osm_user_data, access_token)

        # Create JWT token for our app
        access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": user.osm_user_id, "username": user.username},
            expires_delta=access_token_expires,
        )

        logger.debug(f"JWT token created successfully for user: {user.username}")
        return Token(
            access_token=jwt_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth callback failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}",
        )
