#!/bin/bash

# OSM2PGSQL Update Script
# This script updates the OSM data in PostgreSQL using osm2pgsql-replication

# Configuration from environment variables
DATABASE_NAME=${DATABASE_NAME:-fourmore}
DATABASE_HOST=${DATABASE_HOST:-postgres}
DATABASE_PORT=${DATABASE_PORT:-5432}
DATABASE_USER=${DATABASE_USER:-fourmore}
DATABASE_PASSWORD=${DATABASE_PASSWORD:-fourmore_dev_password}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LUA_SCRIPT=${LUA_SCRIPT:-"$SCRIPT_DIR/pois.lua"}
OSM_DATA_FILE=${OSM_DATA_FILE:-"/app/data/us-latest.osm.pbf"}

# Check if Lua script exists
if [ ! -f "$LUA_SCRIPT" ]; then
    echo "Error: Lua script not found at $LUA_SCRIPT"
    exit 1
fi

echo "Starting osm2pgsql update process..."
echo "Database: $DATABASE_NAME on $DATABASE_HOST:$DATABASE_PORT"
echo "Lua script: $LUA_SCRIPT"

# Set PGPASSWORD for authentication
export PGPASSWORD="$DATABASE_PASSWORD"

# Build database connection string
DB_CONN="-d $DATABASE_NAME -H $DATABASE_HOST -P $DATABASE_PORT -U $DATABASE_USER"

# Check if replication is already initialized
echo "Checking replication status..."
if ! osm2pgsql-replication status $DB_CONN 2>/dev/null; then
    echo "Replication not initialized. Initializing now..."

    # Check if OSM data file exists for initialization
    if [ ! -f "$OSM_DATA_FILE" ]; then
        echo "Error: OSM data file not found at $OSM_DATA_FILE"
        echo "Replication requires the original OSM file for initialization."
        exit 1
    fi

    osm2pgsql-replication init $DB_CONN --osm-file "$OSM_DATA_FILE"
    init_status=$?

    if [ $init_status -eq 0 ]; then
        echo "✓ Replication initialized successfully"
    else
        echo "✗ Replication initialization failed with exit code $init_status"
        exit $init_status
    fi
else
    echo "✓ Replication already initialized"
fi

# Show status before update
echo ""
echo "Current replication status:"
osm2pgsql-replication status $DB_CONN

# Run the update
echo ""
echo "Applying updates..."
osm2pgsql-replication update $DB_CONN \
    --verbose \
    -- \
    --output flex \
    --style "$LUA_SCRIPT"

exit_code=$?

# Show status after update
echo ""
if [ $exit_code -eq 0 ]; then
    echo "✓ osm2pgsql update completed successfully"
    echo ""
    echo "Updated replication status:"
    osm2pgsql-replication status $DB_CONN
else
    echo "✗ osm2pgsql update failed with exit code $exit_code"
fi

exit $exit_code
