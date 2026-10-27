# Contributing to Methodica

Two people, one repo. This is the whole process — no more, no less.

## Branches

- `main` is always deployable. Nothing gets pushed to it directly — branch protection enforces this.
- Branch names: `feature/short-description`, `fix/short-description`, e.g. `feature/sync-settings-api`, `fix/reflection-slider-reset`.

## Commits

Plain, descriptive, present tense: `add sync settings toggle state`, not `fixed stuff` or `wip`. Doesn't need to be Conventional Commits-strict — just needs to be readable six weeks from now.

## Pull requests

1. Push your branch, open a PR into `main`.
2. CI must pass (lint + build for whichever package you touched) — see `.github/workflows/ci.yml`.
3. The other person reviews before merge. Small PRs (one screen, one endpoint) get reviewed faster than giant ones — prefer several small PRs over one big one.
4. Squash-merge when it's approved and green.

## Before opening a PR

```bash
npm run lint      # inside frontend/ or backend/
npm test          # timer/analytics or HTTP persistence tests
npm run format    # auto-fixes formatting
npm run build     # must succeed
```

## Design decisions

Color, type, and component conventions live in `DESIGN.md` at the repo root — read it before building a new screen, don't eyeball values off a screenshot.

## Scope

Check `PROJECT_TODO.md` for task IDs, owners, priorities, dependencies and acceptance criteria. Claim a task there before starting so you do not duplicate work. Preserve the ownership in proposal section 9 and agree on unassigned leads at sprint planning. Link the task ID in your PR and ask the other teammate to review it.
