#!/bin/bash

# OSM Pre-filtering Script
# Uses osmium-tool to pre-filter planet OSM data for faster osm2pgsql processing
# Only extracts nodes/ways with name tags and POI-related tags

set -e

# Configuration from environment variables
DATA_DIR=${DATA_DIR:-"../data"}
INPUT_FILE=${INPUT_FILE:-"$DATA_DIR/planet-latest.osm.pbf"}
OUTPUT_FILE=${OUTPUT_FILE:-"$DATA_DIR/planet-pois-filtered.osm.pbf"}
DOWNLOAD_URL=${DOWNLOAD_URL:-"https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf"}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 OSM Pre-filtering Pipeline${NC}"
echo "================================================"

# Check if osmium is installed
if ! command -v osmium &> /dev/null; then
    echo -e "${RED}❌ Error: osmium-tool is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install osmium-tool"
    echo "  Ubuntu:  sudo apt-get install osmium-tool"
    echo "  Other:   See https://osmcode.org/osmium-tool/"
    exit 1
fi

echo -e "${GREEN}✅ osmium-tool found: $(osmium --version | head -n1)${NC}"
echo ""

# Create data directory if needed
mkdir -p "$DATA_DIR"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${YELLOW}📥 Input file not found: $INPUT_FILE${NC}"
    echo ""
    read -p "Download planet file (~70GB)? This will take hours. [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Downloading planet file...${NC}"
        echo "Source: $DOWNLOAD_URL"
        echo "Target: $INPUT_FILE"
        echo ""
        curl -L \
            --progress-bar \
            --continue-at - \
            --output "$INPUT_FILE" \
            "$DOWNLOAD_URL"
        echo -e "${GREEN}✅ Download complete${NC}"
    else
        echo -e "${RED}❌ Aborted. Please provide input file.${NC}"
        exit 1
    fi
fi

# Display input file info
INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
echo -e "${BLUE}📊 Input file info:${NC}"
echo "   Path: $INPUT_FILE"
echo "   Size: $INPUT_SIZE"
echo ""

# Run osmium tags-filter
# Filter for nodes and ways that have:
# - A name tag (required)
# - At least one of: amenity, shop, leisure, tourism, office, craft
echo -e "${BLUE}🔍 Running osmium tags-filter...${NC}"
echo "   Filtering for POIs with name tags"
echo "   Output: $OUTPUT_FILE"
echo ""

START_TIME=$(date +%s)

# The filter expression:
# - n,w = nodes and ways only (no relations)
# - name= means "must have a name tag"
# - amenity,shop,leisure,tourism,office,craft = must have at least one POI tag
osmium tags-filter \
    "$INPUT_FILE" \
    --overwrite \
    --progress \
    -o "$OUTPUT_FILE" \
    nw/name= \
    nw/amenity \
    nw/shop \
    nw/leisure \
    nw/tourism \
    nw/office \
    nw/craft

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo -e "${GREEN}✅ Filtering complete!${NC}"
echo ""

# Display output file info
if [ -f "$OUTPUT_FILE" ]; then
    OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    
    echo -e "${BLUE}📊 Results:${NC}"
    echo "   Input size:  $INPUT_SIZE"
    echo "   Output size: $OUTPUT_SIZE"
    echo "   Duration:    ${MINUTES}m ${SECONDS}s"
    echo ""
    
    # Calculate compression ratio
    INPUT_BYTES=$(stat -f%z "$INPUT_FILE" 2>/dev/null || stat -c%s "$INPUT_FILE")
    OUTPUT_BYTES=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE")
    REDUCTION=$(awk "BEGIN {printf \"%.1f\", (1 - $OUTPUT_BYTES/$INPUT_BYTES) * 100}")
    
    echo -e "${GREEN}   Size reduction: ${REDUCTION}%${NC}"
    echo ""
    
    # Show statistics using osmium fileinfo
    echo -e "${BLUE}📈 Object counts (running osmium fileinfo...):${NC}"
    osmium fileinfo -e "$OUTPUT_FILE" | grep -E "Nodes:|Ways:|Relations:" || true
    echo ""
    
    echo -e "${GREEN}🎉 Ready for osm2pgsql import!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update OSM_DATA_FILE in your environment:"
    echo "     export OSM_DATA_FILE=\"$OUTPUT_FILE\""
    echo "  2. Run osm2pgsql:"
    echo "     make seed-db"
    echo ""
else
    echo -e "${RED}❌ Error: Output file was not created${NC}"
    exit 1
fi
