# Owner portal integration (2026-11-15)

## Keep/replace decisions
- Remote `OwnerBookingsPage` is the only approval/rejection screen at `/owner/bookings`. The local decision modal and duplicate order list have been removed. Clicking an event on the local calendar opens the corresponding remote booking card.
- Remote `OwnerTrackingPage`, Leaflet map, meeting points, browser location-sharing and SignalR are retained. `/owner/gps` renders the same real tracking UI as `/owner/tracking`; there is no hardware-GPS placeholder.
- Remote topbar and shared account sidebar are retained. The local interface-mode button/preference and separate management sidebar are removed. **Danh sách xe** and **Lịch xe** are added to the shared sidebar to expose the retained local views. Pending applicants can view their own vehicles without requiring an already-active owner role; backend ownership remains authoritative.
- Local vehicle list and 14-day calendar, vehicle filters, optimized artwork, timezone/half-open interval handling and honest loading/error states are retained.

## API comparison and consolidation
All former booking-list helpers called the same `GET /api/bookings/owner`; none has a faster server query. The local helper provided a 15-second timeout and caller cancellation; remote `owner-api.ts` already hosted vehicle registration and booking decisions. Keep `owner-api.ts` as the canonical owner API and merge those local safeguards into its authenticated request transport.

There is now one `OwnerBooking` type and one `getOwnerBookings` implementation, shared by calendar, tracking and approval pages. Private vehicle list (`/vehicles/mine`) and bounded availability blocks (`/vehicles/owner-blocks`) also live there. Images from `/api/` resolve against the configured backend origin. Existing multipart registration is retained without the short booking-request timeout.

Tracking-specific endpoints and `TrackingApiError` remain in `tracking-api.ts`, since location-sharing needs machine-readable error codes and HTTP 204 responses. They are not duplicate booking APIs. SignalR remains in its dedicated hook. Registration, approval and tracking never take caller-supplied owner identities or prices.

POST failures are never automatically retried. Network uncertainty tells the user to refresh first. Approval must return `AwaitingPayment`, not `Confirmed`. Backend authorization and transactional conflict checks remain authoritative.

## Retained backend contract
`GET /api/vehicles/mine` returns the caller's pending/rejected/approved vehicles with productionYear, seats, transmission, bodyType, pickupAddress, hourly/daily prices, image count and cover. Legacy null bodyType is not fabricated.

`GET /api/vehicles/owner-blocks?startAt=...&endAt=...` takes a valid interval of at most 31 days, derives owner identity from JWT, and returns overlapping half-open intervals. No new database migration is needed for these owner views; the separately merged tracking feature has its own migrations.

Calendar dates use Asia/Ho_Chi_Minh; a midnight return does not occupy the next day. Multiple hourly requests remain visible individually. Failed block loading never shows a misleading free price. Calendar refresh/poll updates both orders and blocks. Booking events lead to `/owner/bookings?bookingId=...`; expired pending requests cannot be approved in the UI.

## Verification
Run `npm run test:booking`, `npm run typecheck`, `npm run build` and `npm run build:admin`.

The local-only `tools/owner-portal-preview.mjs` fixture binds `127.0.0.1:5198`. Run Vite on 5175 with `VITE_API_URL=http://127.0.0.1:5198/api`. Its synthetic accounts/orders and tracking states are not production data. Do not enter real credentials into it.

Deployment follows the existing Vercel Git integration after changes are committed and pushed to `main`. No new backend deployment or database migration is required by this frontend integration.
