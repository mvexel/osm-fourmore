# FourMore

I have been a Swarm (née Foursquare) user since 2011. I love to go back in time and see places I have visited.

I also love OpenStreetMap, it's the best map of the world, but more than anything else, it's an amzing community of mapmakers.

So this project is an effort to bring the two together. A social check in app that uses OSM as its source for points of interest to look up, and encourages users to add information to OSM while they are out and about.

The MVP is a web app that just does the basic flow: Choose from a list of nearby places, tap on one, see details of the place, check in. The MVP also has a life log that lets you go back in time. It requires OSM sign in through OAuth2. It will be a typescript web app for the frontend and a Python API for the backend. An OSM POI database will need to be refreshed regularly. This is a United States MVP, we don't need to cover the world yet, but in the future we will.

From this MVP we will build this out to native mobile apps for Android and iOS using a to-be-determined framework.

## Quick Start

```bash
# 1. Setup environment file
cp .env.example .env
# Edit .env with your OSM OAuth credentials from: https://www.openstreetmap.org/oauth2/applications

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Start development services (database + backend with hot reload)
docker-compose -f docker-compose.dev.yml up -d

# 4. Initialize database
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db

# 5. Load test data (Delaware - small and fast)
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline bash -c "
  cd /app/data &&
  wget https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/delaware-latest.osm.pbf
"

# 6. Start frontend
cd frontend && npm run dev
```

Visit http://localhost:3000 to use the app!

## Full Documentation

- [**SETUP.md**](SETUP.md) - Complete setup and development guide
- [**Architecture Overview**](#architecture) - How everything works together

## Architecture

```
┌─── Data Pipeline ────┐    ┌─── Backend API ───┐    ┌─── Frontend ────┐
│ • OSM data ingestion │    │ • FastAPI         │    │ • React + TS    │
│ • pyosmium processor │────│ • OSM OAuth2      │────│ • Mobile-first  │
│ • PostgreSQL+PostGIS │    │ • Spatial queries │    │ • List-based UI │
│ • Weekly rebuilds    │    │ • Check-ins       │    │ • Life log      │
└──────────────────────┘    └───────────────────┘    └─────────────────┘
```

### Core Features
- 📍 **Nearby Places**: Discover POIs from OpenStreetMap data
- ✅ **Check-ins**: Simple check-in flow with optional comments
- 📖 **Life Log**: Personal timeline of all your check-ins
- 🔐 **OSM Login**: Secure OAuth2 authentication with OpenStreetMap
- 🗺️ **View on Map**: Quick links to see places on OpenStreetMap

### Tech Stack
- **Data**: PostgreSQL + PostGIS, pyosmium, Python
- **Backend**: FastAPI, SQLAlchemy, JWT auth
- **Frontend**: React, TypeScript, Tailwind CSS
- **Infrastructure**: Docker Compose, automated data pipeline