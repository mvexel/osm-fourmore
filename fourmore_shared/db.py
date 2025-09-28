"""Declarative database models shared across FourMore services."""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

Base = declarative_base()


class POI(Base):
    """Point of Interest model matching osm2pgsql schema."""

    __tablename__ = "pois"

    # Composite primary key matching osm2pgsql schema
    osm_type = Column(String(1), primary_key=True, nullable=False)
    osm_id = Column(Integer, primary_key=True, nullable=False)

    name = Column(Text)
    class_ = Column("class", Text, nullable=False, index=True)  # 'class' is reserved in Python
    tags = Column(JSONB)
    geom = Column(Geometry("POINT", srid=4326), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)

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

    @property
    def address(self):
        """Extract address from tags."""
        if not self.tags:
            return None

        addr_parts = []
        for key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
            if key in self.tags:
                addr_parts.append(self.tags[key])

        return ', '.join(addr_parts) if addr_parts else None

    @property
    def phone(self):
        """Extract phone from tags."""
        return self.tags.get('phone') if self.tags else None

    @property
    def website(self):
        """Extract website from tags."""
        return self.tags.get('website') if self.tags else None

    @property
    def opening_hours(self):
        """Extract opening hours from tags."""
        return self.tags.get('opening_hours') if self.tags else None

    def _to_point(self):
        """Convert the geometry to a shapely point, if possible."""
        if self.geom is None:
            return None
        try:
            return to_shape(self.geom)
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

    # Reference POI by composite key
    poi_osm_type = Column(String(1), nullable=False, index=True)
    poi_osm_id = Column(Integer, nullable=False, index=True)

    # User's location when checking in (may differ slightly from POI location)
    user_location = Column(Geometry("POINT", srid=4326))

    comment = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
