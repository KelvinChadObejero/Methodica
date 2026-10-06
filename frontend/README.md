# Methodica — Frontend (Should-Have preview)

React + TypeScript implementation of the first 3 Should-Have requirements:

1. **Cross-Platform Synchronization** — `src/screens/SyncSettings.tsx`
2. **Template Sharing & Community Hub** — `src/screens/CommunityHub.tsx`
3. **Post-Session Metacognitive Reflection** — `src/screens/Reflection.tsx`

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Structure

```
src/
  App.tsx              screen switcher (swap for react-router later)
  index.css            design tokens + shared styles
  types.ts             shared TypeScript types
  components/
    Sidebar.tsx         nav — Must-Have items shown disabled until merged
  screens/
    SyncSettings.tsx
    CommunityHub.tsx
    Reflection.tsx
```

## Notes for merging with the Must-Have screens

- `Sidebar.tsx` already lists Dashboard / Flow Builder / StudyTypes as disabled
  nav items — flip `enabled: true` and point them at your partner's components.
- `App.tsx` uses local `useState` for the active screen. Once all 6 screens
  exist, swap this for `react-router-dom` routes instead.
- Data is currently hardcoded (`TEMPLATES` in `CommunityHub.tsx`, the sync
  toggle defaults, the sample session in `Reflection.tsx`). Each has a
  comment marking where the real API call goes, matching the ERD entities
  (`StudyFlow`, `SessionLog`, `User`).
