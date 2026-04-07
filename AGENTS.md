# Repository Guidelines

## Project Structure & Module Organization
- Backend FastAPI code lives in `backend/app`; routers sit in `backend/app/routers/`, Pydantic API models in `backend/app/models.py`, SQLAlchemy models in `backend/app/database_models.py`, and database helpers in `backend/app/database.py` / `backend/app/db.py`.
- Alembic migrations reside in `backend/migrations`. Keep new revisions there and note them in PRs.
- The React client is under `frontend/src` with `pages/`, `components/`, `hooks/`, `services/`, `types/`, and `utils/`; generated category metadata is written to `frontend/src/generated/`.
- Shared Python helpers are in `fourmore_shared/`. Keep data pipeline code in `data-pipeline/src` and large `.osm.pbf` extracts in `data/`.

## Build, Test, and Development Commands
- `make setup-backend` installs backend dependencies inside the uv-managed environment.
- `make generate-mappings` regenerates the frontend/data-pipeline category artifacts required for a clean frontend build.
- `make dev` starts FastAPI on `:8000` and Vite on `:3000`; requires local Postgres, while Redis is currently only provisioned for Docker/deployment scenarios.
- `make backend` or `make frontend` runs either service alone for focused debugging.
- `uv run pytest` (inside `backend/`) executes backend tests; `npm run lint` and `npm run build` (inside `frontend/`) handle linting and bundle checks.

## Coding Style & Naming Conventions
- Python follows `black` (88 chars) and `isort --profile black`; run `uv run black . && uv run isort .` before committing.
- Use snake_case for modules/functions, PascalCase for SQLAlchemy/Pydantic models.
- TypeScript relies on ESLint defaults; components and hooks are PascalCase (hooks prefixed with `use`), props/state stay camelCase. Keep Tailwind utilities inline unless shared patterns belong in `frontend/src/styles`.

## Testing Guidelines
- Backend tests use pytest (`test_*.py`, `Test*` classes) with `pytest-asyncio` for async endpoints. Keep fixtures lightweight.
- Frontend currently relies on `npm run lint` and `npm run build`; add Vitest + Testing Library specs under `frontend/src/__tests__/` when introducing frontend tests.
- Run `uv run pytest` and `npm run lint` prior to opening a PR; add coverage notes if gaps remain.

## Commit & Pull Request Guidelines
- Follow short, imperative commit messages (e.g., `map pin icon`, `privacy first analytics`); keep scope focused.
- PRs should include: concise summary, linked issue/TODO, verification steps (e.g., `uv run pytest`, `npm run lint`), and screenshots or curl samples for user-facing changes.
- Flag migrations or data loads so reviewers can reproduce with `make db-setup-dev` and `make db-seed-dev`.

## Security & Environment Tips
- Copy `.env` to `.env.local` for local secrets; `docker-compose.yml` loads both.
- Use `make db-setup` / `make db-seed` for Docker flows and `make db-update` to refresh OSM extracts. Keep raw extracts confined to `data/`.
