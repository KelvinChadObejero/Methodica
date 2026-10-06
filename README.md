# Methodica

An evidence-based meta-learning and modular study-flow system — Web and
Mobile applications built on React + TypeScript.

## Structure

```
methodica/
  frontend/     React + TypeScript web app (Vite)
  backend/      Express + TypeScript API (placeholder scaffold — stack TBD)
  DESIGN.md     Shared color/type tokens — read before building any screen
```

## Team

- **Andrei Mesiah M. Canoy** — Must-Have 1–3 (Auth & Roles, Study-Flow Builder, StudyType Repository)
- **Kelvin Chad L. Obejero** — Should-Have 1–3 (Cross-Platform Sync, Community Hub, Post-Session Reflection) — implemented

## Getting started

```bash
cd frontend && npm install && npm run dev
```

```bash
cd backend && npm install && npm run dev
```

See `frontend/README.md` and `backend/README.md` for details on each.

Both packages have `npm run lint`, `npm run format`, and `npm run build`
— run these before opening a pull request. CI (`.github/workflows/ci.yml`)
runs the same checks automatically on every PR. See `CONTRIBUTING.md` for
the full workflow (branches, commits, review process).

## Before you build a new screen

Read `DESIGN.md` first — it has the color tokens and type choices both
of you agreed on (Direction B: Focused Indigo). Don't eyeball colors off
a screenshot.

## Docs

The full project proposal (objectives, architecture, ERD, functional and
non-functional requirements, timeline, risk register) and the wireframe
prototypes are tracked separately from this repo — check with the team
for the latest copies if you need them.
