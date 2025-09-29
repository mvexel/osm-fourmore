# FourMore

I have been a Swarm (née Foursquare) user since 2011. I love to go back in time and see places I have visited.

I also love OpenStreetMap, it's the best map of the world, but more than anything else, it's an amazing community of mapmakers.

So this project is an effort to bring the two together. A social check-in app that uses OSM as its source for points of interest to look up, and encourages users to add information to OSM while they are out and about.

The MVP is a web app that just does the basic flow: Choose from a list of nearby places, tap on one, see details of the place, check in. The MVP also has a life log that lets you go back in time. It requires OSM sign in through OAuth2. It will be a typescript web app for the frontend and a Python API for the backend. An OSM POI database will need to be refreshed regularly. This is a United States MVP, we don't need to cover the world yet, but in the future we will.

From this MVP we will build this out to native mobile apps for Android and iOS using a to-be-determined framework.

## Quick Start

**Prerequisites**: Node.js 18+, Python 3.11+, PostgreSQL, Redis

```bash
# Get the code and setup environment
git clone [your-repo-url]
cd fourmore

# Create your local environment file
cp .env .env.local
# Edit .env.local with your OSM OAuth credentials and database settings

# Install dependencies
make install-frontend
make install-backend

# Start development (both frontend and backend)
make dev
```

Visit http://127.0.0.1:3000 to use the app (OSM OAuth requires 127.0.0.1).

### Database Setup

**Option 1: Local PostgreSQL + Redis (Recommended)**
```bash
# Install PostgreSQL and Redis locally
# Configure connection strings in .env.local
```

**Option 2: Docker Database**
```bash
make db-setup      # Start PostgreSQL + Redis in Docker
make db-seed       # Load OSM data (optional)
```

**Option 3: Managed Services**
Use managed PostgreSQL (Supabase, Neon) and Redis (Upstash) - just update the connection strings in `.env.local`.

## Development Philosophy

FourMore uses a **local-first development approach** for the fastest possible development experience:

- **Frontend & Backend**: Run locally with hot reload (not in Docker)
- **Database**: Your choice - local, Docker, or managed service
- **Production**: Fully containerized for reliable deployment

This gives you native debugging, instant hot reload, and minimal resource usage during development.

## Full Documentation

- [**DEVELOPMENT.md**](DEVELOPMENT.md) - Complete local development guide
- [**Architecture Overview**](#architecture) - How everything works together

## Architecture

```
┌─── Development ──────┐    ┌─── Production ────────┐
│ • Local services     │    │ • Docker containers  │
│ • Hot reload        │    │ • nginx + gunicorn   │
│ • Native debugging  │    │ • Health checks      │
│ • Fast iteration    │    │ • Log aggregation    │
└─────────────────────┘    └───────────────────────┘
         ↓                            ↓
┌─── Shared Data Layer ────────────────────────────┐
│ • PostgreSQL + PostGIS                          │
│ • OSM data pipeline (osm2pgsql + Lua)          │
│ • Redis caching                                 │
└──────────────────────────────────────────────────┘
```

### Core Features
- 📍 **Nearby Places**: Discover POIs from OpenStreetMap data
- ✅ **Check-ins**: Simple check-in flow with optional comments
- 📖 **Life Log**: Personal timeline of all your check-ins
- 🔐 **OSM Login**: Secure OAuth2 authentication with OpenStreetMap
- 🗺️ **View on Map**: Quick links to see places on OpenStreetMap

### Tech Stack
- **Data**: PostgreSQL + PostGIS, osm2pgsql, Python data pipeline
- **Backend**: FastAPI, SQLAlchemy, JWT auth, uvicorn (dev) / gunicorn (prod)
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Infrastructure**: Docker (production), Make (automation)

## Commands

### Development
```bash
make dev              # Start both frontend and backend
make frontend         # Start frontend only (Vite dev server)
make backend          # Start backend only (uvicorn with reload)
```

### Database
```bash
make db-setup         # Start PostgreSQL + Redis in Docker
make db-seed          # Load OSM data into database
```

### Production
```bash
make deploy           # Deploy full stack with Docker
make deploy-api       # Deploy backend + database + cache
make deploy-web       # Deploy frontend only
```

### Quality
```bash
make test-backend     # Run backend tests
make lint-backend     # Lint backend code
make test-frontend    # Run frontend tests
make lint-frontend    # Lint frontend code
```

### Utilities
```bash
make stop             # Stop all Docker services
make clean            # Clean up Docker resources
make help             # Show all available commands
```

## Environment Configuration

- **`.env`** - Default configuration (committed to git)
- **`.env.local`** - Your secrets and local overrides (gitignored)

The `.env.local` file automatically overrides any values from `.env`, so you only need to specify what's different for your local setup.

## Why This Approach?

**Local Development Benefits:**
- ⚡ Faster startup (no container overhead)
- 🔄 Instant hot reload (direct file system access)
- 🐛 Better debugging (native debugger support)
- 💾 Less resource usage (no virtualization)

**Production Benefits:**
- 🚀 Easy deployment (containerized consistency)
- 🔧 Environment parity (Docker ensures production consistency)
- 📦 Dependency isolation (containers prevent conflicts)

Perfect for solo development with the option to scale to team deployment when needed.