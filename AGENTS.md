# Repository Guidelines

## Project Structure & Module Organization
FourMore splits code per domain. The FastAPI backend lives in `backend/app` with routers under `routers/`, models in `models.py`, database helpers in `database.py`, and tests in `backend/tests`. React client code resides in `frontend/src` with pages, components, hooks, and services, while shared Python utilities sit in `fourmore_shared`, shared TypeScript helpers in `shared/src`, and data pipelines in `data-pipeline/src`. Store raw `.osm.pbf` snapshots under `data/`.

## Build, Test, and Development Commands
Use `make backend-dev` to build and start the FastAPI stack (Postgres, Redis, API) and `make frontend-dev` to run the React dev server directly on your host (install deps with `npm install` in `frontend/` first, then visit `http://127.0.0.1:3000`). Place real secrets in `.env.development.local` (gitignored) so the Makefile picks them up automatically. Production-ready builds run via `make backend-prod` and `make frontend-prod`. Initialize and seed the database with `make db-init-dev` and `make db-seed-dev` (swap `-dev` for `-prod` when needed). Frontend linting still runs with `npm run lint` in `frontend/`.
Need your own Postgres? Point `DATABASE_URL`/`DATABASE_HOST` at it (e.g., `host.docker.internal`) and run `USE_SYSTEM_DB=true make backend-dev` to skip the containerized database.

## Coding Style & Naming Conventions
Follow PEP 8 with four-space indents and type hints on public functions. Keep FastAPI routers focused, inject sessions with `Depends(get_db)`, avoid inline engines. Name TypeScript components in PascalCase (e.g., `CheckinTimeline.tsx`), hooks in camelCase, and colocate Tailwind styling in JSX. Re-export shared logic through index files to reduce deep relative imports.

## Testing Guidelines
Backend uses `pytest` and `pytest-asyncio`; place tests in `backend/tests/` named like `test_checkins.py`. Mark async tests with `@pytest.mark.asyncio` and execute the suite using `docker compose --env-file .env.development -f docker-compose.dev.yml run --rm backend pytest`. Co-locate frontend tests next to components as `<Component>.test.tsx` using React Testing Library; ensure critical flows stay covered before feature handoff.

## Commit & Pull Request Guidelines
Author commits in present-tense imperatives (`add avatar`, `confirm guard`). For PRs, squash noisy commits, explain user impact, link issues, and include any manual steps such as `make db-init-dev` or `make db-seed-dev`. Attach UI screenshots or GIFs for visual changes and call out schema or data-pipeline updates reviewers must run.

## Security & Configuration Tips
Never commit `.env` files or production secrets; share credentials through the team vault. Keep large geodata outside the repo and document download sources instead. Rotate JWT secrets for production deployments, and review changes to `docker-compose.prod.yml` with infrastructure owners prior to merging.
