"""Database configuration for FastAPI backend."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models from local database module (copied from data-pipeline)
from .database import Base, POI, User, CheckIn

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()