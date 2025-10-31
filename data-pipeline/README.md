# Data Pipeline

This directory contains scripts and configuration for importing OpenStreetMap data into the FourMore database.

## Files

- **`pois.lua`** - osm2pgsql flex output style that defines POI extraction logic
- **`poi_mapping.lua`** - Generated file mapping OSM tags to FourMore categories
- **`run_osm2pgsql.sh`** - Main script to run osm2pgsql with flex output
- **`update_osm2pgsql.sh`** - Script for updating existing OSM data
- **`prefilter_osm.sh`** - Pre-processes large OSM files to extract only relevant POIs

## Quick Start

### For Regional Extracts (Recommended for Development)

```bash
# Download and import regional extract
OSM_DATA_URL="https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf" \
OSM_DATA_FILE="utah-latest.osm.pbf" \
make download-osm

make db-seed
make db-update  # Daily updates
```

### For Planet OSM (Full Global Dataset)

**Recommended: Use pre-filtering + incremental updates**

```bash
# One command for complete setup
make setup-planet

# Daily updates (5-15 min instead of hours)
make db-update
```

**See [`docs/OSM_INCREMENTAL_UPDATES.md`](../docs/OSM_INCREMENTAL_UPDATES.md) for complete guide.**

### Manual Pre-filtering

```bash
# Local (requires osmium-tool)
cd data-pipeline
./prefilter_osm.sh

# Or use Docker
make prefilter-osm-docker

# Then import
export OSM_DATA_FILE=/app/data/planet-pois-filtered.osm.pbf
make db-seed
```

## Pre-filtering Benefits

The `prefilter_osm.sh` script uses `osmium-tool` to extract only relevant POIs before osm2pgsql processing.

**Why pre-filter planet OSM?**
- Reduces file size by 90-95% (~70GB → ~5GB)
- 10-20x faster osm2pgsql processing
- Smaller PostgreSQL database
- Enables practical incremental updates
- One-time cost for ongoing benefits

**What gets filtered?**
- Nodes/ways with `name` tag + POI tags
- Tags: `amenity`, `shop`, `leisure`, `tourism`, `office`, `craft`

**Usage:**
```bash
# Local (requires osmium-tool)
brew install osmium-tool
make prefilter-osm

# Docker (no local dependencies)
make prefilter-osm-docker
```

**For complete workflow, see:** [`docs/OSM_INCREMENTAL_UPDATES.md`](../docs/OSM_INCREMENTAL_UPDATES.md)

## Performance Comparison

| Dataset | Size | Import Time (unfiltered) | Import Time (filtered) |
|---------|------|-------------------------|------------------------|
| Utah extract | 145MB | ~2 min | N/A (already filtered) |
| US extract | 11GB | ~45 min | ~10 min (with pre-filter) |
| Planet OSM | 70GB | ~8 hours | ~45 min (with pre-filter) |

*Times are approximate and vary based on hardware*

## Advanced Usage

### Custom Filter Criteria

Edit `prefilter_osm.sh` to adjust the `osmium tags-filter` command:

```bash
# Example: Also include buildings
osmium tags-filter \
    "$INPUT_FILE" \
    -o "$OUTPUT_FILE" \
    nw/name= \
    nw/amenity \
    nw/shop \
    nw/building  # Add building tag
```

### Using Pre-filtered Data with Docker

```yaml
# In docker-compose.yml
services:
  data-pipeline:
    environment:
      - OSM_DATA_FILE=/app/data/planet-pois-filtered.osm.pbf
```

## Troubleshooting

**Error: osmium-tool not found**
```bash
brew install osmium-tool
```

**Pre-filtering takes too long**
- Pre-filtering planet OSM on a single thread takes ~30-60 minutes
- This is still much faster than processing unfiltered data with osm2pgsql
- osmium is single-threaded; use faster storage (SSD) for best results

**Out of disk space**
- Planet download: ~70GB
- Filtered output: ~5-7GB
- Ensure ~80GB free space before starting

**Want to skip pre-filtering?**
For regional extracts (state/country level), pre-filtering provides minimal benefit since they're already geographically filtered. Use them directly with osm2pgsql.
