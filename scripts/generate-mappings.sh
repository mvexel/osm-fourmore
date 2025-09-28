#!/bin/bash
# Generate all mapping files from the canonical category_mapping.json

set -e

echo "🔄 Generating mapping files from category_mapping.json..."

# Change to data-pipeline directory
cd "$(dirname "$0")/../data-pipeline"

# Generate Lua mapping for osm2pgsql
echo "📝 Generating poi_mapping.lua..."
python src/generate_poi_mapping.py

# Generate TypeScript metadata for frontend
echo "📝 Generating category_metadata.tsx..."
python src/generate_category_ts.py

echo "✅ All mapping files generated successfully!"
echo ""
echo "Generated files:"
echo "  - data-pipeline/poi_mapping.lua (for osm2pgsql)"
echo "  - frontend/src/generated/category_metadata.tsx (for frontend)"
echo ""
echo "💡 Remember to rebuild your frontend and data pipeline after changes to category_mapping.json"