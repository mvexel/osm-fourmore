#!/bin/bash

# OSM2PGSQL Data Loading Script
# This script loads OSM data into PostgreSQL using osm2pgsql with flex output

# Configuration from environment variables
DATABASE_NAME=${DATABASE_NAME:-fourmore}
DATABASE_HOST=${DATABASE_HOST:-postgres}
DATABASE_PORT=${DATABASE_PORT:-5432}
DATABASE_USER=${DATABASE_USER:-fourmore}
DATABASE_PASSWORD=${DATABASE_PASSWORD:-fourmore_dev_password}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LUA_SCRIPT=${LUA_SCRIPT:-"$SCRIPT_DIR/pois.lua"}
OSM_DATA_FILE=${OSM_DATA_FILE:-"/app/data/utah-latest.osm.pbf"}

# Check if required files exist
if [ ! -f "$LUA_SCRIPT" ]; then
    echo "Error: Lua script not found at $LUA_SCRIPT"
    exit 1
fi

if [ ! -f "$OSM_DATA_FILE" ]; then
    echo "Error: OSM data file not found at $OSM_DATA_FILE"
    exit 1
fi

echo "Starting osm2pgsql data load..."
echo "Database: $DATABASE_NAME on $DATABASE_HOST:$DATABASE_PORT"
echo "Lua script: $LUA_SCRIPT"
echo "OSM data: $OSM_DATA_FILE"

# Set PGPASSWORD for authentication
export PGPASSWORD="$DATABASE_PASSWORD"

osm2pgsql \
    --slim \
    --database "$DATABASE_NAME" \
    --host "$DATABASE_HOST" \
    --port "$DATABASE_PORT" \
    --user "$DATABASE_USER" \
    --create \
    --output flex \
    --style "$LUA_SCRIPT" \
    "$OSM_DATA_FILE"

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "osm2pgsql completed successfully"
else
    echo "osm2pgsql failed with exit code $exit_code"
fi

exit $exit_code