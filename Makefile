SHELL := /bin/bash

# Default environment file
ENV_FILE := .env

.PHONY: help dev backend frontend db-setup db-seed db-update db-setup-dev db-seed-dev db-update-dev deploy stop clean setup-backend generate-mappings

help:
	@echo "FourMore - Simplified Development & Deployment"
	@echo "=============================================="
	@echo ""
	@echo "Development (local, no Docker):"
	@echo "  setup-backend - Setup backend virtual environment (uv)"
	@echo "  dev           - Start frontend and backend locally"
	@echo "  frontend      - Start frontend dev server (React + Vite)"
	@echo "  backend       - Start backend dev server (FastAPI + uvicorn)"
	@echo ""
	@echo " Database:"
	@echo "  db-setup      - Start database in Docker"
	@echo "  db-seed       - Load OSM data into database"
	@echo "  db-update     - Update OSM data in Docker database"
	@echo "  db-setup-dev  - Create User/CheckIn tables in local PostgreSQL"
	@echo "  db-seed-dev   - Load OSM data + create POI table in local PostgreSQL"
	@echo "  db-update-dev - Update OSM data in local PostgreSQL"
	@echo ""
	@echo " OSM Data Processing:"
	@echo "  prefilter-osm        - Pre-filter OSM for POIs (local, requires osmium)"
	@echo "  prefilter-osm-docker - Pre-filter OSM for POIs (Docker, no local deps)"
	@echo "  download-osm         - Download OSM extract (regional or planet)"
	@echo "  setup-planet         - Complete planet setup: download + filter + import"
	@echo "  test-incremental     - Test complete incremental update workflow locally"
	@echo ""
	@echo "Production Deployment:"
	@echo "  deploy        - Deploy full stack with Docker"
	@echo "  deploy-api    - Deploy backend only"
	@echo "  deploy-web    - Deploy frontend only"
	@echo ""
	@echo "Utilities:"
	@echo "  stop          - Stop all Docker services"
	@echo "  clean         - Remove all Docker containers and volumes"
	@echo "  generate-mappings - Regenerate category mapping outputs from JSON source"
	@echo ""
	@echo "Tips:"
	@echo "    • Create .env.local for your secrets (gitignored)"
	@echo "    • Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"

# ============================================================================
# Local Development (no Docker)
# ============================================================================

dev:
	@echo "Starting FourMore in development mode..."
	@echo "Frontend: http://127.0.0.1:3000"
	@echo "Backend: http://127.0.0.1:8000"
	@echo ""
	@echo "Make sure you have PostgreSQL and Redis running locally!"
	@echo "Press Ctrl+C to stop both services"
	@echo ""
	@trap 'kill %1 %2 2>/dev/null; wait' EXIT; \
	(cd frontend && npm run dev) & \
	(cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) & \
	wait

frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

backend:
	@echo "Starting backend development server (with virtual environment)..."
	cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# ============================================================================
# Database Operations
# ============================================================================

db-setup:
	@echo "Starting database services..."
	docker compose --profile database up -d
	@echo "Waiting for database to be ready..."
	@docker compose exec postgres bash -c 'until pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB >/dev/null 2>&1; do sleep 1; done'
	@echo "Initializing database schema..."
	@docker compose exec -T postgres bash -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB -f /docker-entrypoint-initdb.d/init-db.sql'

db-setup-dev:
	@echo "Setting up local development database schema..."
	@echo "Note: POI table will be created by osm2pgsql during db-seed-dev"
	cd backend && uv run python -c "from app.database import Base, engine; from app.database_models import User, CheckIn; Base.metadata.create_all(bind=engine, tables=[User.__table__, CheckIn.__table__])"
	@echo "User and CheckIn tables created! Run 'make db-seed-dev' to create POI table with data."

db-seed:
	@echo "Loading OSM data..."
	@echo "Starting database if needed..."
	docker compose --profile database up -d postgres
	@echo "Loading OSM data with data pipeline..."
	docker compose --env-file .env --env-file .env.local --profile database --profile data-pipeline run --rm data-pipeline

db-seed-dev:
	@echo "Loading OSM data into local development database..."
	@echo "Make sure your local PostgreSQL is running!"
	docker build -t fourmore-data-pipeline -f data-pipeline/Dockerfile .
	docker run --rm \
		-v "$(PWD)/data:/app/data" \
		--env-file .env \
		$(if $(wildcard .env.local),--env-file .env.local,) \
		fourmore-data-pipeline
	@echo "OSM data loaded into local database!"

db-update:
	@echo "Updating OSM data..."
	@echo "Starting database if needed..."
	docker compose --profile database up -d postgres
	@echo "Applying OSM updates with data pipeline..."
	docker compose --env-file .env --env-file .env.local --profile database --profile data-pipeline run --rm --entrypoint ./update_osm2pgsql.sh data-pipeline

