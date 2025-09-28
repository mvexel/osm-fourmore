# Category Mapping System

This document explains how the FourMore application handles POI category mapping between OpenStreetMap tags and our application categories.

## Overview

The category mapping system uses a **single source of truth** approach to avoid duplication and ensure consistency across the entire application stack.

### Architecture

```
category_mapping.json (source of truth)
├── generate_poi_mapping.py → poi_mapping.lua (osm2pgsql)
├── generate_category_ts.py → category_metadata.tsx (frontend)
└── categories.py API endpoint → dynamic category data
```

## Files and Responsibilities

### Source of Truth
- **`data-pipeline/category_mapping.json`** - The canonical definition of all categories
  - Contains class names, labels, icons, and OSM tag mappings
  - This is the **only file you should edit** to modify categories

### Generated Files (DO NOT EDIT)
- **`data-pipeline/poi_mapping.lua`** - Used by osm2pgsql to classify POIs during import
- **`frontend/src/generated/category_metadata.tsx`** - TypeScript metadata for frontend components

### API Endpoints
- **`/api/categories/`** - Returns all categories with metadata
- **`/api/categories/metadata`** - Returns frontend-formatted category data
- **`/api/categories/{category_class}`** - Returns specific category details

## Category Structure

Each category in `category_mapping.json` has:

```json
{
  "class": "restaurant",           // Unique identifier stored in database
  "label": "Restaurants",          // Human-readable label
  "icon": "IconToolsKitchen2",     // Tabler icon component name
  "matches": [                     // OSM tags that map to this category
    "amenity=restaurant",
    "amenity=food_court",
    "amenity=diner"
  ]
}
```

## How It Works

### 1. Data Import (osm2pgsql)
1. OSM data is processed by osm2pgsql using `poi_mapping.lua`
2. The Lua script matches OSM tags against the defined patterns
3. POIs are stored in the database with the appropriate `class` field

### 2. Frontend Display
1. Frontend components use the `class` field from POI data
2. `getCategoryIcon()` and `getCategoryLabel()` functions map classes to UI elements
3. All mappings come from the generated `category_metadata.tsx`

### 3. API Responses
1. Backend serves POI data with the `class` field
2. Category metadata is available via `/api/categories/` endpoints
3. All data derives from the same `category_mapping.json` source

## Making Changes

### Adding a New Category

1. Edit `data-pipeline/category_mapping.json`:
   ```json
   {
     "class": "new_category",
     "label": "New Category",
     "icon": "IconNewIcon",
     "matches": [
       "amenity=new_type",
       "shop=new_shop"
     ]
   }
   ```

2. Add the required icon import to `data-pipeline/src/generate_category_ts.py` if needed

3. Regenerate files:
   ```bash
   ./scripts/generate-mappings.sh
   ```

4. Rebuild frontend:
   ```bash
   cd frontend && npm run build
   ```

5. Re-import OSM data with updated mappings

### Modifying Existing Categories

1. Edit the category in `category_mapping.json`
2. Run `./scripts/generate-mappings.sh`
3. Rebuild affected components

### Adding OSM Tag Mappings

Simply add new patterns to the `matches` array:
```json
"matches": [
  "amenity=restaurant",
  "amenity=food_court",
  "amenity=new_restaurant_type"  // ← Add new mapping
]
```

## Development Workflow

### Quick Commands
```bash
# Full build (generate mappings + build frontend)
make build

# Just generate mappings
make generate-mappings

# Full rebuild (with Docker services)
make rebuild
```

### Manual Workflow
1. **Edit**: Modify `data-pipeline/category_mapping.json`
2. **Generate**: Run `./scripts/generate-mappings.sh`
3. **Build**: Rebuild frontend (`npm run build`)
4. **Test**: Verify changes in development environment
5. **Deploy**: Deploy updated frontend and backend

## Icon Requirements

- Icons must be available in `@tabler/icons-react`
- Use the exact component name (e.g., `IconToolsKitchen2`)
- Add imports to the TypeScript generator if using new icons

## Backward Compatibility

The frontend includes legacy mapping functions for backward compatibility:
- `LEGACY_AMENITY_TO_CATEGORY` - Maps old amenity-based categories
- `LEGACY_SHOP_TO_CATEGORY` - Maps old shop-based categories

These are automatically generated from the `matches` patterns in the JSON file.

## Troubleshooting

### Build Errors
- Ensure all icons exist in `@tabler/icons-react`
- Check that JSON syntax is valid
- Verify file paths in generators

### Missing Categories
- Check that OSM tags match the patterns in `matches`
- Verify the category exists in `category_mapping.json`
- Ensure generated files are up to date

### API Errors
- Verify `category_mapping.json` path in backend
- Check that backend includes the categories router
- Ensure JSON file is valid

## Benefits of This System

1. **Single Source of Truth** - No more manual synchronization
2. **Type Safety** - Generated TypeScript with proper types
3. **Consistency** - Frontend and backend always match
4. **Maintainability** - Easy to add/modify categories
5. **Performance** - No runtime category resolution needed
6. **Documentation** - Clear data flow and responsibilities