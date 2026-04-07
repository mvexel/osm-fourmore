# Project Memory

Store repo-scoped facts the user explicitly asks to be remembered, unless the user says the information should become a user-level memory instead.
Review this file at the start of each session and keep it current.

## Remembered Instructions

### Planning discipline

- Keep a root `planning/` folder in this repository.
- Maintain these files proactively as living documents:
  - `planning/work-log.md`
  - `planning/decision-log.md`
  - `planning/plan.md`
  - `planning/project-memory.md`
- Revisit these documents proactively at the start of each session.
- Do not let them drift.

### Git workflow

- Commit proactively in logical chunks.
- Use Conventional Commit messages.
- Do not push without explicit user permission.

## Current Project Context

- The latest repo audit identified these top weak areas:
  - account deletion currently appears to remove shared quest data incorrectly
  - OAuth callback flow lacks `state`
  - backend DB bootstrap is duplicated and mutates schema on startup
  - backend has no committed tests
  - backend lint/style setup is noisy and misaligned
  - generated category metadata is required for frontend success and must be documented/managed explicitly
