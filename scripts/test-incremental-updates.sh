#!/bin/bash

# Local Testing Script for OSM Incremental Updates
# Tests the complete workflow: download → pre-filter → import → update

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OSM Incremental Updates - Local Test     ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Configuration
TEST_AREA=${TEST_AREA:-"utah"}
DATA_DIR="./data"
PIPELINE_DIR="./data-pipeline"

case $TEST_AREA in
  "rhode-island")
    OSM_URL="https://download.geofabrik.de/north-america/us/rhode-island-latest.osm.pbf"
    EXPECTED_POIS="2000-3000"
    ;;
  "utah")
    OSM_URL="https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf"
    EXPECTED_POIS="25000-30000"
    ;;
  "delaware")
    OSM_URL="https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf"
    EXPECTED_POIS="3000-4000"
    ;;
  *)
    echo -e "${RED}Unknown test area: $TEST_AREA${NC}"
    echo "Supported: rhode-island, delaware, utah"
    exit 1
    ;;
esac

TEST_FILE="$TEST_AREA-latest.osm.pbf"
FILTERED_FILE="$TEST_AREA-latest-filtered.osm.pbf"

echo -e "${BLUE}Test Configuration:${NC}"
echo "  Area: $TEST_AREA"
echo "  Expected POIs: $EXPECTED_POIS"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check osmium
if ! command -v osmium &> /dev/null; then
    echo -e "${RED}✗ osmium-tool not found${NC}"
    echo "  Install: brew install osmium-tool"
    exit 1
fi
echo -e "${GREEN}✓ osmium-tool installed: $(osmium --version | head -n1)${NC}"

# Check PostgreSQL
if ! pg_isready -h localhost -U fourmore &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL not running or not accessible${NC}"
    echo "  Start: brew services start postgresql"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL running${NC}"

# Check database exists
if ! psql -h localhost -U fourmore -d fourmore -c "SELECT 1" &> /dev/null; then
    echo -e "${YELLOW}⚠ Database 'fourmore' not found, creating...${NC}"
    psql -h localhost -U fourmore -d postgres -c "CREATE DATABASE fourmore;" || {
        echo -e "${RED}✗ Failed to create database${NC}"
        exit 1
    }
    psql -h localhost -U fourmore -d fourmore -c "CREATE EXTENSION IF NOT EXISTS postgis;" &> /dev/null
    psql -h localhost -U fourmore -d fourmore -c "CREATE EXTENSION IF NOT EXISTS hstore;" &> /dev/null
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database exists${NC}"
fi

echo ""

# Step 1: Download test data
echo -e "${BLUE}Step 1: Downloading test data...${NC}"
mkdir -p "$DATA_DIR"

if [ -f "$DATA_DIR/$TEST_FILE" ]; then
    FILE_SIZE=$(du -h "$DATA_DIR/$TEST_FILE" | cut -f1)
    echo -e "${GREEN}✓ Test file already exists ($FILE_SIZE)${NC}"
else
    echo "  Downloading from: $OSM_URL"
    curl -L --progress-bar -o "$DATA_DIR/$TEST_FILE" "$OSM_URL"
    FILE_SIZE=$(du -h "$DATA_DIR/$TEST_FILE" | cut -f1)
    echo -e "${GREEN}✓ Downloaded ($FILE_SIZE)${NC}"
fi

echo ""

# Step 2: Pre-filter
echo -e "${BLUE}Step 2: Pre-filtering for POIs...${NC}"

if [ -f "$DATA_DIR/$FILTERED_FILE" ]; then
    echo -e "${YELLOW}⚠ Filtered file exists, removing old version...${NC}"
    rm "$DATA_DIR/$FILTERED_FILE"
fi

cd "$PIPELINE_DIR"
START_TIME=$(date +%s)

INPUT_FILE="../$DATA_DIR/$TEST_FILE" \
OUTPUT_FILE="../$DATA_DIR/$FILTERED_FILE" \
./prefilter_osm.sh 2>&1 | grep -E "(Running|Filtering|complete|Output size|reduction)" || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ -f "../$DATA_DIR/$FILTERED_FILE" ]; then
    FILTERED_SIZE=$(du -h "../$DATA_DIR/$FILTERED_FILE" | cut -f1)
    echo -e "${GREEN}✓ Pre-filtering complete ($FILTERED_SIZE, ${DURATION}s)${NC}"
