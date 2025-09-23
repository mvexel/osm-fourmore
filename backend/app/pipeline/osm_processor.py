"""OSM data processing using pyosmium."""

import logging
from typing import Dict, Set, Optional, Tuple, List
from dataclasses import dataclass
import osmium
import osmium.geom
import osmium.filter
from sqlalchemy.orm import Session
from ..database import POI
from ..db import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class POIData:
    """Data class for processed POI information."""
    osm_id: str
    osm_type: str  # 'node', 'way', 'relation'
    name: Optional[str]
    category: str
    subcategory: Optional[str]
    lat: float
    lon: float
    tags: Dict[str, str]
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None

# POI categories based on OSM tags
POI_CATEGORIES = {
    'amenity': {
        'restaurant': 'food',
        'cafe': 'food',
        'bar': 'food',
        'pub': 'food',
        'fast_food': 'food',
        'food_court': 'food',
        'ice_cream': 'food',
        'bank': 'finance',
        'atm': 'finance',
        'hospital': 'healthcare',
        'clinic': 'healthcare',
        'pharmacy': 'healthcare',
        'dentist': 'healthcare',
        'veterinary': 'healthcare',
        'school': 'education',
        'university': 'education',
        'college': 'education',
        'library': 'education',
        'fuel': 'automotive',
        'parking': 'automotive',
        'car_wash': 'automotive',
        'car_repair': 'automotive',
        'place_of_worship': 'religion',
        'theatre': 'entertainment',
        'cinema': 'entertainment',
        'nightclub': 'entertainment',
        'casino': 'entertainment',
        'police': 'government',
        'fire_station': 'government',
        'post_office': 'government',
        'townhall': 'government',
        'courthouse': 'government',
    },
    'shop': {
        'supermarket': 'retail',
        'convenience': 'retail',
        'department_store': 'retail',
        'mall': 'retail',
        'clothes': 'retail',
        'shoes': 'retail',
        'electronics': 'retail',
        'books': 'retail',
        'bakery': 'food',
        'butcher': 'food',
        'seafood': 'food',
        'greengrocer': 'food',
        'hairdresser': 'services',
        'beauty': 'services',
        'laundry': 'services',
        'dry_cleaning': 'services',
    },
    'tourism': {
        'hotel': 'accommodation',
        'motel': 'accommodation',
        'hostel': 'accommodation',
        'guest_house': 'accommodation',
        'museum': 'attractions',
        'gallery': 'attractions',
        'zoo': 'attractions',
        'theme_park': 'attractions',
        'attraction': 'attractions',
        'viewpoint': 'attractions',
        'information': 'tourism',
    },
    'leisure': {
        'park': 'recreation',
        'playground': 'recreation',
        'sports_centre': 'recreation',
        'swimming_pool': 'recreation',
        'golf_course': 'recreation',
        'fitness_centre': 'recreation',
        'stadium': 'recreation',
    }
}

def process_osm_file(file_path: str) -> List[POIData]:
    """Process an OSM file and extract POIs using optimized FileProcessor approach."""
    logger.info(f"Processing OSM file: {file_path}")

    pois = []

    # Create POI category keys for filtering
    poi_keys = list(POI_CATEGORIES.keys())

    # Use FileProcessor with optimized filters for much better performance
    try:
        # Create file processor with pre-filtering to skip irrelevant objects
        fp = osmium.FileProcessor(file_path) \
            .with_filter(osmium.filter.EmptyTagFilter()) \
            .with_filter(osmium.filter.KeyFilter(*poi_keys))

        # Add location storage for ways that need geometry
        # Use flex_mem which automatically chooses optimal storage based on data size
        fp = fp.with_locations('flex_mem')

        # Initialize WKT factory for efficient geometry processing
        wkt_factory = osmium.geom.WKTFactory()
        processed_count = 0

        logger.info("Processing POIs with optimized filters...")

        for obj in fp:
            poi_data = None

            if obj.is_node():
                poi_data = _extract_poi_from_node(obj, wkt_factory)
            elif obj.is_way():
                poi_data = _extract_poi_from_way(obj, wkt_factory)
            # Skip relations for now as they're more complex

            if poi_data:
                pois.append(poi_data)
                processed_count += 1

                if processed_count % 50000 == 0:
                    logger.info(f"Processed {processed_count} POIs...")

    except Exception as e:
        logger.error(f"Error processing OSM file: {e}")
        raise

    logger.info(f"Extracted {len(pois)} POIs from {file_path}")
    return pois


def _extract_poi_from_node(node, wkt_factory) -> Optional[POIData]:
    """Extract POI information from a node."""
    tags = dict(node.tags)

    category, subcategory = _categorize_poi(tags)
    if not category:
        return None
    if 'name' not in tags:
        return None

    address_parts = []
    for addr_key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
        if addr_key in tags:
            address_parts.append(tags[addr_key])
    address = ', '.join(address_parts) if address_parts else None

    return POIData(
        osm_id=str(node.id),
        osm_type='node',
        name=node.tags.get('name'),
        category=category,
        subcategory=subcategory,
        lat=node.location.lat,
        lon=node.location.lon,
        tags=tags,
        address=address,
        phone=tags.get('phone'),
        website=tags.get('website'),
        opening_hours=tags.get('opening_hours')
    )


