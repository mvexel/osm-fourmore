# Repository Guidelines

## Project Structure & Module Organization
FourMore keeps domains separated: the FastAPI backend lives in `backend/app` (routers in `app/routers/`, schemas in `app/schemas.py`, persistence helpers in `app/database.py`, migrations under `backend/migrations`), the React client sits in `frontend/src` with `pages/`, `components/`, `hooks/`, and `services/`, shared Python utilities live in `fourmore_shared/`, shared TypeScript helpers in `shared/src/`, and data pipelines in `data-pipeline/src`. Store `.osm.pbf` snapshots in `data/`.

## Build, Test, and Development Commands
- `make setup-backend`: install backend dependencies in a uv environment.
- `make dev`: start FastAPI (`:8000`) and Vite (`:3000`) together; requires local Postgres and Redis.
- `make backend` / `make frontend`: run either service alone while debugging.
- `uv run pytest` (inside `backend/`): execute backend tests.
- `npm run lint` / `npm run build` (inside `frontend/`): run ESLint + TypeScript checks and build the bundle.
- `make db-setup-dev` → `make db-seed-dev`: prepare local Postgres tables and load OSM data.

## Coding Style & Naming Conventions
Python uses `black` (88 chars) and `isort` (`black` profile); run `uv run black . && uv run isort .` before committing. Use snake_case for modules and functions, PascalCase for SQLAlchemy and Pydantic models. TypeScript relies on ESLint: components and hooks are PascalCase (hooks prefixed with `use`), props and local state stay camelCase. Tailwind utilities stay inline with shared patterns promoted into `frontend/src/styles`. Keep secrets in `.env.local` (gitignored).

## Testing Guidelines
Pytest is configured via `backend/pyproject.toml` with `test_*.py` files and `Test*` classes. Keep fixtures lightweight and use `pytest-asyncio` for coroutine endpoints. Frontend coverage is minimal; add Vitest + Testing Library specs under `frontend/src/__tests__/` when modifying UI or formatting logic.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commits (`map pin icon`, `privacy first analytics`). Keep scope tight and run formatters before committing. Pull requests should note the change summary, linked issue or TODO, verification steps (`uv run pytest`, `npm run lint`), and screenshots or curl samples for user-facing updates. Flag migrations or data loads so reviewers can reproduce locally.

## Environment & Operations Tips
Copy `.env` to `.env.local` for local secrets; `docker-compose.yml` reads both. Use `make db-setup` / `make db-seed` for Docker workflows and `make db-update` to refresh OSM extracts. Keep raw extracts confined to `data/` and track operational notes in `docs/`.
