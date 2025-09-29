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

2.  **Set up environment variables:**
    - Copy `.env.example` to `.env` for local tooling: `cp .env.example .env`
    - Copy `.env.development` to `.env.development.local` (gitignored) and store secrets there. The Makefile automatically prefers the `.local` file.
    - Register an OAuth application on [OpenStreetMap](https://www.openstreetmap.org/oauth2/applications) with the redirect URI `http://127.0.0.1:3000/auth/callback`.
    - Add your OSM client credentials to `.env.development.local` (for Docker) and `.env` (for local scripts).

3.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    ```
    Repeat only when `package.json` changes.

4.  **Start services:**
    ```bash
    make backend-dev
    make frontend-dev
    ```
    Open the app at `http://127.0.0.1:3000` so OSM OAuth callbacks succeed.

5.  **Initialize and seed data (optional):**
    ```bash
    make db-init-dev
    make db-seed-dev
    ```

**Using system Postgres**: Update `.env.development` so `DATABASE_URL` points to your host instance (e.g., `postgresql://fourmore:password@host.docker.internal:5432/fourmore`) and start with:

```bash
USE_SYSTEM_DB=true make backend-dev
```

Also adjust `DATABASE_HOST`/`DATABASE_PORT` for the data pipeline if you plan to run `make db-seed-dev` against the external database.

## Development Workflow

### Starting Development

1.  **Backend stack** (API, Postgres, Redis):
    ```bash
    make backend-dev
    ```
    Services are available on:
    - Backend API & docs: http://127.0.0.1:8000
    - Postgres: localhost:5432
    - Redis: localhost:6379

2.  **Frontend:**
    ```bash
    make frontend-dev
    ```
    Vite binds to http://127.0.0.1:3000 (OSM OAuth requires the 127.0.0.1 host).

3.  **Stop containers:**
    ```bash
    make stop-dev
    ```

### Database Management

- **Initialize schema**: `make db-init-dev`
- **Seed from OSM snapshot**: `make db-seed-dev`
- **System Postgres**: manage schema/seed manually or point commands at your local instance

### Useful Commands

- **Stop containers**: `make stop-dev`
- **Production equivalents**: append `-prod` (e.g., `make backend-prod`)

## Deployment

### Frontend Deployment

The frontend is built as static files and can be deployed to any static hosting service:

1.  **Build for production:**
    ```bash
    cd frontend
    npm ci --only=production
    npm run build
    ```

2.  **Deploy options:**
    - Copy `frontend/dist/` contents to your web server
    - Use static hosting (Netlify, Vercel, GitHub Pages)
    - Serve with nginx/apache

### Backend Deployment

The backend runs in Docker containers. See `BACKEND_DEPLOYMENT.md` for detailed production deployment instructions.

## Architecture

- **Backend**: FastAPI (Python) running in Docker
- **Frontend**: React + Vite (TypeScript) running locally for development
- **Database**: PostgreSQL with PostGIS extensions
- **Cache**: Redis
- **Data Pipeline**: osm2pgsql with custom Lua scripts

## Environment Variables

The `.env` file in the project root configures backend services. Frontend environment variables must be prefixed with `VITE_` to be accessible.

## Troubleshooting

- **Port conflicts**: If port 3000 is in use, Vite automatically selects the next available port
- **Database connection issues**: Ensure the stack is running (`make backend-dev`) and rerun `make db-init-dev`
- **Frontend build issues**: Try deleting `node_modules` and `package-lock.json`, then run `npm install`
- **Docker issues**: Use `make stop-dev` to tear down containers and restart
