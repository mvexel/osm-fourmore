#!/usr/bin/env python3
"""Database migration script for deployment."""

import os
import sys
import requests
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Import models from the app
sys.path.insert(0, os.path.dirname(__file__))
from app.db import Base

def run_migrations():
    """Run database migrations."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print(f"Connecting to database...")
    engine = create_engine(database_url)

    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")

        # Create PostGIS extension if it doesn't exist
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
            print("✓ PostGIS extension enabled")

        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created/updated")

        # Check if we should populate with Utah data
        populate_data = os.getenv("POPULATE_UTAH_DATA", "false").lower() == "true"
        if populate_data:
            populate_utah_data()

        print("🎉 Migration completed successfully!")

    except OperationalError as e:
        print(f"ERROR: Database connection failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        sys.exit(1)

def populate_utah_data():
    """Download and populate database with Utah OSM data."""
    print("🗺️  Populating database with Utah data...")

    # Create data directory
    data_dir = Path("/app/data")
    data_dir.mkdir(exist_ok=True)

    utah_file = data_dir / "utah-latest.osm.pbf"

    # Download Utah data if not exists
    if not utah_file.exists():
        print("📥 Downloading Utah OSM data...")
        url = "https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf"

        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0

            with open(utah_file, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            print(f"\rProgress: {progress:.1f}%", end='', flush=True)

            print(f"\n✓ Download completed: {utah_file}")

        except requests.RequestException as e:
            print(f"ERROR: Failed to download Utah data: {e}")
            return
    else:
        print("✓ Utah data file already exists")

    # Process Utah data
    try:
        from app.pipeline.osm_processor import process_osm_file, save_pois_to_db

        print("⚙️  Processing Utah OSM data...")
        pois = process_osm_file(str(utah_file))

        if pois:
            save_pois_to_db(pois)
            print(f"✅ Successfully loaded {len(pois)} POIs from Utah data")
        else:
            print("⚠️  No POIs found in Utah data")

    except Exception as e:
        print(f"ERROR: Failed to process Utah data: {e}")
        raise

if __name__ == "__main__":
    run_migrations()