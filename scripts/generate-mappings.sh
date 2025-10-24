#!/bin/bash
# Generate all mapping files from the canonical category_mapping.json

set -e

echo "🔄 Generating mapping files from category_mapping.json..."

# Change to data-pipeline directory
cd "$(dirname "$0")/../data-pipeline"

# Determine available Python interpreter
PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python || true)}"
if [ -z "$PYTHON_BIN" ]; then
  echo "❌ No python interpreter found. Install python3 or set PYTHON_BIN."
  exit 1
fi

# Validate mapping before generating outputs
echo "Validating category_mapping.json..."
"$PYTHON_BIN" src/validate_category_mapping.py

# Generate Lua mapping for osm2pgsql
echo "Generating poi_mapping.lua..."
"$PYTHON_BIN" src/generate_poi_mapping.py

# Generate TypeScript metadata for frontend
echo "Generating category_metadata.tsx..."
"$PYTHON_BIN" src/generate_category_ts.py

echo "All mapping files generated successfully!"
echo ""
echo "Generated files:"
echo "  - data-pipeline/poi_mapping.lua (for osm2pgsql)"
echo "  - frontend/src/generated/category_metadata.tsx (for frontend)"
echo ""
echo "Remember to rebuild your frontend and data pipeline after changes to category_mapping.json"
