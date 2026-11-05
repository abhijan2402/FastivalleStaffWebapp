# Fastivalle Field Companion — React PWA

Staff panel for field managers and volunteers. Built with React, Context and Vite.

## Run locally

Requires Node.js 22.18+ or 24.12+.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:4173 and choose Field Manager or Volunteer to sign in using an existing staff account. Field managers are created in the admin panel. Signed-in field managers can create and manage volunteer accounts in the Volunteers section.

`VITE_API_BASE_URL` sets the API origin (default `https://api.fastivalle.org`). Do not include `/api` because endpoint paths already include it. The backend must allow this frontend's origin through CORS. Vite environment changes require a server restart or a production rebuild.

## API integration

Implemented from `Festivalle.postman_collection.json`:

- Field Manager: POST `/api/field-manager/auth/login`, GET `/api/field-manager/auth/profile`, POST `/api/field-manager/auth/logout`.
- Volunteer: POST `/api/volunteer/auth/login`, GET `/api/volunteer/auth/profile`, POST `/api/volunteer/auth/logout`.
- Volunteer management: GET/POST `/api/admin/volunteers`, GET/PATCH/DELETE `/api/admin/volunteers/:id`. Field managers can create, view, edit name/phone, search, and delete volunteers with confirmation. The list is paginated and reloads after successful mutations. The collection provides no URL for volunteer activation/deactivation, so no status toggle is exposed.
- Families: GET/POST `/api/admin/receivers` and GET/POST `/api/admin/receivers/:receiverId/family-members`. PATCH/DELETE `/api/admin/receivers/:id` and PATCH/DELETE `/api/admin/receivers/:id/family-members/:memberId` are connected through Manage family. Receiver and member edits currently update names, matching the documented update bodies. Existing families also support adding members. Registration creates the receiver first, then saves additional members using its returned ID. The authenticated bearer token is sent; backend permission failures are shown directly. A failed member save can be retried in the same form without recreating the receiver or previously confirmed members.
- Food management: GET/POST `/api/admin/food-events`, PATCH/DELETE `/api/admin/food-events/:id`, and PATCH `/api/admin/food-events/:id/status`. Field managers can create and edit events, activate/deactivate them, set the documented `IN_PROGRESS` status, and confirm deletion. Every successful mutation reloads the server list, including when the mutation returns an empty response. Lists use pagination. Dates and times are entered in India time and sent with `+05:30`; budgets are decimal strings, food items are arrays, and served counts are never reset during edits.
- Volunteer food events: GET `/api/volunteer/food-events?limit=20&offset=0`, with pagination. The collection labels this listing POST; that request was reported as route-not-found by the live API. GET still needs confirmation with valid live volunteer credentials; the collection sample login is rejected. The panel uses GET, refreshes on entering Food events, and displays loading, errors, retry controls, and empty results on the screen. Events appear under Food events and today's active events appear in the sample processing flow.

Bearer tokens live in session storage, are checked through the profile API on reload, and are cleared on logout or HTTP 401. Passwords are never persisted. Profiles are read-only because the collection provides no staff profile-update API. API requests have timeouts and error states, and events can be refreshed manually or on reconnection. Responses currently support `data` envelopes, login `accessToken`/`token`/`tokens.accessToken`, profile objects or `user`/`fieldManager`/`volunteer` objects, and event arrays or `foodEvents`/`events`/`items`/`results` lists. The collection contains no saved responses; these response shapes must be confirmed against the deployed backend.

Family registration and listing now use the documented receiver and family-member APIs, including their `/api/admin` paths. Backend authorization determines whether the staff account may use them. Families are loaded from the server without falling back to local demo families on errors. Manage family supports editing receiver/member names, adding members, and confirming receiver/member deletion. QR issuance/validation, processing food, and all-time meal totals remain browser-local sample workflows because their APIs are absent. Today's meals and remaining packs are derived from API events. Sample processing records a local simulation without changing the API event's served count. Failed food-management requests leave the existing server records displayed; a failed list refresh shows an error without substituting demo events. If a create/edit request has an uncertain outcome, its form prevents resubmission and asks the user to refresh the list before trying again. Server family responses stay in memory and are fetched again after reload. Uploaded photos are available only in the demo form until a supported upload contract is provided. QR samples are local to the current session. Static sample records are shared within this browser; they are not synchronized or authoritative serving records. Field-manager account management remains in the admin panel. Volunteer account management is available to field managers here; backend permissions remain authoritative.

Set `VITE_DEMO_MODE=true` to run the original offline prototype with no API calls. Demo accounts use password `demo123`: `agent@fastivalle.demo` and `volunteer@fastivalle.demo`.

## Production and offline preview

```sh
npm run build
npm run preview
```

The build outputs static assets to `dist/` and generates a versioned service worker. Open the production app online before installing or testing cached shell reloads. HTTPS is required outside localhost. API requests are excluded from service-worker caching; live authentication and event refresh require a network connection. Development does not cache application assets.

## Verification

```sh
npx playwright install chromium
npm test
# Original static prototype regression suite:
VITE_DEMO_MODE=true npm run test:browser
```

`npm test` runs domain rules plus browser tests with mocked API responses for authentication, profile loading, live event mapping, session restoration, logout, expired sessions, request failures, receiver registration, member registration, family reloads, partial member saves, food-event creation/editing/status/deletion, volunteer creation/detail/edit/deletion, manager-only access, family edits/deletions, pagination, and permission failures. It does not verify production credentials, CORS, or response contracts against the real backend. The original demo browser suite runs only with `VITE_DEMO_MODE=true`. Browser tests use port 4174; development uses 4173.

## Brand assets

The supplied full logo is stored as `public/brand-logo.png` and the orange app symbol as `public/brand-mark.png`. The originals are preserved. Sidebar, login, mobile header and printed family cards use the logo. Browser, Apple touch, and installable PWA icons use the orange symbol on a light background, with a separate padded maskable icon.

After replacing the source symbol, run `npm run icons` (requires the Playwright Chromium browser) to regenerate PNG icon sizes, then `npm run build` to refresh the offline asset cache.
