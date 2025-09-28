#!/bin/bash
# Database initialization script for FourMore
# Ensures PostGIS extensions are enabled and database is ready

set -e

echo "🔧 Initializing FourMore database..."

# Database connection parameters
DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${POSTGRES_DB:-fourmore}
DB_USER=${POSTGRES_USER:-fourmore}
DB_PASSWORD=${POSTGRES_PASSWORD:-fourmore_dev_password}

# Set PGPASSWORD for authentication
export PGPASSWORD="$DB_PASSWORD"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "  PostgreSQL is still starting... (attempt $i/30)"
    sleep 2
done

# Check if we can connect
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "❌ PostgreSQL did not become ready in time"
    exit 1
fi

# Enable PostGIS extensions
echo "🗺️  Enabling PostGIS extensions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create indexes that will be useful for OSM data
-- These will be created by osm2pgsql, but ensuring they exist
SELECT 'PostGIS extensions enabled successfully' as result;
EOF

echo "✅ Database initialization complete!"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"