"""Main data pipeline CLI."""

import os
import logging
import click
import requests
from pathlib import Path
from database import create_tables
from osm_processor import process_osm_file, save_pois_to_db
from migrations import migrate_tags_to_jsonb, create_performance_indexes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@click.group()
def cli():
    """FourMore data pipeline CLI."""
    pass

@cli.command()
@click.option('--data-dir', default='./data', help='Directory to store data files')
@click.option('--url', help='URL to download OSM data from')
def download(data_dir: str, url: str):
    """Download OSM data file."""
    data_path = Path(data_dir)
    data_path.mkdir(exist_ok=True)

    if not url:
        url = os.getenv('OSM_DATA_URL', 'https://download.geofabrik.de/north-america/us-latest.osm.pbf')

    filename = url.split('/')[-1]
    file_path = data_path / filename

    logger.info(f"Downloading {url} to {file_path}")

    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"\rProgress: {progress:.1f}%", end='', flush=True)

        print(f"\nDownload completed: {file_path}")

    except requests.RequestException as e:
        logger.error(f"Error downloading file: {e}")
        raise

@cli.command()
def init_db():
    """Initialize database tables with optimizations."""
    logger.info("Creating database tables...")
    create_tables()
    logger.info("Running database migrations and optimizations...")
    migrate_tags_to_jsonb()
    create_performance_indexes()
    logger.info("Database initialized successfully with optimizations")

@cli.command()
@click.argument('osm_file')
def process(osm_file: str):
    """Process OSM file and populate database."""
    if not os.path.exists(osm_file):
        logger.error(f"OSM file not found: {osm_file}")
        return

    try:
        # Process OSM file
        pois = process_osm_file(osm_file)

        if not pois:
            logger.warning("No POIs found in the OSM file")
            return

        # Save to database
        save_pois_to_db(pois)

        logger.info(f"Pipeline completed successfully. Processed {len(pois)} POIs.")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise

@cli.command()
@click.option('--data-dir', default='./data', help='Directory to store data files')
@click.option('--url', help='URL to download OSM data from')
def full_rebuild(data_dir: str, url: str):
    """Run full data pipeline: download, process, and populate database."""
    logger.info("Starting full data pipeline rebuild...")

    # Step 1: Download data
    click.echo("Step 1: Downloading OSM data...")
    ctx = click.get_current_context()
    ctx.invoke(download, data_dir=data_dir, url=url)

    # Step 2: Initialize database
    click.echo("Step 2: Initializing database...")
    ctx.invoke(init_db)

    # Step 3: Process data
    click.echo("Step 3: Processing OSM data...")
    if not url:
        url = os.getenv('OSM_DATA_URL', 'https://download.geofabrik.de/north-america/us-latest.osm.pbf')
    filename = url.split('/')[-1]
    osm_file = os.path.join(data_dir, filename)
    ctx.invoke(process, osm_file=osm_file)

    logger.info("Full pipeline rebuild completed successfully!")

if __name__ == '__main__':
    cli()