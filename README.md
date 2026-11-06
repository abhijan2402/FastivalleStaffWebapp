# Fastivalle Field Companion — React PWA

Staff panel for field agents and volunteers. Built with React, Context and Vite.

## Run locally

Requires Node.js 22.18+ or 24.12+.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:4173 and choose Field Agent or Volunteer to sign in using an existing staff account. Field agents are created in the admin panel. Signed-in field agents can create and manage volunteer accounts in the Volunteers section.

`VITE_API_BASE_URL` sets the API origin (default `https://api.fastivalle.org`). Do not include `/api` because endpoint paths already include it. The backend must allow this frontend's origin through CORS. Vite environment changes require a server restart or a production rebuild.

## API integration

Implemented from `Festivalle.postman_collection.json`:

- Field Agent: POST `/api/field-manager/auth/login`, GET `/api/field-manager/auth/profile`, POST `/api/field-manager/auth/logout`.
- Volunteer: POST `/api/volunteer/auth/login`, GET `/api/volunteer/auth/profile`, POST `/api/volunteer/auth/logout`.
- Volunteer management: GET/POST `/api/admin/volunteers`, GET/PATCH/DELETE `/api/admin/volunteers/:id`. Field agents can create, view, edit name/phone, search, and delete volunteers with confirmation. The list is paginated and reloads after successful mutations. The collection provides no URL for volunteer activation/deactivation, so no status toggle is exposed.
- Families: GET/POST `/api/admin/receivers` and GET/POST `/api/admin/receivers/:receiverId/family-members`. PATCH/DELETE `/api/admin/receivers/:id` and PATCH/DELETE `/api/admin/receivers/:id/family-members/:memberId` are connected through Manage family. The live family list displays Active/Inactive and filters directly from receiver isActive; missing flags display Unknown and only appear under All families. Receiver edits update names and optionally replace profilePic; member edits update names. Existing families also support adding members. Registration creates the receiver first, then saves additional members using its returned ID. The authenticated bearer token is sent; backend permission failures are shown directly. A failed member save can be retried in the same form without recreating the receiver or previously confirmed members.
- Food management: GET/POST `/api/admin/food-events`, PATCH/DELETE `/api/admin/food-events/:id`, and PATCH `/api/admin/food-events/:id/status`. Field agents can create and edit events, activate/deactivate them, set the documented `IN_PROGRESS` status, and confirm deletion. Every successful mutation reloads the server list, including when the mutation returns an empty response. Lists use pagination. Distribution timezone defaults to the device timezone and can be changed before entering the date and time. Timestamps include the selected timezone’s date-specific UTC offset; nonexistent or ambiguous daylight-saving times are rejected. Pack counts and costs use whole-number steps; budgets are sent as decimal strings. Create and PATCH payloads include `timezone`, `mealType` (`SINGLE_MEAL`/`FULL_DAY`), `mealsPerPerson`, `currency` and `isActive`. Food items are objects with `name`, positive numeric-string `quantity`, `unit` and decimal-string `price`; quantities and line-item prices support decimals without spinner controls. Single meals use one meal per person; full-day events allow a positive integer count, initially three. Editing restores the saved timezone and item details. Legacy string food items and objects with null quantity/unit/price still display by name. Missing details are blank in the edit form and must be completed before saving in the new format. Item totals do not overwrite the event budget, and served counts are never reset during edits.
- Serving event list: GET `/api/volunteer/food-events?dateScope=today_and_upcoming&limit=20&offset=0`, with pagination, for both volunteer and field agent serving flows. Backend permissions remain authoritative for field agent access to these volunteer routes.
- Eligibility: GET `/api/volunteer/food-events/:eventId/receivers/:receiverId/eligible-members`, with bearer auth and no request body. Food assignment: POST `/api/volunteer/food-events/:eventId/assign` with `{ receiverId, personIds }`; the receiver uses `SELF`, and family members use server IDs. The live serving flow chooses an event first, then scans a receiver QR, loads eligibility, selects members and assigns food on the server. Failed/uncertain assignments require checking eligibility before resubmission; POSTs are never retried automatically. Event counts refresh after confirmed success.
- QR/eligibility contracts: the supplied collection has no sample responses. QR parsing currently accepts a plain receiver ID, this app’s legacy `receiverId:version`, or JSON containing `receiverId`, `receiver.id` or `id`. Eligibility accepts arrays or `eligibleMembers`/`members`/`familyMembers`/`persons`/`people` arrays, with optional receiver details and a separate `self` entry. Members need unique `personId`/`id` values; self entries map to `SELF`. Explicit eligibility/assignment flags are respected, malformed responses block assignment. Confirm these shapes against real backend responses before release.

