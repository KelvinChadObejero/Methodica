# Methodica — Backend (placeholder)

A minimal Express + TypeScript scaffold, not a finished API. It exists so
the frontend has something to point at and so the repo structure matches
the architecture in the proposal (Section 7.2) — it is **not** a stack
commitment on its own. Confirm the backend stack with the whole team
before building on top of this.

## Run it

```bash
npm install
npm run dev
```

Health check: `GET http://localhost:4000/health`

## What's here

- `src/index.ts` — app entry point, CORS + JSON body parsing, one
  `/health` route, and a comment block listing the route modules the
  proposal's ERD implies (`auth`, `flows`, `blocks`, `studytypes`,
  `sessions`, `community`, `analytics`). None of them exist yet.

## Not decided yet

- Database + ORM (proposal defaults to PostgreSQL + Prisma — not installed here)
- Auth strategy (proposal defaults to JWT + bcrypt — not installed here)
- Hosting target

Pick these up once the team has actually agreed on them, not just because
the proposal suggested a default.
