# Work Log

This log is a running record of repo-level work completed in this project.
Update it proactively after each meaningful task so the session state remains recoverable.

## 2026-04-07 11:10 MDT

- Audited repository structure, runtime/tooling, and docs for drift.
- Verified project health with:
  - `uv run pytest` in `backend/` -> collected 0 tests.
  - `npm run lint` in `frontend/` -> initially failed before generated metadata was restored.
  - `npm run build` in `frontend/` -> initially failed because `frontend/src/generated/category_metadata.tsx` was missing.
  - `uv run python -m flake8 app/` in `backend/` -> failed with substantial style/unused import noise.
- Updated docs to match the current repo:
  - `README.md`
  - `DEVELOPMENT.md`
  - `AGENTS.md`
  - `Makefile`
  - `data-pipeline/README.md`
  - `docs/CATEGORY_MAPPING.md`
- Regenerated category artifacts with `make generate-mappings`.
- Re-verified frontend after regeneration:
  - `npm run lint` -> passes.
  - `npm run build` -> passes.
- Recorded high-priority review findings:
  - account deletion deletes shared quest history
  - OAuth flow lacks `state`
  - duplicate DB bootstrap modules and startup `create_all()`
  - no backend tests
  - backend lint config drift
  - stale runtime/config surface (`Redis`, `migrate.py`, unused deps)
- Established root `planning/` workspace with living documents:
  - `work-log.md`
  - `decision-log.md`
  - `plan.md`
  - `project-memory.md`

## 2026-04-07 11:13 MDT

- Added repo workflow rule from user:
  - make commits proactively in logical chunks
  - use Conventional Commit messages
  - never push without explicit permission

## 2026-04-07 11:18 MDT

- Fixed account deletion so it no longer deletes shared `quest_responses` rows.
- Added backend test bootstrap in `backend/tests/conftest.py`.
- Added focused regression test in `backend/tests/test_users.py` covering account deletion behavior.
- Verified with:
  - `uv run pytest` in `backend/` -> `1 passed`
- Observed follow-up modernization signal during test run:
  - Pydantic emits deprecation warnings for class-based `Config`; keep this for later cleanup, not part of this fix.

## 2026-04-07 11:27 MDT

- Added stateless OAuth `state` protection to the OSM login/callback flow.
- Backend changes:
  - login endpoint now generates signed short-lived OAuth state
  - callback now requires and validates `state` before token exchange
  - added auth regression tests
- Frontend changes:
  - callback page now requires `state`
  - auth API client now sends `code` and `state` together to the backend
- Verified with:
  - `uv run pytest` in `backend/` -> `3 passed`
  - `npm run lint` in `frontend/` -> passed
  - `npm run build` in `frontend/` -> passed
- Current follow-up warnings remain:
  - legacy Pydantic class-based `Config` deprecation warnings in backend models
