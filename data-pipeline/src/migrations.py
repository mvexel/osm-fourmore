"""Database migrations for FourMore optimizations."""

import logging
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)

def migrate_tags_to_jsonb():
    """Migrate POI tags column from TEXT to JSONB for better performance."""
    logger.info("Migrating tags column to JSONB...")

    with engine.connect() as conn:
        # Check if migration is needed
        result = conn.execute(text("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'pois' AND column_name = 'tags'
        """)).fetchone()

        if result and result[0] == 'jsonb':
            logger.info("Tags column is already JSONB")
            return

        # Backup existing data if any
        poi_count = conn.execute(text("SELECT COUNT(*) FROM pois")).scalar()
        if poi_count > 0:
            logger.warning(f"Found {poi_count} existing POIs. This migration will clear the table.")
            logger.warning("Run a backup if you want to preserve data.")

        # Drop and recreate table with new schema
        conn.execute(text("DROP TABLE IF EXISTS pois CASCADE"))
        conn.commit()

        # Recreate table with JSONB
        conn.execute(text("""
            CREATE TABLE pois (
                id SERIAL PRIMARY KEY,
                osm_id VARCHAR NOT NULL UNIQUE,
                osm_type VARCHAR NOT NULL,
                name VARCHAR,
                category VARCHAR NOT NULL,
                subcategory VARCHAR,
                location GEOMETRY(POINT, 4326) NOT NULL,
                tags JSONB,
                address VARCHAR,
                phone VARCHAR,
                website VARCHAR,
                opening_hours VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN DEFAULT TRUE
            )
        """))

        # Create indexes
        conn.execute(text("CREATE INDEX idx_pois_osm_id ON pois (osm_id)"))
        conn.execute(text("CREATE INDEX idx_pois_category ON pois (category)"))
        conn.execute(text("CREATE INDEX idx_pois_subcategory ON pois (subcategory)"))
        conn.execute(text("CREATE INDEX idx_pois_name ON pois (name)"))
        conn.execute(text("CREATE INDEX idx_pois_is_active ON pois (is_active)"))
        conn.execute(text("CREATE INDEX idx_pois_location_gist ON pois USING GIST (location)"))

        # JSONB-specific indexes for better tag querying
        conn.execute(text("CREATE INDEX idx_pois_tags_gin ON pois USING GIN (tags)"))

        # Full-text search index on name
        conn.execute(text("""
            CREATE INDEX idx_pois_name_fts ON pois
            USING GIN (to_tsvector('english', COALESCE(name, '')))
        """))

        conn.commit()
        logger.info("Successfully migrated to JSONB and created optimized indexes")

def create_performance_indexes():
    """Create additional performance indexes."""
    logger.info("Creating additional performance indexes...")

    with engine.connect() as conn:
        # Check-in related indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_checkins_user_created
            ON checkins (user_id, created_at DESC)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_checkins_poi_created
            ON checkins (poi_id, created_at DESC)
        """))

        # User indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_osm_user_id
            ON users (osm_user_id)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_username
            ON users (username)
        """))

        conn.commit()
        logger.info("Additional performance indexes created")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate_tags_to_jsonb()
    create_performance_indexes()