db-update-dev:
	@echo "Updating OSM data in local development database..."
	@echo "Make sure your local PostgreSQL is running!"
	docker build -t fourmore-data-pipeline -f data-pipeline/Dockerfile .
	docker run --rm \
		-v "$(PWD)/data:/app/data" \
		--env-file .env \
		$(if $(wildcard .env.local),--env-file .env.local,) \
		--entrypoint ./update_osm2pgsql.sh \
		fourmore-data-pipeline
	@echo "OSM data updated in local database!"

# ============================================================================
# Production Deployment
# ============================================================================

deploy:
	@echo "Deploying full FourMore stack..."
	@if [ -f .env.local ]; then \
		docker compose --env-file .env --env-file .env.local --profile full up --build -d; \
	else \
		docker compose --profile full up --build -d; \
	fi
	@echo "Services available at:"
	@echo "  Frontend: http://127.0.0.1:3000"
	@echo "  Backend: http://127.0.0.1:8000"

deploy-api:
	@echo "🔧 Deploying backend API..."
	@if [ -f .env.local ]; then \
		docker compose --env-file .env --env-file .env.local --profile backend --profile database --profile cache up --build -d; \
	else \
		docker compose --profile backend --profile database --profile cache up --build -d; \
	fi

deploy-web:
	@echo "Deploying frontend..."
	@if [ -f .env.local ]; then \
		docker compose --env-file .env --env-file .env.local --profile frontend up --build -d; \
	else \
		docker compose --profile frontend up --build -d; \
	fi

# ============================================================================
# Utilities
# ============================================================================

stop:
	@echo "Stopping all services..."
	docker compose --profile full down

clean:
	@echo "Cleaning up Docker resources..."
	docker compose down -v --remove-orphans
	docker system prune -f

generate-mappings:
	@echo "Regenerating category mapping artifacts..."
	./scripts/generate-mappings.sh

# ============================================================================
# OSM Data Processing
# ============================================================================

prefilter-osm:
	@echo "Pre-filtering OSM data for POIs..."
	@echo "This will take 30-60 minutes for planet OSM"
	@command -v osmium >/dev/null 2>&1 || { echo "❌ osmium-tool not found. Install with: brew install osmium-tool"; exit 1; }
	cd data-pipeline && ./prefilter_osm.sh

prefilter-osm-docker:
	@echo "Pre-filtering OSM data using Docker..."
	@echo "This will take 30-60 minutes for planet OSM"
	docker build -t fourmore-data-pipeline -f data-pipeline/Dockerfile .
	docker run --rm \
		-v "$(PWD)/data:/app/data" \
		--entrypoint ./prefilter_osm.sh \
		fourmore-data-pipeline

download-osm:
	@echo "Downloading OSM extract..."
	./scripts/download-osm.sh

test-incremental:
	@echo "Testing incremental updates workflow locally..."
	@echo "This will download Rhode Island extract (~20MB) and test the complete workflow"
	./scripts/test-incremental-updates.sh

# Recommended workflow for planet OSM with incremental updates
setup-planet:
	@echo "🌍 Setting up planet OSM with incremental updates..."
	@echo ""
	@echo "Step 1/3: Downloading planet file (~70GB, will take hours)..."
	@mkdir -p data
	@cd data && curl -L --progress-bar --continue-at - \
		-o planet-latest.osm.pbf \
		https://ftp.osuosl.org/pub/openstreetmap/pbf/planet-latest.osm.pbf
	@echo ""
	@echo "Step 2/3: Pre-filtering for POIs (~60 min)..."
	@$(MAKE) prefilter-osm INPUT_FILE=data/planet-latest.osm.pbf OUTPUT_FILE=data/planet-pois-filtered.osm.pbf
	@echo ""
	@echo "Step 3/3: Initial import with --slim mode for future updates..."
	@OSM_DATA_FILE=/app/data/planet-pois-filtered.osm.pbf $(MAKE) db-seed
	@echo ""
	@echo "✅ Planet OSM setup complete!"
	@echo "   Run 'make db-update' daily/hourly for incremental updates"

# ============================================================================
# Backend-specific tasks (with uv virtual environment)
# ============================================================================

setup-backend:
	@echo "🔧 Setting up backend virtual environment with uv..."
	@command -v uv >/dev/null 2>&1 || { echo "❌ uv not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }
	cd backend && uv sync
	@echo "Backend virtual environment ready!"

install-backend: setup-backend
	@echo "Backend dependencies installed with virtual environment!"

test-backend:
	@echo "Running backend tests (in virtual environment)..."
	cd backend && uv run python -m pytest

lint-backend:
	@echo "Linting backend code (in virtual environment)..."
	cd backend && uv run python -m flake8 app/

# ============================================================================
# Frontend-specific tasks
# ============================================================================

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

build-frontend:
	@echo "Building frontend for production..."
	cd frontend && npm run build

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test

lint-frontend:
	@echo "Linting frontend code..."
	cd frontend && npm run lint
