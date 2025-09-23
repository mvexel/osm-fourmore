# FourMore

I have been a Swarm (née Foursquare) user since 2011. I love to go back in time and see places I have visited.

I also love OpenStreetMap, it's the best map of the world, but more than anything else, it's an amzing community of mapmakers.

So this project is an effort to bring the two together. A social check in app that uses OSM as its source for points of interest to look up, and encourages users to add information to OSM while they are out and about.

The MVP is a web app that just does the basic flow: Choose from a list of nearby places, tap on one, see details of the place, check in. The MVP also has a life log that lets you go back in time. It requires OSM sign in through OAuth2. It will be a typescript web app for the frontend and a Python API for the backend. An OSM POI database will need to be refreshed regularly. This is a United States MVP, we don't need to cover the world yet, but in the future we will.

From this MVP we will build this out to native mobile apps for Android and iOS using a to-be-determined framework.

## ✅ MVP Status: Complete!

The FourMore MVP has been fully implemented with:

- **Data Pipeline**: OSM data processing with pyosmium, PostgreSQL + PostGIS, weekly rebuilds
- **Python API**: FastAPI backend with OSM OAuth2, spatial queries, check-ins, user management
- **React Frontend**: Mobile-first web app with nearby places, check-in flow, and life log
- **List-based UI**: Clean interface focused on core functionality (mapping deferred to v2)

## Quick Start

```bash
# 1. One-command setup
./scripts/dev-setup.sh

# 2. Configure OSM OAuth credentials in .env file
# Get them from: https://www.openstreetmap.org/oauth2/applications

# 3. Load test data
./scripts/load-test-data.sh

# 4. Start development servers
./scripts/start-dev.sh
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