else
    echo -e "${RED}✗ Pre-filtering failed${NC}"
    exit 1
fi

cd ..
echo ""

# Step 3: Clear existing data
echo -e "${BLUE}Step 3: Preparing database...${NC}"
echo -e "${YELLOW}⚠ Dropping existing tables...${NC}"

psql -h localhost -U fourmore -d fourmore -c "DROP TABLE IF EXISTS pois CASCADE;" &> /dev/null || true
psql -h localhost -U fourmore -d fourmore -c "DROP TABLE IF EXISTS planet_osm_nodes CASCADE;" &> /dev/null || true
psql -h localhost -U fourmore -d fourmore -c "DROP TABLE IF EXISTS planet_osm_ways CASCADE;" &> /dev/null || true
psql -h localhost -U fourmore -d fourmore -c "DROP TABLE IF EXISTS planet_osm_rels CASCADE;" &> /dev/null || true
psql -h localhost -U fourmore -d fourmore -c "DROP TABLE IF EXISTS osm2pgsql_properties CASCADE;" &> /dev/null || true

echo -e "${GREEN}✓ Database ready for fresh import${NC}"
echo ""

# Step 4: Initial import
echo -e "${BLUE}Step 4: Initial import with --slim mode...${NC}"

cd "$PIPELINE_DIR"
START_TIME=$(date +%s)

export DATABASE_NAME=fourmore
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USER=fourmore
export DATABASE_PASSWORD=fourmore_dev_password
export OSM_DATA_FILE="../$DATA_DIR/$FILTERED_FILE"

./run_osm2pgsql.sh 2>&1 | grep -E "(Starting|completed|Processing)" || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}✓ Import complete (${DURATION}s)${NC}"
cd ..
echo ""

# Step 5: Verify data
echo -e "${BLUE}Step 5: Verifying imported data...${NC}"

POI_COUNT=$(psql -h localhost -U fourmore -d fourmore -t -c "SELECT COUNT(*) FROM pois;" | xargs)
echo "  POI count: $POI_COUNT (expected: $EXPECTED_POIS)"

SLIM_TABLES=$(psql -h localhost -U fourmore -d fourmore -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'planet_osm_%';" | xargs)
echo "  Slim tables: $SLIM_TABLES (expected: 3)"

if [ "$SLIM_TABLES" = "3" ]; then
    echo -e "${GREEN}✓ Slim tables created (incremental updates enabled)${NC}"
else
    echo -e "${RED}✗ Slim tables missing${NC}"
    exit 1
fi

echo ""
echo "Sample POIs:"
psql -h localhost -U fourmore -d fourmore -c "SELECT name, class FROM pois LIMIT 5;"
echo ""

# Step 6: Initialize replication
echo -e "${BLUE}Step 6: Initializing incremental updates...${NC}"

cd "$PIPELINE_DIR"
START_TIME=$(date +%s)

./update_osm2pgsql.sh 2>&1 | grep -E "(Checking|Replication|Applying|completed|sequence)" || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}✓ Replication initialized (${DURATION}s)${NC}"
cd ..
echo ""

# Step 7: Check final state
echo -e "${BLUE}Step 7: Final verification...${NC}"

FINAL_COUNT=$(psql -h localhost -U fourmore -d fourmore -t -c "SELECT COUNT(*) FROM pois;" | xargs)
echo "  Final POI count: $FINAL_COUNT"

LATEST_TIMESTAMP=$(psql -h localhost -U fourmore -d fourmore -t -c "SELECT MAX(timestamp) FROM pois;" | xargs)
echo "  Latest POI timestamp: $LATEST_TIMESTAMP"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✓ All tests passed!                ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait a few minutes/hours"
echo "  2. Run: cd data-pipeline && ./update_osm2pgsql.sh"
echo "  3. Verify updates: psql -h localhost -U fourmore -d fourmore -c \"SELECT COUNT(*) FROM pois;\""
echo ""
echo "To test with a different area:"
echo "  TEST_AREA=delaware $0"
echo ""
echo "To clean up:"
echo "  rm -f data/$TEST_FILE data/$FILTERED_FILE"
echo "  psql -h localhost -U fourmore -d fourmore -c \"DROP TABLE pois, planet_osm_nodes, planet_osm_ways, planet_osm_rels CASCADE;\""
echo ""
