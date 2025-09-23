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

## 🚀 Quick Start (Simplified MVP)

### Prerequisites
- Docker (for database)
- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- ngrok (for public access)

### Run Locally

1. **Start everything:**
   ```bash
   ./start.sh
   ```

2. **Or start services manually:**
   ```bash
   # Start database
   docker compose up -d

   # Start backend
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   export DATABASE_URL="postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore"
   python -m uvicorn app.main:app --reload

   # Start frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

### Expose with ngrok

```bash
# Backend
ngrok http 8000

# Frontend
ngrok http 5173
```

### URLs
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8000
- **Database:** localhost:5432

### Environment Variables

The app expects these environment variables (defaults provided for local dev):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret for JWT tokens
- `ENVIRONMENT` - Set to "development" for local

### Stopping

Press `Ctrl+C` in the terminal running `./start.sh`, or:

```bash
docker compose down
```

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

### Simple Setup
Just databases + local development + ngrok for public access. No complex deployment needed for MVP.