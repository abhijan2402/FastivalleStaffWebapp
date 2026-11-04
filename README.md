# Fastivalle Field Companion — React PWA

A responsive React application for Field Agents and Volunteers, based on Fastivalle Architecture v2. Uses React function components, hooks, Context, and Vite. Admin and receiver interfaces are excluded.

## Run locally

Requires Node.js 22.18+ or 24.12+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4173. The app initially opens as the demo Field Agent; use the profile button in the top bar to switch accounts.

Demo accounts (password `demo123`):

- Field Agent: `agent@fastivalle.demo`
- Volunteer: `volunteer@fastivalle.demo`

## Production and offline preview

```sh
npm run build
npm run preview
```

The build outputs static files to `dist/` and generates a versioned service worker that precaches the compiled React app. Open the production preview once online before testing offline reloads or installing. Offline caching is disabled in the development server to keep hot reload working. Production hosting needs HTTPS; localhost is also supported.

## Workflows

Field Agents register families with optional photos and unlimited members, complete families to issue QR cards, print/deactivate/regenerate cards, plan food units and scan to serve. Volunteers scan and process food entries, view their profile. Scanning uses camera QR decoding only. After scanning, staff review the card holder and family details, select self and/or members, press Next, then choose a current-date food event and Process food. One pack is recorded per selected person, with duplicate entries prevented per person and event. Food handover takes place outside the app. Inactive and replaced cards are rejected. The manager dashboard shows statistics and shortcuts only. Receivers have optional mobile and email fields; additional members include their relation to the receiver. Food items are entered individually and stored as an array. No community fields are used.

This is a frontend prototype: demo credentials, role restrictions and all data are browser-local, not production authentication. Existing demo data is retained from the original implementation. Seeded distributions use the current India calendar date; saved events retain their dates. Only events on today’s date can be processed. Offline scans persist with a pending flag. There is no backend, cross-device synchronization, actual payment integration or live dashboard. Duplicate protection is local to this browser. Milestones trigger every 50 demo meals; sample historical totals are illustrative. Fonts fall back to system sans-serif offline.

## Source layout

- `src/App.jsx`: application shell and role-based navigation
- `src/views/`: Overview, Families, Food Units, Scanner, screens
- `src/components/`: shared UI, dialogs, forms, and QR meal cards
- `src/state/WorkspaceContext.jsx`: application state, immutable updates, browser persistence, and role actions
- `src/lib/shareImpact.js`: shareable milestone images
- `src/domain.mjs`: family/card and serving rules
- `public/`: PWA manifest and application icons
- `scripts/generate-sw.mjs`: precache generation from production assets

## Verification

```sh
npx playwright install chromium
npm test
```

`npm run test:domain` runs business-rule tests. `npm run test:browser` builds and tests the production PWA, including offline reloads and the scanner-only screen. `npm run check` verifies the production build. Browser tests use port 4174 so the development server can keep running on port 4173.
# FastivalleStaffWebapp
