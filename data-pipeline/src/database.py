"""Database models and connection setup for FourMore data pipeline."""

import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class POI(Base):
    """Point of Interest model."""
    __tablename__ = 'pois'

    id = Column(Integer, primary_key=True, index=True)
    osm_id = Column(String, unique=True, index=True, nullable=False)
    osm_type = Column(String, nullable=False)  # 'node', 'way', 'relation'
    name = Column(String, index=True)
    category = Column(String, index=True, nullable=False)
    subcategory = Column(String, index=True)

    # Geometry stored as point (even for polygonal features)
    location = Column(Geometry('POINT', srid=4326), nullable=False, index=True)

    # Store original OSM tags as JSONB for better performance and querying
    tags = Column(JSONB)  # PostgreSQL JSONB type

    # Extracted common fields
    address = Column(String)
    phone = Column(String)
    website = Column(String)
    opening_hours = Column(String)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True, index=True)

class User(Base):
    """User model for check-ins."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    osm_user_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    email = Column(String, unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

class CheckIn(Base):
    """Check-in model."""
    __tablename__ = 'checkins'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    poi_id = Column(Integer, nullable=False, index=True)

    # User's location when checking in (may differ slightly from POI location)
    user_location = Column(Geometry('POINT', srid=4326))

    comment = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()