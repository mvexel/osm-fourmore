#!/usr/bin/env python3
"""Weekly data rebuild script for FourMore."""

import os
import sys
import logging
import subprocess
from datetime import datetime
from pathlib import Path

# Add the data-pipeline source to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data-pipeline', 'src'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('weekly_rebuild.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_command(cmd: list, description: str) -> bool:
    """Run a command and return success status."""
    logger.info(f"Running: {description}")
    logger.info(f"Command: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Success: {description}")
        if result.stdout:
            logger.info(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed: {description}")
        logger.error(f"Error: {e.stderr}")
        return False

def main():
    """Run the weekly data rebuild pipeline."""
    start_time = datetime.now()
    logger.info(f"Starting weekly data rebuild at {start_time}")

    # Change to project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    os.chdir(project_root)

    success = True

    # Step 1: Check if database is running
    logger.info("Checking database connectivity...")
    if not run_command([
        'python', '-c',
        'from data_pipeline.src.database import engine; engine.connect().close(); print("Database connection successful")'
    ], "Database connectivity check"):
        logger.error("Database is not accessible. Ensure PostgreSQL is running.")
        return False

    # Step 2: Run the full pipeline
    pipeline_script = project_root / 'data-pipeline' / 'src' / 'pipeline.py'
    data_dir = project_root / 'data'

    if not run_command([
        'python', str(pipeline_script), 'full-rebuild',
        '--data-dir', str(data_dir)
    ], "Full data pipeline rebuild"):
        success = False

    # Step 3: Create database indexes for performance
    if success:
        logger.info("Creating additional database indexes...")
        if not run_command([
            'python', '-c', '''
import sys, os
sys.path.insert(0, "data-pipeline/src")
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Create spatial index on POI locations (if not exists)
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pois_location_gist ON pois USING GIST (location);"))

    # Create indexes for common queries
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pois_category ON pois (category);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pois_name_gin ON pois USING GIN (to_tsvector('english', name));"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_checkins_user_created ON checkins (user_id, created_at);"))

    conn.commit()
    print("Database indexes created successfully")
'''
        ], "Create database indexes"):
            logger.warning("Failed to create some database indexes, but continuing...")

    end_time = datetime.now()
    duration = end_time - start_time

    if success:
        logger.info(f"Weekly rebuild completed successfully in {duration}")
    else:
        logger.error(f"Weekly rebuild failed after {duration}")
        sys.exit(1)

if __name__ == '__main__':
    main()