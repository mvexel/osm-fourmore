import logging
import os
from pathlib import Path

import click
from dotenv import load_dotenv

from osm_processor import process_osm_file, save_pois_to_db

load_dotenv()

logging.basicConfig(level=logging.INFO)

DEFAULT_DATA_DIR = "/app/data"


@click.group()
def cli():
    """Commands for the data pipeline."""
    pass


@cli.command()
@click.option('--data-dir', default=DEFAULT_DATA_DIR, help='Directory containing OSM data.')
@click.option('--file-name', help='Name of the OSM PBF file. If not provided, the script will look for a single .osm.pbf file in the data directory.')
def process(data_dir, file_name):
    """Processes OSM data and loads it into the database."""
    logging.info("Step 1: Processing OSM data...")
    data_path = Path(data_dir)

    if file_name:
        file_path = data_path / file_name
    else:
        pbf_files = list(data_path.glob('*.osm.pbf'))
        if len(pbf_files) == 0:
            logging.error(f"No .osm.pbf file found in {data_dir}. Please place one there or specify a file name with --file-name.")
            return
        if len(pbf_files) > 1:
            logging.error(f"Multiple .osm.pbf files found in {data_dir}. Please specify which one to use with --file-name.")
            return
        file_path = pbf_files[0]

    if not file_path.exists():
        logging.error(f"Data file not found at {file_path}.")
        return

    logging.info(f"Processing file: {file_path.name}")
    pois = process_osm_file(str(file_path))
    save_pois_to_db(pois)
    logging.info("Finished processing OSM data.")


@cli.command()
@click.option('--data-dir', default=DEFAULT_DATA_DIR, help='Directory for OSM data.')
@click.option('--file-name', help='Name of the OSM PBF file. If not provided, the script will look for a single .osm.pbf file in the data directory.')
@click.pass_context
def full_rebuild(ctx, data_dir, file_name):
    """Performs a full rebuild of the data pipeline."""
    logging.info("Starting full data pipeline rebuild...")
    ctx.invoke(process, data_dir=data_dir, file_name=file_name)
    logging.info("Full data pipeline rebuild finished.")


if __name__ == '__main__':
    cli()
