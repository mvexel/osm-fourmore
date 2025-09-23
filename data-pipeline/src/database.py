"""Database models and connection setup for FourMore data pipeline."""

import os
import time
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

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

# Create engine with connection retry and better settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    connect_args={
        "connect_timeout": 10
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables with retry logic for database connection."""
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to create tables (attempt {attempt + 1}/{max_retries})")
            Base.metadata.create_all(bind=engine)
            logger.info("Tables created successfully")
            return
        except Exception as e:
            logger.warning(f"Failed to create tables on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Max retries reached. Failed to create tables.")
                raise

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()