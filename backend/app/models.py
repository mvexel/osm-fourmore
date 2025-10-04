"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import Path
from pydantic import BaseModel, Field, field_validator, field_serializer
from sqlalchemy import Column


# for field validation (returning "node" instead of "N" for osm_type and "way" instead of "W")
# we need this because osm2pgsql uses "N" and "W" in the database and we want to use "node" and "way" in the API
def osm_type_validator_to_full(value: str) -> str:
    return {"N": "node", "W": "way"}.get(value, value)


def osm_type_validator_to_short(value: str) -> str:
    return {"node": "N", "way": "W"}.get(value, value)


# and for the API routes:
def NormalizeOsmType(
    osm_type: str = Path(..., description="OSM type: 'node' or 'way'")
) -> str:
    return osm_type_validator_to_short(osm_type)


# POI Models
class POIBase(BaseModel):
    name: Optional[str] = None
    poi_class: str = Field(..., alias="class")
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None


class POICreate(POIBase):
    osm_id: int
    osm_type: str
    lat: float
    lon: float
    tags: Dict[str, Any]
    version: int
    timestamp: datetime


class POIResponse(POIBase):
    osm_id: int
    osm_type: str
    lat: float
    lon: float
    tags: Dict[str, Any]
    version: int
    timestamp: datetime
    distance: Optional[float] = Field(
        None, description="Distance in meters from user location"
    )
    is_checked_in: Optional[bool] = Field(
        None,
        description="Whether current user has checked in recently (within 24 hours)",
    )

    @field_validator("osm_type")
    def serialize_osm_type(cls, v: str) -> str:
        return osm_type_validator_to_full(v)

    class Config:
        from_attributes = True
        populate_by_name = True


class POINearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    radius: float = Field(1000, ge=1, le=10000, description="Search radius in meters")
    poi_class: Optional[str] = Field(
        None, alias="class", description="Filter by POI class"
    )
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip for pagination")


# User Models
class UserSettings(BaseModel):
    expert: bool = False
    theme: str = "light"
    notifications: bool = True
    participate_in_quests: bool = True
    # Add more settings as needed


class UserBase(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[UserSettings] = None


class UserResponse(UserBase):
    id: int
    osm_user_id: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    expert: Optional[bool] = Field(None, description="Enable/disable expert mode")
    theme: Optional[str] = Field(None, description="UI theme preference")
    notifications: Optional[bool] = Field(
        None, description="Enable/disable notifications"
    )
    display_name: Optional[str] = Field(
        None, max_length=100, description="User's display name"
    )
    participate_in_quests: Optional[bool] = Field(
        None, description="Enable/disable quest participation"
    )
    # Add other user-modifiable settings here as needed


# Check-in Models
class CheckInBase(BaseModel):
    comment: Optional[str] = Field(None, max_length=500)


class CheckInUpdate(BaseModel):
    comment: Optional[str] = Field(None, max_length=500)


class CheckInCreate(CheckInBase):
    poi_osm_type: str
    poi_osm_id: int
    user_lat: Optional[float] = Field(None, ge=-90, le=90)
    user_lon: Optional[float] = Field(None, ge=-180, le=180)

    @field_validator("poi_osm_type")
    @classmethod
    def serialize_osm_type(cls, v: str) -> str:
        return osm_type_validator_to_short(v)


class CheckInResponse(CheckInBase):
    id: int
    poi_osm_type: str
    poi_osm_id: int
    user_id: int
    created_at: datetime
    poi: POIResponse

    class Config:
        from_attributes = True


class CheckInListResponse(BaseModel):
    checkins: List[CheckInResponse]
    total: int
    page: int
    per_page: int


# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class AuthCallback(BaseModel):
    code: str


# API Response Models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    detail: str


# Quest Models
class QuestApplicableResponse(BaseModel):
    id: str
    question: str


class QuestApplicableListResponse(BaseModel):
    quests: List[QuestApplicableResponse]
    total: int


class QuestRespondRequest(BaseModel):
    poi_osm_type: str
    poi_osm_id: int
    quest_id: str
    answer: str

    @field_validator("poi_osm_type")
    @classmethod
    def serialize_osm_type(cls, v: str) -> str:
        return osm_type_validator_to_short(v)


class QuestRespondResponse(BaseModel):
    success: bool
    changeset_id: Optional[str]
    message: str
