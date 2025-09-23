"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# POI Models
class POIBase(BaseModel):
    name: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None

class POICreate(POIBase):
    osm_id: str
    osm_type: str
    lat: float
    lon: float
    tags: Dict[str, Any]

class POIResponse(POIBase):
    id: int
    osm_id: str
    osm_type: str
    lat: float
    lon: float
    tags: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]
    distance: Optional[float] = Field(None, description="Distance in meters from user location")

    class Config:
        from_attributes = True

class POINearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    radius: float = Field(1000, ge=1, le=10000, description="Search radius in meters")
    category: Optional[str] = Field(None, description="Filter by category")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip for pagination")

# User Models
class UserBase(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(UserBase):
    id: int
    osm_user_id: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# Check-in Models
class CheckInBase(BaseModel):
    comment: Optional[str] = Field(None, max_length=500)

class CheckInCreate(CheckInBase):
    poi_id: int
    user_lat: Optional[float] = Field(None, ge=-90, le=90)
    user_lon: Optional[float] = Field(None, ge=-180, le=180)

class CheckInResponse(CheckInBase):
    id: int
    poi_id: int
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