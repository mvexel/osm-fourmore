# FourMore Development Guide

This guide will help you set up and run the FourMore project locally for development.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ with npm
- Git

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd fourmore
    ```

2.  **Set up your environment:**
    - Create a `.env` file from the example: `cp .env.example .env`
    - Register an OAuth application on [OpenStreetMap](https://www.openstreetmap.org/oauth2/applications) with the redirect URI `http://127.0.0.1:3000/auth/callback`.
    - Update your `.env` file with the `OSM_CLIENT_ID` and `OSM_CLIENT_SECRET` from OSM.

3.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

4.  **Prepare the data:**
    - Download an OSM data file (e.g., from [Geofabrik](https://download.geofabrik.de/)) and place it in the `data` directory at the root of the project.

5.  **Start the development environment:**
    ```bash
    make up
    ```
    This will start the backend, database, and Redis.

6.  **Start the frontend:**
    ```bash
    cd frontend
    npm run dev
    ```
    Your application will be available at `http://localhost:3000`.

7.  **Initialize the database and load data:**
    ```bash
    # Create the database schema
    make init-db

    # Load the OSM data
    make load-data
    ```
    This command will automatically process the `.osm.pbf` file in your `data` directory. If you have multiple `.osm.pbf` files in the `data` directory, you will need to specify which one to use:
    `docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py full-rebuild --file-name your-file-name.osm.pbf`

## Development Workflow

-   **Start all services**: `make up` and `npm run dev` in the `frontend` directory.
-   **Stop all services**: `make down` and `Ctrl+C` in the frontend terminal.
-   **Wipe the database**: `make down` will remove the database volume. Run `make up` and `make init-db` to start fresh.
-   **Run tests**: (Instructions to be added)

## Environment Variables

The `.env` file in the project root is used to configure all services. For the frontend, only variables prefixed with `VITE_` are accessible.
