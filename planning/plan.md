# Plan

This is the current prioritized, step-by-step plan agreed for the project.
Update it when priorities change, when steps complete, or when scope is added/removed.

## Current Priority Order

1. Fix security and correctness defects.
2. Remove architecture drift and fragile startup/bootstrap behavior.
3. Add meaningful automated tests and basic CI validation.
4. Modernize libraries/tooling in a controlled way after the codebase is protected by tests.

## Step-by-Step Plan

### Phase 1: Security and correctness

1. Fix account deletion so removing a user cannot delete shared/global quest response data incorrectly.
   - Status: completed on 2026-04-07.
2. Add OAuth `state` generation, storage, and callback validation.
   - Status: next active coding task.
3. Review auth/runtime secret handling and fail safely for production misconfiguration.

### Phase 2: Backend architecture cleanup

4. Consolidate duplicated DB/session bootstrap code in `backend/app/database.py` and `backend/app/db.py`.
5. Remove app-startup schema mutation via `Base.metadata.create_all(...)`.
6. Decide on the real migration story and align the codebase with it.
7. Retire or replace stale bootstrap code in `backend/migrate.py`.
8. Remove stale config/dependency surface such as unused Redis hooks and unused auth libs if they are truly dead.

### Phase 3: Tests and verification

9. Add backend tests for:
   - auth callback and auth guards
   - check-in creation/history/deletion
   - quest response behavior
   - account deletion behavior
10. Add focused frontend tests for:
   - generated category metadata usage
   - critical state selectors/hooks
   - one or two user-critical flows
11. Add lightweight CI or documented local verification that runs the relevant backend/frontend checks.

### Phase 4: Modernization

12. Upgrade frontend/tooling in deliberate slices, starting with the lowest-risk path.
13. Reassess React, Tailwind, ESLint, and Vite upgrade targets once tests exist.
14. Reassess backend dependency choices and remove drift between `uv` and Docker packaging.

## Current Session Status

- Audit complete.
- Docs drift addressed.
- Frontend generated metadata workflow verified.
- Account deletion fix completed and covered by a backend regression test.
- Next recommended coding task: Phase 1, Step 2.
