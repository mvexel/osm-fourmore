"""Database configuration and shared models for the FourMore backend."""

import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .database_models import Base, POI, User, CheckIn, QuestResponse
from . import config

logger = logging.getLogger(__name__)

DATABASE_URL = config.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """Create all tables with retry logic for database connection."""
    max_retries = 5
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            logger.debug(
                f"Attempting to create tables (attempt {attempt + 1}/{max_retries})"
            )
            Base.metadata.create_all(bind=engine)
            logger.debug("Tables created successfully")
            return
        except Exception as e:
            logger.warning(f"Failed to create tables on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.debug(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2
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
