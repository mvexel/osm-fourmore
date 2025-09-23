"""Authentication endpoints."""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db import get_db
from ..auth import OSMAuth, create_access_token, create_or_update_user, JWT_ACCESS_TOKEN_EXPIRE_MINUTES
from ..models import AuthCallback, Token, APIResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.get("/login")
async def login():
    """Get OSM OAuth login URL."""
    auth_url = OSMAuth.get_authorization_url()
    return APIResponse(
        success=True,
        message="OAuth authorization URL generated",
        data={"auth_url": auth_url}
    )

@router.post("/callback", response_model=Token)
async def auth_callback(callback_data: AuthCallback, db: Session = Depends(get_db)):
    """Handle OAuth callback and create user session."""
    try:
        # Exchange code for token
        token_data = await OSMAuth.exchange_code_for_token(callback_data.code)
        access_token = token_data["access_token"]

        # Get user info from OSM
        osm_user_data = await OSMAuth.get_user_info(access_token)

        # Create or update user in our database
        user = create_or_update_user(db, osm_user_data)

        # Create JWT token for our app
        access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": user.osm_user_id, "username": user.username},
            expires_delta=access_token_expires
        )

        return Token(
            access_token=jwt_token,
            token_type="bearer",
            user=user
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )