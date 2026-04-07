# Decision Log

Track significant project/session decisions that are worth preserving but do not need a formal ADR.
Add entries proactively when the user makes a decision that affects workflow, priorities, or implementation constraints.

## 2026-04-07

### Planning documents are mandatory living documents

- A root `planning/` folder must exist.
- It must contain:
  - `work-log.md`
  - `decision-log.md`
  - `plan.md`
  - `project-memory.md`
- These documents must be revisited proactively at the start of each session.
- They should be treated as living documents and kept aligned with the current repo state and conversation state.

### Commit workflow

- Commits should be created proactively in logical chunks.
- Commit messages should use the Conventional Commits format.
- No pushing is allowed without explicit user permission.

### Immediate remediation priorities from the audit

- Prioritize security/correctness work before broad modernization:
  - fix account deletion semantics
  - add OAuth `state`
  - tighten secret/runtime validation as needed
- Follow with architecture/reliability work:
  - collapse duplicate DB bootstrap modules
  - stop schema mutation via startup `create_all()`
  - retire or rewrite stale migration/bootstrap paths
- Add tests before large-scale modernization work.
