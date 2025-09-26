"""OSM data processing using pyosmium."""

import logging
import psutil
import os
from typing import Dict, Set, Optional, Tuple, List, Iterator
from dataclasses import dataclass
import osmium
import osmium.geom
import osmium.filter
import gc
from sqlalchemy.orm import Session
from database import POI, SessionLocal
from profiler import profile_function, memory_profile

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

# POI categories based on OSM tags

@profile_function
@memory_profile
def process_osm_file_streaming(file_path: str, batch_size: int = 5000) -> None:
    """Process an OSM file and save POIs using streaming approach for memory efficiency."""
    logger.info(f"Processing OSM file with streaming: {file_path}")

    # Create POI category keys for filtering
    poi_keys = list(POI_CATEGORIES.keys())

    # Initialize database session
    db = SessionLocal()
    try:
        # Clear existing POIs (for full rebuild)
        logger.info("Clearing existing POIs...")
        db.query(POI).delete()
        db.commit()

        # Optimize session for bulk operations
        db.autoflush = False
        db.autocommit = False

        # Use faster transaction settings for bulk operations
        try:
            db.execute("SET synchronous_commit = off")
            db.execute("SET fsync = off")
            db.execute("SET full_page_writes = off")
        except Exception:
            # Ignore if these settings aren't supported
            pass

        total_processed = 0

        # Process in batches to maintain low memory usage
        for poi_batch in _process_osm_batches(file_path, poi_keys, batch_size):
            if poi_batch:
                _save_poi_batch_to_db(db, poi_batch)
                total_processed += len(poi_batch)

                if total_processed % 25000 == 0:  # Reduced logging frequency
                    memory_mb = _get_memory_usage_mb()
                    logger.info(f"Processed and saved {total_processed} POIs... Memory: {memory_mb:.1f}MB")
                    # Less frequent garbage collection
                    if total_processed % 50000 == 0:
                        gc.collect()

        logger.info(f"Successfully processed {total_processed} POIs from {file_path}")

    except Exception as e:
        logger.error(f"Error processing OSM file: {e}")
        db.rollback()
        raise
    finally:
        # Restore session defaults
        db.autoflush = True
        db.autocommit = False
        db.close()


def _process_osm_batches(file_path: str, poi_keys: List[str], batch_size: int) -> Iterator[List[POIData]]:
    """Generator that yields batches of POIs for memory-efficient processing."""
    try:
        # Create file processor with pre-filtering
        fp = osmium.FileProcessor(file_path) \
            .with_filter(osmium.filter.EmptyTagFilter()) \
            .with_filter(osmium.filter.KeyFilter(*poi_keys))

        # Use sparse storage for memory efficiency with large files
        fp = fp.with_locations('sparse_mem_array')

        # Initialize WKT factory
        wkt_factory = osmium.geom.WKTFactory()

        current_batch = []

        for obj in fp:
            # Use optimized extraction to minimize memory allocation
            poi_data = _optimize_poi_extraction(obj, wkt_factory)

            if poi_data:
                current_batch.append(poi_data)

                # Yield batch when it reaches the specified size
                if len(current_batch) >= batch_size:
                    yield current_batch
                    current_batch = []  # Reset for next batch

        # Yield remaining POIs in the last batch
        if current_batch:
            yield current_batch

    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise


def _save_poi_batch_to_db(db: Session, poi_batch: List[POIData]) -> None:
    """Save a batch of POIs to database with optimized bulk insert."""
    # Use bulk_insert_mappings for better performance than bulk_save_objects
    poi_mappings = []

    for poi_data in poi_batch:
        mapping = {
            'osm_id': poi_data.osm_id,
            'osm_type': poi_data.osm_type,
            'name': poi_data.name,
            'category': poi_data.category,
            'subcategory': poi_data.subcategory,
            'location': f'SRID=4326;POINT({poi_data.lon} {poi_data.lat})',
            'tags': poi_data.tags,
            'address': poi_data.address,
            'phone': poi_data.phone,
            'website': poi_data.website,
            'opening_hours': poi_data.opening_hours
        }
        poi_mappings.append(mapping)

    # Use bulk_insert_mappings for maximum performance
    db.bulk_insert_mappings(POI, poi_mappings)
    db.commit()

    # Clear mappings from memory immediately
    del poi_mappings


def _extract_poi_from_node(node, wkt_factory) -> Optional[POIData]:
    """Extract POI information from a node."""
    tags = dict(node.tags)
    
    category, subcategory = _categorize_poi(tags)
    if not category:
        return None
    if 'name' not in tags:
        return None    
    # Get name (prefer name, fall back to brand, operator, etc.)
    # name = (tags.get('name') or
    #         tags.get('brand') or
    #         tags.get('operator') or
    #         tags.get('amenity', '').replace('_', ' ').title())
    
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
    
    # Get name (prefer name, fall back to brand, operator, etc.)
    # name = (tags.get('name') or
    #         tags.get('brand') or
    #         tags.get('operator') or
    #         tags.get('amenity', '').replace('_', ' ').title())
    
    # Filter out features with no name
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


