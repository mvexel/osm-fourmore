"""Database configuration for FastAPI backend."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from . import config

# Import models from local database module (copied from data-pipeline)
from .database import Base, POI, User, CheckIn, QuestResponse

DATABASE_URL = config.DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()