def _extract_poi_from_way(way, wkt_factory) -> Optional[POIData]:
    """Extract POI information from a way."""
    tags = dict(way.tags)

    category, subcategory = _categorize_poi(tags)
    if not category:
        return None
    if 'name' not in tags:
        return None

    try:
        # Check if all nodes have valid locations
        if not all(n.location.valid() for n in way.nodes):
            return None

        if way.is_closed() and any(k in tags for k in ['building', 'landuse', 'leisure', 'amenity']):
            # Treat closed ways with area tags as polygons
            try:
                wkt_geom = wkt_factory.create_polygon(way)
                if wkt_geom and wkt_geom.startswith('POLYGON'):
                    lat, lon = _extract_centroid_from_wkt(wkt_geom, 'POLYGON')
                else:
                    return None
            except Exception:
                return None
        else:
            # Treat as linestring and get middle point
            try:
                wkt_geom = wkt_factory.create_linestring(way)
                if wkt_geom and wkt_geom.startswith('LINESTRING'):
                    lat, lon = _extract_centroid_from_wkt(wkt_geom, 'LINESTRING')
                else:
                    return None
            except Exception:
                return None
    except Exception as e:
        logger.debug(f"Could not extract coordinates for way {way.id}: {e}")
        return None

    # Extract additional fields
    address_parts = []
    for addr_key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
        if addr_key in tags:
            address_parts.append(tags[addr_key])
    address = ', '.join(address_parts) if address_parts else None

    return POIData(
        osm_id=str(way.id),
        osm_type='way',
        name=way.tags.get('name'),
        category=category,
        subcategory=subcategory,
        lat=lat,
        lon=lon,
        tags=tags,
        address=address,
        phone=tags.get('phone'),
        website=tags.get('website'),
        opening_hours=tags.get('opening_hours')
    )


def _extract_centroid_from_wkt(wkt_geom: str, geom_type: str) -> Tuple[float, float]:
    """Extract centroid coordinates from WKT geometry string."""
    if geom_type == 'POLYGON':
        # Remove 'POLYGON((' and '))'
        coords_str = wkt_geom[9:-2]
        coords = coords_str.split(',')[0].strip().split()
        lon, lat = float(coords[0]), float(coords[1])
    elif geom_type == 'LINESTRING':
        # Remove 'LINESTRING(' and ')'
        coords_str = wkt_geom[11:-1]
        coords_list = [c.strip().split() for c in coords_str.split(',')]
        if coords_list:
            # Get middle point
            mid_idx = len(coords_list) // 2
            lon, lat = float(coords_list[mid_idx][0]), float(coords_list[mid_idx][1])
        else:
            raise ValueError("No coordinates found in linestring")
    else:
        raise ValueError(f"Unsupported geometry type: {geom_type}")

    return lat, lon


def _categorize_poi(tags: Dict[str, str]) -> Tuple[Optional[str], Optional[str]]:
    """Categorize a POI based on its tags."""
    for tag_key, tag_value in tags.items():
        if tag_key in POI_CATEGORIES:
            category_map = POI_CATEGORIES[tag_key]
            if tag_value in category_map:
                return category_map[tag_value], tag_value
            else:
                # Generic category for unspecified values
                return tag_key, tag_value
    return None, None

def save_pois_to_db(pois: List[POIData]) -> None:
    """Save POIs to the database with optimized bulk inserts."""
    logger.info(f"Saving {len(pois)} POIs to database...")

    db = SessionLocal()
    try:
        # Clear existing POIs (for full rebuild)
        logger.info("Clearing existing POIs...")
        db.query(POI).delete()
        db.commit()

        # Optimize session for bulk operations
        db.autoflush = False
        db.autocommit = False

        # Insert new POIs with bulk operations
        batch_size = 5000  # Larger batch size for better performance
        total_batches = (len(pois) + batch_size - 1) // batch_size

        for i in range(0, len(pois), batch_size):
            batch = pois[i:i + batch_size]
            poi_objects = []

            for poi_data in batch:
                poi_obj = POI(
                    osm_id=poi_data.osm_id,
                    osm_type=poi_data.osm_type,
                    name=poi_data.name,
                    category=poi_data.category,
                    subcategory=poi_data.subcategory,
                    location=f'SRID=4326;POINT({poi_data.lon} {poi_data.lat})',
                    tags=poi_data.tags,  # Store as dict, JSONB will handle serialization
                    address=poi_data.address,
                    phone=poi_data.phone,
                    website=poi_data.website,
                    opening_hours=poi_data.opening_hours
                )
                poi_objects.append(poi_obj)

            # Use bulk_save_objects for much faster inserts
            db.bulk_save_objects(poi_objects)
            db.commit()

            batch_num = i // batch_size + 1
            if batch_num % 10 == 0 or batch_num == total_batches:
                logger.info(f"Saved batch {batch_num}/{total_batches}")

    except Exception as e:
        logger.error(f"Error saving POIs to database: {e}")
        db.rollback()
        raise
    finally:
        # Restore session defaults
        db.autoflush = True
        db.autocommit = False
        db.close()

    logger.info("Successfully saved all POIs to database")