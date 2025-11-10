# Deploying FourMore on Coolify (Resource-Per-Service)

These instructions describe how to deploy FourMore on Coolify **without** Docker
Compose. Each runtime concern (database, backend API, frontend, data pipeline)
gets its own Coolify resource/service so you can:

- Enable Coolify’s managed PostgreSQL backups.
- Auto-deploy backend/frontend whenever `main` changes.
- Run the data pipeline manually for the initial import and schedule
  incremental updates as a Coolify job.

The repo stays a monorepo—Coolify simply points each Git service at the relevant
subdirectory.

---

## 0. Prerequisites

- Coolify v4+ with at least one worker >= 2 vCPU / 8 GB RAM.
- DNS names ready for the frontend and backend.
- Access to a Docker registry or the public GitHub repo.
- Local copy of `.env` / `.env.local` so you can copy production secrets into
  Coolify.

---

## 1. Create the Coolify Project & Environments

1. Create a Coolify project named e.g. `fourmore`.
2. Add **three environments** inside that project:
   - `prod` – live backend + frontend.
   - `dev` – optional staging copy (same instructions as prod with different
     env vars / domains).
   - `data-pipeline` – isolated worker used for large OSM imports and cron
     updates.
3. When you create each Git service (backend, frontend, pipeline) you’ll point it
   at the **same repository URL** but set a different Base Directory. Coolify
   doesn’t track the repo at the project level, so you simply supply the URL
   during each service creation (or duplicate an existing service and change the
   Base Directory).

> Tip: Coolify lets you share resources (like PostgreSQL) across environments.
> You’ll create them once and link them where needed.

---

## 2. Shared Resources & Storage

| Resource | Purpose | Notes |
|----------|---------|-------|
| **PostgreSQL (PostGIS)** | Primary database | Use `postgis/postgis:15-3.4` or Coolify’s built-in Postgres image with PostGIS enabled. Attach a 150 GB+ volume at `/var/lib/postgresql/data`. Turn on automated backups in Coolify. |
| **Redis (optional)** | Backend caching/session store | Plain `redis:7-alpine` container, no persistence required. |
| **OSM data volume** | Holds downloaded `.osm.pbf` files and filtered output | Create a Coolify “Persistent Storage” named `osm-data` mounted at `/app/data` in the data pipeline service. 150 GB covers the planet download + filtered copy. |

Steps:

1. In `prod`, add **New Resource → PostgreSQL**. After creation, click the
   resource → **Backups** → enable the cadence you need.
2. (Optional) add **New Resource → Redis**.
3. In the `data-pipeline` environment, create **Persistent Storage** called
   `osm-data` mapped to `/app/data`.
4. When another service needs access to Postgres or Redis, use
   **Linked Resources → Add Existing → Select the resource**. Coolify injects
   connection details and secrets into the service’s environment variables.

---

## 3. Backend API Service

1. Environment: `prod`.
2. **New Service → Git → Dockerfile**.
3. Settings:
   - Repository: your FourMore repo URL.
   - Branch: `main`.
   - **Root Directory (a.k.a. “Base Directory”)**: `backend`.
   - Dockerfile path: `backend/Dockerfile`.
   - Auto Deploy: ✅ on push to `main`.
4. CPU/memory: start with 1 vCPU / 1 GB RAM (increase if needed).
5. Ports: expose container port `8000` (Coolify will proxy to HTTPS).
6. Link resources:
   - Link the PostgreSQL resource created earlier.
   - Link Redis if you provisioned it.
7. Environment variables (example):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>` (copy from linked resource details) |
| `REDIS_URL` | `redis://<redis_host>:6379/0` or leave empty if unused |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `LOG_LEVEL` | `INFO` |
| `JWT_SECRET_KEY` | Random 32+ byte secret |
| `OSM_CLIENT_ID` / `OSM_CLIENT_SECRET` / `OSM_REDIRECT_URI` | OAuth credentials |
| `VITE_API_BASE_URL` | Left unset (only frontend needs this) |
| Any `OSM_*` dataset overrides | Optional; defaults live in `.env` |

Coolify exposes the backend at the generated domain. Point your desired
`api.fourmore.example.com` at the Coolify server and enable HTTPS in the
service’s **Domains** tab.

---

## 4. Frontend Service

