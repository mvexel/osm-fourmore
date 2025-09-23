#!/bin/bash
# Load test data for FourMore development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🗺️  Loading test data for FourMore...${NC}"

# Create data directory
mkdir -p data

echo ""
echo "Choose test data size:"
echo "1) Small - Delaware (fast download, ~5MB, good for testing)"
echo "2) Medium - Connecticut (medium download, ~20MB)"
echo "3) Large - Utah (larger download, ~140MB)"
echo "4) Full US (very large download, ~8GB, takes hours)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        STATE="delaware"
        URL="https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf"
        FILE="delaware-latest.osm.pbf"
        ;;
    2)
        STATE="connecticut"
        URL="https://download.geofabrik.de/north-america/us/connecticut-latest.osm.pbf"
        FILE="connecticut-latest.osm.pbf"
        ;;
    3)
        STATE="utah"
        URL="https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf"
        FILE="utah-latest.osm.pbf"
        ;;
    4)
        STATE="full-us"
        URL="https://download.geofabrik.de/north-america/us-latest.osm.pbf"
        FILE="us-latest.osm.pbf"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${YELLOW}📥 Downloading $STATE data...${NC}"
echo "URL: $URL"

# Download data if not exists
if [ ! -f "data/$FILE" ]; then
    cd data
    echo "Downloading $FILE..."
    curl -L -o "$FILE" "$URL"
    cd ..
    echo -e "${GREEN}✅ Download complete${NC}"
else
    echo -e "${GREEN}✅ Data file already exists${NC}"
fi

# Process the data
echo -e "${YELLOW}⚙️  Processing OSM data...${NC}"
echo "This may take a few minutes depending on file size..."

cd data-pipeline
source venv/bin/activate
cd src

# Run the processing
python pipeline.py process "../../data/$FILE"

cd ../..

echo -e "${GREEN}🎉 Test data loaded successfully!${NC}"
echo ""
echo "Data statistics:"

# Show some stats
docker-compose exec postgres psql -U fourmore -d fourmore -c "
SELECT
    'Total POIs' as metric,
    COUNT(*)::text as count
FROM pois
UNION ALL
SELECT
    'Categories' as metric,
    COUNT(DISTINCT category)::text as count
FROM pois
UNION ALL
SELECT
    category as metric,
    COUNT(*)::text as count
FROM pois
GROUP BY category
ORDER BY count DESC
LIMIT 10;
"

echo ""
echo -e "${GREEN}✅ Ready to start development!${NC}"
echo "Run: ${YELLOW}./scripts/start-dev.sh${NC}"