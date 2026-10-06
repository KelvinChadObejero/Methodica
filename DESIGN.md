# Methodica — Design System (Direction B: Focused Indigo)

This is the single source of truth for color and type across the project.
If you're starting a new screen, copy these values rather than eyeballing
them off a screenshot — screenshots drift, this file doesn't.

Implemented in `frontend/src/index.css` and on the live style-comparison
page. If you change a value, update it here first, then propagate it to
`frontend/src/index.css`.

## Why this direction

Two directions were compared (Editorial Sage — serif, sage green, academic
feel — vs. this one). We went with **Focused Indigo**: sharper and more
"study-tech tool" than "academic journal," leaning into the flow-builder/
canvas mechanic rather than the research angle. Kelvin's three Should-Have
screens (Sync Settings, Community Hub, Reflection) are already built
against these values.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F1F1F8` | `#14151F` | Page background |
| `--surface` | `#FFFFFF` | `#1C1E2C` | Cards, sidebar, inputs |
| `--ink` | `#181A2A` | `#ECEEF9` | Primary text |
| `--ink-soft` | `#63647A` | `#9A9BB5` | Secondary/muted text |
| `--accent` | `#4C4FE0` | `#8B8DF2` | Primary actions, active nav, links |
| `--accent-soft` | `#E3E3F7` | `#292B45` | Accent-tinted backgrounds (active nav item, icon chips) |
| `--line` | `#DCDCEC` | `#2C2E45` | Borders, dividers |
| `--amber` | `#E0703F` | `#E0703F` | Ratings/streaks only — not a primary or secondary action color |

Dark mode is automatic via `prefers-color-scheme`, or forced with
`data-theme="dark"` / `data-theme="light"` on `<html>`. Don't hardcode hex
values in components — always reference the CSS variable so dark mode
keeps working.

## Typography

- **Headings** (`h1`/`h2`/`h3`): Space Grotesk, weight 600.
- **UI text & body**: Inter, weights 400/500/600.
- Load both from Google Fonts:
  `family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700`

## Component conventions

- **Radius**: `10px` for cards/panels, `8px` for buttons/inputs/switches, `50%` for icon chips and avatars.
- **Buttons**: solid `--accent` fill + white text for primary actions; `ghost` variant (transparent bg, `--line` border, `--ink` text) for secondary actions like "Import" or "Dismiss."
- **Active nav item**: `--accent-soft` background, `--ink` text, small `--accent` dot.
- **Toggles/switches**: `--line` track when off, `--accent` when on, white thumb.
- **Cards**: `--surface` background, `1px solid --line` border, `10px` radius.

## Where this shows up today

- `frontend/src/index.css` — the implementation.
- `frontend/src/components/Sidebar.tsx` — nav pattern (active/disabled states).
- `frontend/src/screens/*.tsx` — Sync Settings, Community Hub, Reflection.

## Before Andrei starts on Must-Have 1–3

Build against these same tokens rather than re-deriving colors from the
wireframes (which were grayscale and never had real hex values). If a
screen needs a token that doesn't exist yet (e.g. a "danger" or "warning"
color for form validation), propose it here first so it's shared rather
than one-off.
