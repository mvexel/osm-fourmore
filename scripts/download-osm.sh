#!/bin/bash
# OSM data download script for FourMore
# Downloads OSM data file if it doesn't exist

set -e

# Configuration
DATA_DIR=${DATA_DIR:-./data}
OSM_DATA_FILE=${OSM_DATA_FILE:-utah-latest.osm.pbf}
OSM_DATA_URL=${OSM_DATA_URL:-https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf}

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

FULL_PATH="$DATA_DIR/$OSM_DATA_FILE"

echo "📦 OSM Data Download Manager"
echo "   Data directory: $DATA_DIR"
echo "   Target file: $OSM_DATA_FILE"
echo "   Full path: $FULL_PATH"

# Check if file already exists
if [ -f "$FULL_PATH" ]; then
    FILE_SIZE=$(du -h "$FULL_PATH" | cut -f1)
    FILE_AGE=$(find "$FULL_PATH" -mtime +7 | wc -l)

    echo "✅ OSM data file already exists ($FILE_SIZE)"

    if [ "$FILE_AGE" -gt 0 ]; then
        echo "⚠️  File is older than 7 days. Consider updating with:"
        echo "   rm $FULL_PATH && make download-osm"
    fi

    exit 0
fi

echo "📥 Downloading OSM data..."
echo "   URL: $OSM_DATA_URL"

# Download with progress bar and resume support
curl -L \
    --progress-bar \
    --continue-at - \
    --output "$FULL_PATH" \
    "$OSM_DATA_URL"

# Verify download
if [ -f "$FULL_PATH" ]; then
    FILE_SIZE=$(du -h "$FULL_PATH" | cut -f1)
    echo "✅ Download complete! ($FILE_SIZE)"
else
    echo "❌ Download failed!"
    exit 1
fi

# Basic file validation
if [ ! -s "$FULL_PATH" ]; then
    echo "❌ Downloaded file is empty!"
    rm -f "$FULL_PATH"
    exit 1
fi

echo "🔍 Validating OSM data file..."
file_type=$(file "$FULL_PATH")
if [[ "$file_type" == *"protocol buffer"* ]] || [[ "$file_type" == *"data"* ]]; then
    echo "✅ OSM data file appears valid"
else
    echo "⚠️  Warning: File type check inconclusive - $file_type"
    echo "   File may still be valid, proceeding..."
fi

echo ""
echo "🎉 OSM data ready for import!"
echo "   Use 'make seed-db' to import into database"