Bearer tokens live in session storage, are checked through the profile API on reload, and are cleared on logout or HTTP 401. Passwords are never persisted. Profiles are read-only because the collection provides no staff profile-update API. API requests have timeouts and error states, and events can be refreshed manually or on reconnection. Responses currently support `data` envelopes, login `accessToken`/`token`/`tokens.accessToken`, profile objects or `user`/`fieldManager`/`volunteer` objects, and event arrays or `foodEvents`/`events`/`items`/`results` lists. The collection contains no saved responses; these response shapes must be confirmed against the deployed backend.

Family registration and listing now use the documented receiver and family-member APIs, including their `/api/admin` paths. Backend authorization determines whether the staff account may use them. Families are loaded from the server without falling back to local demo families on errors. Manage family supports editing receiver/member names, adding members, and confirming receiver/member deletion. Every saved family has a printable QR containing its stable receiver ID, immediately after registration and after reload. This QR identifies the receiver for server eligibility checks; it does not require a local “complete family” action. Regeneration/deactivation controls remain demo-only because no live QR lifecycle endpoints are documented. All-time meal totals remain sample data. Live food assignment uses the documented serving endpoints. Today's meals and remaining packs are derived from API events. The explicit demo build retains its local serving simulation; live serving never records a simulated success. Failed food-management requests leave the existing server records displayed; a failed list refresh shows an error without substituting demo events. If a create/edit request has an uncertain outcome, its form prevents resubmission and asks the user to refresh the list before trying again. Server family responses stay in memory and are fetched again after reload. Family registration and Manage family offer camera capture and photo upload, with a preview and automatic compression. Camera and uploaded photos are resized to at most 1280 pixels on the longest side and encoded as JPEG, reducing quality or dimensions further to stay within 250 KB. Uploads up to 20 MB are accepted; saving waits for compression to finish. Manage family shows the current photo and keeps it unless a replacement is selected and saved. Photo registration (POST) and replacement (PATCH) send the compressed JPEG file in multipart FormData under profilePic, alongside the receiver fields. The browser sets Content-Type and its multipart boundary; bearer authentication is preserved. Requests without a photo continue to use JSON. Demo-only photos are stored locally as data URLs. Live family QR codes are regenerated from the same server receiver ID after each reload. Static sample records are shared within this browser; they are not synchronized or authoritative serving records. Field-agent account management remains in the admin panel. Volunteer account management is available to field agents here; backend permissions remain authoritative.

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

`npm test` runs domain rules plus browser tests with mocked API responses for event-first QR serving, eligibility, assignment (including failures and repeat-serving protection), authentication, profile loading, live event mapping, session restoration, logout, expired sessions, request failures, receiver registration, member registration, family reloads, partial member saves, food-event creation/editing/status/deletion, volunteer creation/detail/edit/deletion, agent-only access, family edits/deletions, pagination, and permission failures. It does not verify production credentials, CORS, or response contracts against the real backend. The original demo browser suite runs only with `VITE_DEMO_MODE=true`. Browser tests use port 4174; development uses 4173.

## Brand assets

The supplied full logo is stored as `public/brand-logo.png` and the orange app symbol as `public/brand-mark.png`. The originals are preserved. Sidebar, login, mobile header and printed family cards use the logo. Browser, Apple touch, and installable PWA icons use the orange symbol on a light background, with a separate padded maskable icon.

After replacing the source symbol, run `npm run icons` (requires the Playwright Chromium browser) to regenerate PNG icon sizes, then `npm run build` to refresh the offline asset cache.