1. Environment: `prod`.
2. **New Service → Git → Dockerfile**.
3. Settings:
   - Root/Base Directory: `frontend`.
   - Dockerfile: `frontend/Dockerfile`.
   - Auto Deploy on `main`.
4. Build arguments / environment:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://api.fourmore.example.com` (or your backend URL) |

5. Expose port `80` (nginx inside the image) and assign your public frontend
   domain.

During the build, the Dockerfile’s generator stage runs the shared Python code
and copies generated TypeScript artifacts into `frontend/src/generated`, so no
extra steps are required.

---

## 5. Data Pipeline Environment

The data pipeline should not run constantly; instead you spin it up when you
need to ingest or update OSM data.

1. Switch to the `data-pipeline` environment.
2. Link the **existing PostgreSQL resource** so the pipeline can reach the same
   production database (Coolify allows sharing resources across environments).
3. Make sure the `osm-data` persistent storage is available in this environment.
4. **New Service → Git → Dockerfile** with:
   - Base directory: `data-pipeline`
   - Dockerfile: `data-pipeline/Dockerfile`
   - Auto Deploy on `main` (so new pipeline scripts ship automatically)
   - Attach the `osm-data` volume to `/app/data`
   - Override the start command to `sleep infinity` (keeps the container up so you
     can exec into it without immediately running an import)
5. Environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Same connection string as the backend |
| `OSM_DATASET` | `planet` (default) or a smaller preset |
| `OSM_DOWNLOAD_URL` / `OSM_DOWNLOAD_FILE` | Override if you want a specific Geofabrik extract |
| `OSM_DATA_FILE` | Usually `/app/data/planet-pois-filtered.osm.pbf` |

### Running the initial load

From the service view in Coolify:

1. **Run → Execute shell** (or “One-off command”) from `/app`:
   - Download planet (or preset): `DATA_DIR=/app/data ./scripts/download-osm.sh`
   - Pre-filter to POIs: `./prefilter_osm.sh`
   - Import / seed DB: `./run_osm2pgsql.sh`
2. Watch the logs; these commands operate against `/app/data` so downloads and
   filtered files persist across deployments.
3. Once `run_osm2pgsql.sh` completes, the backend health checks will start to
   pass in the `prod` environment.

> The container user is `fourmore`, so your commands should run from `/app`
> (default working directory). All helper scripts copied by the Dockerfile live
> there.

---

## 6. Scheduling Incremental Updates

Use a Coolify **Job** inside the `data-pipeline` environment:

1. **New Job → Cron Job** (still inside the `data-pipeline` environment).
2. Image: reuse the deployed `data-pipeline` service image (Coolify lets you
   clone its configuration) or point directly at the Git repo + Dockerfile.
3. Command: `./update_osm2pgsql.sh`
4. Schedule: daily (e.g., `0 3 * * *`) or more frequently if desired.
5. Link the same PostgreSQL resource and `osm-data` volume so replication state
   is preserved.

`update_osm2pgsql.sh` expects the filtered file and replication state created by
`run_osm2pgsql.sh`. If updates fall far behind, rerun the initial pipeline
command manually before re-enabling the cron job.

---

## 7. DNS, HTTPS, and Auto-Deploys

- In each service’s **Domains** tab, add the public hostname and enable
  Let’s Encrypt.
- Auto-deploy on push to `main` is handled per service; you can pause it if you
  need manual promotions.
- The backend and frontend services are stateless, so redeployments are quick.
  The database and `osm-data` volume retain state independently of service
  restarts.

---

## 8. Operations & Backups

- **Database backups**: manage from the PostgreSQL resource page. Coolify stores
  them in the configured provider; verify restore procedures periodically.
- **Disk usage**: exec into the `data-pipeline` service and run
  `du -sh /app/data` or `psql ... "SELECT pg_size_pretty(pg_database_size('fourmore'));"`
  inside the Postgres resource.
- **Updating code**: merge to `main` → Coolify rebuilds backend, frontend, and
  pipeline images independently. Pipeline cron jobs automatically pick up the
  latest image next run.
- **Environment secrets**: keep `.env.local` locally. In Coolify use
  **Secret Groups** or per-service env vars so nothing lives in the repo.

With this layout, Compose is no longer part of the production path—each Coolify
resource can be monitored, restarted, and scaled independently while still
sharing the same PostgreSQL backups and OSM data volume.
