"""Declarative database models shared across FourMore services."""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

Base = declarative_base()


class POI(Base):
    """Point of Interest model."""

    __tablename__ = "pois"

    id = Column(Integer, primary_key=True, index=True)
    osm_id = Column(String, unique=True, index=True, nullable=False)
    osm_type = Column(String, nullable=False)
    osm_version = Column(Integer)
    name = Column(String, index=True)
    category = Column(String, index=True, nullable=False)
    subcategory = Column(String, index=True)

    # Geometry stored as point (even for polygonal features)
    location = Column(Geometry("POINT", srid=4326), nullable=False, index=True)

    # Store original OSM tags as JSONB for better performance and querying
    tags = Column(JSONB)

    # Extracted common fields
    address = Column(String)
    phone = Column(String)
    website = Column(String)
    opening_hours = Column(String)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True, index=True)

    @property
    def lat(self):
        """Latitude extracted from the geometry."""
        point = self._to_point()
        return point.y if point else None

    @property
    def lon(self):
        """Longitude extracted from the geometry."""
        point = self._to_point()
        return point.x if point else None

    def _to_point(self):
        """Convert the geometry to a shapely point, if possible."""
        if self.location is None:
            return None
        try:
            return to_shape(self.location)
        except Exception:
            return None


class User(Base):
    """User model for check-ins."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    osm_user_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    email = Column(String, unique=True, index=True)
    avatar_url = Column(String)
    osm_access_token = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)


class CheckIn(Base):
    """Check-in model."""

    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    poi_id = Column(Integer, nullable=False, index=True)

    # User's location when checking in (may differ slightly from POI location)
    user_location = Column(Geometry("POINT", srid=4326))

    comment = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
