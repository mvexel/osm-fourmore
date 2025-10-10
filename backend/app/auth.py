"""OSM OAuth2 authentication for FastAPI."""

import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .db import get_db, User
from . import config

# OAuth and JWT configuration from centralized config
OSM_CLIENT_ID = config.OSM_CLIENT_ID
OSM_CLIENT_SECRET = config.OSM_CLIENT_SECRET
OSM_REDIRECT_URI = config.OSM_REDIRECT_URI
JWT_SECRET_KEY = config.JWT_SECRET_KEY
JWT_ALGORITHM = config.JWT_ALGORITHM
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
OSM_ALLOWED_USERNAMES = config.OSM_ALLOWED_USERNAMES
OSM_ALLOWED_USER_IDS = config.OSM_ALLOWED_USER_IDS

# OSM OAuth URLs
OSM_BASE_URL = "https://www.openstreetmap.org"
OSM_OAUTH_URL = f"{OSM_BASE_URL}/oauth2/authorize"
OSM_TOKEN_URL = f"{OSM_BASE_URL}/oauth2/token"
OSM_USER_URL = f"{OSM_BASE_URL}/api/0.6/user/details.json"

security = HTTPBearer()


class OSMAuth:
    """Handle OSM OAuth2 authentication."""

    @staticmethod
    def get_authorization_url() -> str:
        """Generate OSM OAuth authorization URL."""
        from urllib.parse import urlencode

        params = {
            "client_id": OSM_CLIENT_ID,
            "redirect_uri": OSM_REDIRECT_URI,
            "response_type": "code",
            "scope": "read_prefs write_api write_notes",
        }

        query_string = urlencode(params)
        return f"{OSM_OAUTH_URL}?{query_string}"

    @staticmethod
    async def exchange_code_for_token(code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        import logging

        logger = logging.getLogger(__name__)

        data = {
            "client_id": OSM_CLIENT_ID,
            "client_secret": OSM_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": OSM_REDIRECT_URI,
        }

        logger.debug(f"Exchanging code for token with OSM: {OSM_TOKEN_URL}")
        logger.debug(f"Using client_id: {OSM_CLIENT_ID}")
        logger.debug(f"Using redirect_uri: {OSM_REDIRECT_URI}")
        logger.debug(f"Code (first 10 chars): {code[:10]}...")
        logger.debug(f"Request data: {data}")

        async with httpx.AsyncClient() as client:
            response = await client.post(OSM_TOKEN_URL, data=data)

        logger.debug(f"OSM token exchange response status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"OSM token exchange failed. Response: {response.text}")
            logger.error(f"Response headers: {dict(response.headers)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange code for token: {response.text}",
            )

        return response.json()

    @staticmethod
    async def get_user_info(access_token: str) -> Dict[str, Any]:
        """Get user information from OSM API."""
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(OSM_USER_URL, headers=headers)

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user information",
            )

        return response.json()


def user_is_whitelisted(osm_user_data: dict) -> bool:
    """Return True when the OSM user is allowed to sign in."""
    if not OSM_ALLOWED_USERNAMES and not OSM_ALLOWED_USER_IDS:
        return True

    user_element = osm_user_data.get("user", {})
    osm_user_id = str(user_element.get("id", "")).strip()
    username = (user_element.get("display_name") or "").strip()

    if osm_user_id and osm_user_id in OSM_ALLOWED_USER_IDS:
        return True

    if username and username.lower() in OSM_ALLOWED_USERNAMES:
        return True

    return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Verify JWT token
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.osm_user_id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def create_or_update_user(
    db: Session, osm_user_data: dict, osm_access_token: str = None
) -> User:
    """Create or update user from OSM data."""
    user_element = osm_user_data["user"]
    osm_user_id = str(user_element["id"])
    username = user_element["display_name"]
    img = user_element.get("img")
    avatar_url = img.get("href") if isinstance(img, dict) else None

    # Check if user exists
    user = db.query(User).filter(User.osm_user_id == osm_user_id).first()

    if user:
        # Update existing user
        user.username = username
        user.display_name = user_element.get("display_name")
        user.avatar_url = avatar_url
        if osm_access_token:
            user.osm_access_token = osm_access_token
        user.updated_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            osm_user_id=osm_user_id,
            username=username,
            display_name=user_element.get("display_name"),
            avatar_url=avatar_url,
            email=None,  # OSM doesn't provide email in basic scope
            osm_access_token=osm_access_token,
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user