def _get_memory_usage_mb() -> float:
    """Get current process memory usage in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024


def _optimize_poi_extraction(obj, wkt_factory) -> Optional[POIData]:
    """Memory-optimized POI extraction that minimizes object creation."""
    # Fast path: check if object has relevant tags before full processing
    has_poi_tags = False
    for tag_key in POI_CATEGORIES:
        if tag_key in obj.tags:
            has_poi_tags = True
            break

    if not has_poi_tags:
        return None

    # Only create tags dict if we have POI tags
    tags = dict(obj.tags)

    # Quick name check
    if 'name' not in tags:
        return None

    category, subcategory = _categorize_poi(tags)
    if not category:
        return None

    # Extract location based on object type
    if obj.is_node():
        return _extract_poi_from_node_optimized(obj, tags, category, subcategory)
    elif obj.is_way():
        return _extract_poi_from_way_optimized(obj, tags, category, subcategory, wkt_factory)

    return None


def _extract_poi_from_node_optimized(node, tags: dict, category: str, subcategory: str) -> Optional[POIData]:
    """Optimized node extraction with minimal object creation."""
    # Build address only if components exist
    address = None
    addr_components = []
    for addr_key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
        if addr_key in tags:
            addr_components.append(tags[addr_key])
    if addr_components:
        address = ', '.join(addr_components)

    return POIData(
        osm_id=str(node.id),
        osm_type='node',
        name=tags['name'],
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


def _extract_poi_from_way_optimized(way, tags: dict, category: str, subcategory: str, wkt_factory) -> Optional[POIData]:
    """Optimized way extraction with minimal object creation."""
    try:
        # Quick validation
        if not all(n.location.valid() for n in way.nodes):
            return None

        # Determine geometry type and extract coordinates
        if way.is_closed() and any(k in tags for k in ['building', 'landuse', 'leisure', 'amenity']):
            try:
                wkt_geom = wkt_factory.create_polygon(way)
                if not wkt_geom or not wkt_geom.startswith('POLYGON'):
                    return None
                lat, lon = _extract_centroid_from_wkt(wkt_geom, 'POLYGON')
            except Exception:
                return None
        else:
            try:
                wkt_geom = wkt_factory.create_linestring(way)
                if not wkt_geom or not wkt_geom.startswith('LINESTRING'):
                    return None
                lat, lon = _extract_centroid_from_wkt(wkt_geom, 'LINESTRING')
            except Exception:
                return None
    except Exception:
        return None

    # Build address only if components exist
    address = None
    addr_components = []
    for addr_key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
        if addr_key in tags:
            addr_components.append(tags[addr_key])
    if addr_components:
        address = ', '.join(addr_components)

    return POIData(
        osm_id=str(way.id),
        osm_type='way',
        name=tags['name'],
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

# Legacy function kept for compatibility - use process_osm_file_streaming instead
@profile_function
@memory_profile
def process_osm_file(file_path: str) -> List[POIData]:
    """Legacy function - use process_osm_file_streaming for better memory efficiency."""
    logger.warning("Using legacy process_osm_file - consider using process_osm_file_streaming")

    pois = []
    poi_keys = list(POI_CATEGORIES.keys())

    try:
        fp = osmium.FileProcessor(file_path) \
            .with_filter(osmium.filter.EmptyTagFilter()) \
            .with_filter(osmium.filter.KeyFilter(*poi_keys))

        fp = fp.with_locations('sparse_mem_array')  # Use more memory efficient storage
        wkt_factory = osmium.geom.WKTFactory()
        processed_count = 0

        for obj in fp:
            poi_data = None

            if obj.is_node():
                poi_data = _extract_poi_from_node(obj, wkt_factory)
            elif obj.is_way():
                poi_data = _extract_poi_from_way(obj, wkt_factory)

            if poi_data:
                pois.append(poi_data)
                processed_count += 1

                if processed_count % 50000 == 0:
                    logger.info(f"Processed {processed_count} POIs...")
                    gc.collect()  # Force garbage collection periodically

    except Exception as e:
        logger.error(f"Error processing OSM file: {e}")
        raise

    logger.info(f"Extracted {len(pois)} POIs from {file_path}")
    return pois


@profile_function
@memory_profile
def save_pois_to_db(pois: List[POIData]) -> None:
    """Legacy function - integrated into streaming processor for better memory efficiency."""
    logger.warning("Using legacy save_pois_to_db - consider using process_osm_file_streaming")
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

        # Process in smaller batches for memory efficiency
        batch_size = 1000  # Reduced batch size for better memory usage
        total_batches = (len(pois) + batch_size - 1) // batch_size

        for i in range(0, len(pois), batch_size):
            batch = pois[i:i + batch_size]
            _save_poi_batch_to_db(db, batch)

            batch_num = i // batch_size + 1
            if batch_num % 10 == 0 or batch_num == total_batches:
                logger.info(f"Saved batch {batch_num}/{total_batches}")
                gc.collect()  # Force garbage collection every 10 batches

    except Exception as e:
        logger.error(f"Error saving POIs to database: {e}")
        db.rollback()
        raise
    finally:
        db.autoflush = True
        db.autocommit = False
        db.close()

    logger.info("Successfully saved all POIs to database")