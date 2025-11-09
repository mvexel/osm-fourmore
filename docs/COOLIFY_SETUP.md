# Deploying FourMore on Coolify

The steps below walk through a full Coolify deployment with persistent storage, global
planet data, and automated imports.

## 1. Prerequisites

- A Coolify instance with at least 2 vCPU / 8 GB RAM worker available.
- Docker registry or GitHub repo access for this project.
- DNS entries ready for the frontend (`fourmore.example.com`) and backend (`api.fourmore.example.com`), pointing at your Coolify server.

## 2. Prepare Storage

Create **two** persistent volumes in Coolify:

1. **PostgreSQL data** – mount at `/var/lib/postgresql/data`
   - Size: 150 GB minimum if you plan to store the filtered planet + slim tables.
   - Increase to 250 GB+ if you expect long-term incremental updates or telemetry.
2. **OSM data** – mount at `/app/data`
   - Size: 150 GB to hold the raw 70 GB planet download, the 5–7 GB filtered file, and headroom.
   - You can shrink this if you store the raw planet elsewhere and only keep the filtered file.

## 3. Provision Databases and Cache

1. In Coolify, create a **PostgreSQL service** (official PostGIS image recommended, e.g., `postgis/postgis:15-3.4`).
2. Attach the `postgres-data` volume created above.
3. Note the generated credentials (DB name, user, password, hostname).
4. Optionally create a **Redis** service (`redis:7-alpine`) for caching; no persistent storage needed.

## 4. Deploy the FourMore Stack

1. Choose **“New Service → Git → Docker Compose”**.
2. Point Coolify at your Git repository and `main` branch.
3. In the Compose settings:
   - Leave the file path at `docker-compose.yml`.
   - Set the deployment profile to include `postgres`, `redis`, `backend`, `frontend`, and `data-pipeline`.
4. Under **Volumes**, map the shared OSM data volume to the stack:
   - e.g., `coolify_volume_osm-data:/app/data`
5. Under **Environment Variables**, copy values from `.env` and override:

   ```text
   # Core services
   DATABASE_URL=postgresql://fourmore:<password>@postgres:5432/fourmore
   REDIS_URL=redis://redis:6379
   ENVIRONMENT=production
   DEBUG=false

   # JWT + OAuth secrets (set real values)
   JWT_SECRET_KEY=...
   OSM_CLIENT_ID=...
   OSM_CLIENT_SECRET=...
   OSM_REDIRECT_URI=https://fourmore.example.com/auth/callback

   # Frontend
   VITE_API_BASE_URL=https://api.fourmore.example.com

   # Dataset controls
   OSM_DATASET=planet
   OSM_DOWNLOAD_FILE=planet-latest.osm.pbf
   OSM_DOWNLOAD_URL=https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf
   OSM_DATA_FILE=/app/data/planet-pois-filtered.osm.pbf
   ```

   Adjust hostnames, secrets, and dataset if you prefer a smaller Geofabrik extract.

6. Deploy the stack. The backend and frontend will fail until data exists, which is expected.

## 5. Download and Pre-filter the Planet

1. Open a shell into the `data-pipeline` service from Coolify.
2. Run the download helper:

   ```bash
   make download-osm
   ```

   This saves `planet-latest.osm.pbf` into `/app/data` (mapped to your persistent volume).

3. Pre-filter to POIs (30–60 min on SSD):

   ```bash
   make prefilter-osm
   ```

   The output `planet-pois-filtered.osm.pbf` stays in `/app/data`.

> Tip: If the server lacks `osmium-tool`, use `make prefilter-osm-docker` instead; it runs inside the pipeline container.

## 6. Seed the Database

1. Still inside the `data-pipeline` container, import the filtered file:

   ```bash
   make db-seed
   ```

   This runs `osm2pgsql` in `--slim` mode to enable future incremental updates.

2. Verify tables:

   ```bash
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pois;"
   ```

3. Once complete, the backend and frontend services will pass health checks automatically.

## 7. Enable Incremental Updates

1. With the same env vars in place, initialize replication and apply updates daily:

   ```bash
   make db-update
   ```

2. In Coolify, add a **cron job** that executes `make db-update` inside the `data-pipeline` container every night (or more frequently).

## 8. DNS and HTTPS

1. Assign domains to the frontend and backend services.
2. Enable HTTPS in Coolify (Let’s Encrypt) for each domain.
3. Update `VITE_API_BASE_URL` and `OSM_REDIRECT_URI` if the hostnames change, then redeploy.

## 9. Monitoring and Maintenance

- **Disk usage**:
  - `du -sh /app/data` inside the pipeline container.
  - `SELECT pg_size_pretty(pg_database_size('fourmore'));` inside Postgres.
- **Backups**:
  - Use Coolify’s Postgres backup feature or pg_dump to S3.
- **Upgrades**:
  - Pull the latest Git commit in Coolify and redeploy.
  - Re-run `make db-update` after long downtime to catch up on replication.

With these steps, you’ll have a Coolify deployment that can flex between regional extracts and the full planet dataset while keeping storage persistent across redeploys.
