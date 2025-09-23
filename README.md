# FourMore

I have been a Swarm (née Foursquare) user since 2011. I love to go back in time and see places I have visited.

I also love OpenStreetMap, it's the best map of the world, but more than anything else, it's an amazing community of mapmakers.

So this project is an effort to bring the two together. A social check in app that uses OSM as its source for points of interest to look up, and encourages users to add information to OSM while they are out and about.

The MVP is a web app that just does the basic flow: Choose from a list of nearby places, tap on one, see details of the place, check in. The MVP also has a life log that lets you go back in time. It requires OSM sign in through OAuth2. It will be a typescript web app for the frontend and a Python API for the backend. An OSM POI database will need to be refreshed regularly. This is a United States MVP, we don't need to cover the world yet, but in the future we will.

From this MVP we will build this out to native mobile apps for Android and iOS using a to-be-determined framework.

## ✅ MVP Status: Complete!

The FourMore MVP has been fully implemented with:

- **Integrated Pipeline**: OSM data processing built into backend container
- **Python API**: FastAPI backend with OSM OAuth2, spatial queries, check-ins, user management
- **React Frontend**: Mobile-first web app with nearby places, check-in flow, and life log
- **Docker Deployment**: Production-ready containers with automated data loading

## 🚀 Quick Start

### Local Development
```bash
# Deploy locally with Docker
./deploy-local.sh

# Access the app at http://localhost:3000
# Backend API at http://localhost:8000
```

### VPS Production Deployment
```bash
# Copy project to your VPS
scp -r . user@your-vps:/tmp/fourmore

# Run on VPS
ssh user@your-vps
cd /tmp/fourmore
sudo ./deploy-vps.sh
```

Both scripts automatically handle:
- ✅ **Database Setup**: PostgreSQL + PostGIS
- ✅ **Utah Data Loading**: Optional OSM data population
- ✅ **Environment Configuration**: Automated setup
- ✅ **Service Management**: Start/stop/status commands

## 📖 Documentation

- [**SETUP.md**](SETUP.md) - Complete setup and development guide
- [**Architecture Overview**](#architecture) - How everything works together

## Architecture

```
┌─── Integrated Backend Container ────┐    ┌─── Frontend ────┐
│ • FastAPI + OSM Pipeline            │    │ • React + TS    │
│ • OSM data processing (pyosmium)    │────│ • Mobile-first  │
│ • PostgreSQL + PostGIS              │    │ • List-based UI │
│ • OSM OAuth2 + Spatial queries      │    │ • Life log      │
│ • Automated Utah data loading       │    │ • Docker Nginx  │
└──────────────────────────────────────┘    └─────────────────┘
```

### Core Features
- 📍 **Nearby Places**: Discover POIs from OpenStreetMap data
- ✅ **Check-ins**: Simple check-in flow with optional comments
- 📖 **Life Log**: Personal timeline of all your check-ins
- 🔐 **OSM Login**: Secure OAuth2 authentication with OpenStreetMap
- 🗺️ **View on Map**: Quick links to see places on OpenStreetMap
- 🏔️ **Utah Data**: Pre-loaded Utah POI database for testing

### Tech Stack
- **Backend**: FastAPI, SQLAlchemy, pyosmium, JWT auth
- **Frontend**: React, TypeScript, Tailwind CSS, Nginx
- **Database**: PostgreSQL + PostGIS
- **Deployment**: Docker Compose, automated SSL, data loading

### Deployment Options
- **Local**: `./deploy-local.sh` - Development with hot reload
- **Production**: `./deploy-vps.sh` - VPS with SSL, security, backups