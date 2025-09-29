"""Database configuration for FastAPI backend."""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env and .env.local files
from dotenv import find_dotenv
load_dotenv(find_dotenv())  # Automatically finds .env files up the directory tree
load_dotenv(find_dotenv(".env.local"), override=True)  # .env.local overrides .env values

# Import models from local database module (copied from data-pipeline)
from .database import Base, POI, User, CheckIn

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore")  # TODO: no magic!

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()