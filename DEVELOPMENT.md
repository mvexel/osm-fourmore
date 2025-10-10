# FourMore Development Guide

This guide will help you set up and run the FourMore project locally for development using a **local-first approach** - meaning you'll run services directly on your machine for the fastest development experience.

## Prerequisites

- **Node.js 18+** with npm
- **Python 3.11+**
- **uv** (modern Python package manager) - [Install guide](https://docs.astral.sh/uv/getting-started/installation/)
- **PostgreSQL** (local installation or managed service like Supabase)
- **Redis** (local installation or managed service like Upstash)
- **Git**
- **Docker** (only for production deployment and data pipeline)

### Installing uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via package managers
brew install uv        # macOS
pipx install uv        # Cross-platform
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd fourmore
```

### 2. Environment Configuration

Copy the main environment file and customize it with your secrets:

```bash
# The .env file contains sensible defaults
# Create .env.local for your actual secrets (this file is gitignored)
cp .env .env.local
```

Edit `.env.local` to configure:
- Database connection string
- OSM OAuth credentials (register at [OpenStreetMap](https://www.openstreetmap.org/oauth2/applications))
- Optional: `OSM_ALLOWED_USERNAMES` / `OSM_ALLOWED_USER_IDS` (comma-separated lists) to control who can sign in
- JWT secret key
- Redis connection

### 3. Setup Services

**Option A: Local Services (Recommended for Development)**
```bash
# Install and start PostgreSQL locally
# Install and start Redis locally
# Or use managed services like Supabase + Upstash
```

**Option B: Docker Database (Alternative)**
```bash
# If you prefer to use Docker for the database
make db-setup
```

### 4. Install Dependencies

```bash
# Backend dependencies (creates virtual environment with uv)
make setup-backend

# Frontend dependencies
make install-frontend
```

### 5. Start Development

```bash
# Start both frontend and backend in development mode
make dev

# Or start them separately:
make frontend  # React dev server on http://127.0.0.1:3000
make backend   # FastAPI server on http://127.0.0.1:8000
```

### 6. Load Data (Optional)

```bash
# Load OSM data for your area
make db-seed
```

## Development Workflow

### Daily Development

The fastest development experience comes from running everything locally:

```bash
# Start both services
make dev

# Or individually:
make frontend  # Vite dev server with hot reload
make backend   # uvicorn with auto-reload
```

### Configuration Management

- **`.env`** - Default configuration (tracked in git)
- **`.env.local`** - Your local secrets and overrides (gitignored)

The `.env.local` file automatically overrides values from `.env`.

### Virtual Environment Management

The backend uses **uv** for fast dependency management and virtual environment isolation:

```bash
# Setup virtual environment (first time)
make setup-backend

# Run commands in the virtual environment
cd backend && uv run python your_script.py
cd backend && uv run pytest

# Add new dependencies
cd backend && uv add package_name

# Add development dependencies
cd backend && uv add --dev package_name

# Update all dependencies
cd backend && uv sync

# Activate virtual environment manually (optional)
cd backend && source .venv/bin/activate  # Linux/macOS
cd backend && .venv\Scripts\activate     # Windows
```

**Benefits of uv:**
- ⚡ **10-100x faster** than pip for installations
- 🔒 **Automatic virtual environment** creation and management
- 🔄 **Lock file support** for reproducible builds
- 🎯 **Better dependency resolution** than pip

### Model Architecture

FourMore uses a clean separation between different types of models:

- **SQLAlchemy Database Models** (`backend/app/database_models.py`) - Define database tables and relationships
- **Pydantic API Models** (`backend/app/models.py`) - Define API request/response schemas
- **Data Pipeline Schema** (`data-pipeline/pois.lua`) - osm2pgsql table definitions for populating data

This separation provides:
- ✅ **Clear responsibilities** - Each model type serves a specific purpose
- ✅ **Type safety** - Both database and API layers are strongly typed
- ✅ **Flexibility** - API can evolve independently of database schema
- ✅ **Validation** - Pydantic validates all API inputs/outputs

### Database Management

**Using Local PostgreSQL:**
```bash
# Connect to your local database
psql postgresql://fourmore:your_password@localhost:5432/fourmore
```

**Using Docker PostgreSQL:**
```bash
# Start database container
make db-setup

# Connect to containerized database
docker compose exec postgres psql -U fourmore -d fourmore
```

**Loading OSM Data:**
```bash
# Downloads and processes OSM data for Utah (configurable)
make db-seed
```

### Testing and Quality

```bash
# Backend
make test-backend
make lint-backend

# Frontend
make test-frontend
make lint-frontend
```

## Production Deployment

When you're ready to deploy, use Docker for production:

```bash
# Deploy full stack
make deploy

# Or deploy individual components
make deploy-api  # Backend + Database + Redis
make deploy-web  # Frontend only
```

## Architecture

### Development (Local)
```
┌─── Your Machine ──────────────────────────────────────────┐
│  Frontend (Vite)     Backend (uvicorn + uv venv)          │
│  ↓                   ↓                                    │
│  http://127.0.0.1:3000   http://127.0.0.1:8000           │
│                      ↓                                    │
│  Local PostgreSQL + Redis (or managed services)          │
└────────────────────────────────────────────────────────────┘
```

### Production (Docker)
```
┌─── Docker Compose ─────────────────────────────────────────┐
│  Frontend (nginx)    Backend (gunicorn)                   │
│  ↓                   ↓                                    │
│  :3000               :8000                                │
│                      ↓                                    │
│  PostgreSQL + Redis containers                            │
└────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Port Conflicts
- Frontend: Vite will automatically use the next available port if 3000 is taken
- Backend: Change `BACKEND_PORT` in your `.env.local`

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Or start with Docker
make db-setup
```

### Dependencies Issues
```bash
# Reset frontend dependencies
cd frontend && rm -rf node_modules package-lock.json && npm install

# Reset backend dependencies (recreate virtual environment)
cd backend && rm -rf .venv && uv sync

# Or use the make command
make setup-backend
```

### Environment Variables
```bash
# Debug environment loading
make backend  # Check if all variables load correctly
```

## Why This Approach?

**Local Development Benefits:**
- ⚡ **Faster startup** - No container overhead
- 🔄 **Instant hot reload** - Direct file system access
- 🐛 **Better debugging** - Native debugger support
- 💾 **Less resource usage** - No virtualization overhead
- 🔒 **Isolated dependencies** - Virtual environment prevents conflicts

**Production Benefits:**
- 🚀 **Easy deployment** - Containerized for consistent environments
- 🔧 **Environment parity** - Docker ensures production consistency
- 📦 **Dependency isolation** - Containers prevent version conflicts

This gives you the best of both worlds: fast local development with reliable production deployment.
