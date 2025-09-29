SHELL := /bin/bash

# Default environment file
ENV_FILE := .env

.PHONY: help dev backend frontend db-setup db-seed db-setup-dev db-seed-dev deploy stop clean setup-backend

help:
	@echo "FourMore - Simplified Development & Deployment"
	@echo "=============================================="
	@echo ""
	@echo "🚀 Development (local, no Docker):"
	@echo "  setup-backend - Setup backend virtual environment (uv)"
	@echo "  dev           - Start frontend and backend locally"
	@echo "  frontend      - Start frontend dev server (React + Vite)"
	@echo "  backend       - Start backend dev server (FastAPI + uvicorn)"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  db-setup      - Start database in Docker"
	@echo "  db-seed       - Load OSM data into database"
	@echo "  db-setup-dev  - Create User/CheckIn tables in local PostgreSQL"
	@echo "  db-seed-dev   - Load OSM data + create POI table in local PostgreSQL"
	@echo ""
	@echo "🐋 Production Deployment:"
	@echo "  deploy        - Deploy full stack with Docker"
	@echo "  deploy-api    - Deploy backend only"
	@echo "  deploy-web    - Deploy frontend only"
	@echo ""
	@echo "🧹 Utilities:"
	@echo "  stop          - Stop all Docker services"
	@echo "  clean         - Remove all Docker containers and volumes"
	@echo ""
	@echo "💡 Tips:"
	@echo "    • Create .env.local for your secrets (gitignored)"
	@echo "    • Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"

# ============================================================================
# Local Development (no Docker)
# ============================================================================

dev:
	@echo "🚀 Starting FourMore in development mode..."
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
	@echo "🎨 Starting frontend development server..."
	cd frontend && npm run dev

backend:
	@echo "⚡ Starting backend development server (with virtual environment)..."
	cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# ============================================================================
# Database Operations
# ============================================================================

db-setup:
	@echo "🗄️  Starting database services..."
	docker compose --profile database up -d
	@echo "Waiting for database to be ready..."
	@docker compose exec postgres bash -c 'until pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB >/dev/null 2>&1; do sleep 1; done'
	@echo "Initializing database schema..."
	@docker compose exec -T postgres bash -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB -f /docker-entrypoint-initdb.d/init-db.sql'

db-setup-dev:
	@echo "🗄️  Setting up local development database schema..."
	@echo "Note: POI table will be created by osm2pgsql during db-seed-dev"
	cd backend && uv run python -c "from app.database import Base, engine; from app.database_models import User, CheckIn; Base.metadata.create_all(bind=engine, tables=[User.__table__, CheckIn.__table__])"
	@echo "✅ User and CheckIn tables created! Run 'make db-seed-dev' to create POI table with data."

db-seed:
	@echo "📊 Loading OSM data..."
	@echo "Starting database if needed..."
	docker compose --profile database up -d postgres
	@echo "Loading OSM data with data pipeline..."
	docker compose --env-file .env --env-file .env.local --profile database --profile data-pipeline run --rm data-pipeline

db-seed-dev:
	@echo "📊 Loading OSM data into local development database..."
	@echo "Make sure your local PostgreSQL is running!"
	docker build -t fourmore-data-pipeline -f data-pipeline/Dockerfile .
	docker run --rm \
		-v "$(PWD)/data:/app/data" \
		-e DATABASE_NAME=fourmore \
		-e DATABASE_HOST=host.docker.internal \
		-e DATABASE_PORT=5432 \
		-e DATABASE_USER=mvexel \
		-e DATABASE_PASSWORD="" \
		-e OSM_DATA_FILE=/app/data/utah-latest.osm.pbf \
		fourmore-data-pipeline
	@echo "✅ OSM data loaded into local database!"

# ============================================================================
# Production Deployment
# ============================================================================

deploy:
	@echo "🚀 Deploying full FourMore stack..."
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
	@echo "🌐 Deploying frontend..."
	@if [ -f .env.local ]; then \
		docker compose --env-file .env --env-file .env.local --profile frontend up --build -d; \
	else \
		docker compose --profile frontend up --build -d; \
	fi

# ============================================================================
# Utilities
# ============================================================================

stop:
	@echo "🛑 Stopping all services..."
	docker compose --profile full down

clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker compose down -v --remove-orphans
	docker system prune -f

# ============================================================================
# Backend-specific tasks (with uv virtual environment)
# ============================================================================

setup-backend:
	@echo "🔧 Setting up backend virtual environment with uv..."
	@command -v uv >/dev/null 2>&1 || { echo "❌ uv not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }
	cd backend && uv sync
	@echo "✅ Backend virtual environment ready!"

install-backend: setup-backend
	@echo "📦 Backend dependencies installed with virtual environment!"

test-backend:
	@echo "🧪 Running backend tests (in virtual environment)..."
	cd backend && uv run python -m pytest

lint-backend:
	@echo "🔍 Linting backend code (in virtual environment)..."
	cd backend && uv run python -m flake8 app/

# ============================================================================
# Frontend-specific tasks
# ============================================================================

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

build-frontend:
	@echo "🏗️  Building frontend for production..."
	cd frontend && npm run build

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test

lint-frontend:
	@echo "🔍 Linting frontend code..."
	cd frontend && npm run lint