# Repository Guidelines

## Project Structure & Module Organization
FourMore is split per domain. `backend/app` houses the FastAPI API, with routers under `routers/`, SQLAlchemy models in `models.py`, and connection helpers in `database.py`. Shared Python helpers that can be imported by multiple services live in `fourmore_shared`. The React client resides in `frontend/src`, organized by feature (`pages/`), presentation (`components/`), state/hooks (`hooks/`), and API clients (`services/`). Cross-app TypeScript utilities are packaged under `shared/src`. Bulk data ingestion and ETL steps sit in `data-pipeline/src`, while raw `.osm.pbf` snapshots belong in `data/`.

## Build, Test, and Development Commands
Bring up the backend, database, and Redis with `make up`; tear them down via `make down`, or rebuild everything with `make rebuild` when schemas change. Initialize a new database with `make init-db` and refresh POI content using `make load-data`. Run the frontend locally from `frontend/` with `npm run dev`, create production bundles through `npm run build`, and keep code healthy with `npm run lint`.

## Coding Style & Naming Conventions
Follow PEP 8 in Python: four-space indentation, `snake_case` functions, and type hints on public interfaces. Keep FastAPI routers small and cohesive (`routers/checkins.py`, `routers/places.py`), injecting sessions with `Depends(get_db)` instead of instantiating engines inline. In TypeScript, prefer strict typing, PascalCase component files (`CheckinTimeline.tsx`), camelCase hooks/utilities, and colocate styles via Tailwind classes in the JSX. Re-export shared logic through index files to avoid deep relative paths.

## Testing Guidelines
Backend tests use `pytest` plus `pytest-asyncio`; store them in `backend/tests/` with filenames like `test_checkins.py`, and decorate async cases with `@pytest.mark.asyncio`. Execute the suite inside the dev container: `docker-compose -f docker-compose.dev.yml run --rm backend pytest`. Plan frontend tests alongside components (`ComponentName.test.tsx`) with React Testing Library so UI flows stay covered before shipping features.

## Commit & Pull Request Guidelines
Commits should be concise, present-tense imperatives—mirroring `git log` examples such as `add avatar` and `confirm guard`. Before opening a pull request, squash noisy commits, describe the user impact, list database or data-pipeline steps (`make init-db`, `make load-data`), and link relevant issues. Attach screenshots or GIFs for UI updates and note any manual migration or seed commands reviewers must run.

## Security & Configuration Tips
Never commit `.env` or real OSM OAuth secrets; share credentials through your team vault. Keep large geodata outside the repo and document download links instead of tracking binaries. Rotate JWT secrets for production deployments, and review `docker-compose.prod.yml` changes with infrastructure owners before merging.
