# Customer order details and payment

## State contract

- `PendingApproval`: **Chờ xác nhận**; payment disabled.
- `AwaitingPayment`: **Đã xác nhận · Chờ thanh toán**; owner accepted, payment enabled only before pickup.
- `Confirmed`: **Đã thanh toán**; reached through verified backend payment processing, never a browser action.
- Completed/cancelled/rejected orders belong to trip history. Saved booking prices and terms are read from `GET /api/bookings/{id}`, not recalculated with the quote endpoint.

Trip cards and **Xem chi tiết** open the same order dialog. The quick payment action opens payment directly. Only one dialog is mounted; background content is inert, focus is trapped/restored, Escape closes, and the body is scroll-locked.

## Payment boundary

`POST /api/payments` sends only `bookingId`, the bearer token, and an account/booking-scoped `Idempotency-Key`. The same key survives remounts, network failures and page refreshes within the browser session. Concurrent calls share one promise. No automatic fresh payment attempt is created after an uncertain outcome.

The API's signed checkout URL is allowlisted to the existing VNPay Sandbox host/path. Its query is not modified. QR is rendered locally with `qrcode.react`, without a third-party QR service receiving the URL. This is a **camera-scannable link to VNPay checkout**, not a bank-transfer payload. The dialog explicitly explains that bank-app QR is supplied inside VNPay, and also offers **Mở VNPay trên thiết bị này**.

The authenticated status API is polled every 3 seconds, with request timeouts, visibility handling, expiry/15-minute limits, and a three-error cap before manual retry. Only `Succeeded` without `requiresReconciliation` displays success and refreshes trips. The **Tôi đã thanh toán** button only reads status; it cannot confirm payment. `/payment/result` ignores query-string success claims and checks the API by `paymentId`.

Production payment remains disabled until the backend is deliberately configured with a valid Sandbox merchant, callback URLs, and reviewed payment schema. A disabled/unavailable gateway shows a recoverable error, never a fabricated payable QR.

## Verification and evidence

`npm run test:booking` runs 31 tests for confirmation, eligibility, URL allowlisting, snapshot reads, idempotent creation and verified results. Run `npm run typecheck`, `npm run build` and `npm run build:admin` as build checks.

The loopback-only fixture `tools/booking-confirmation-preview.mjs` additionally serves three synthetic trip states and non-payable payment URLs. Start it, then Vite on port 5174 with `VITE_API_URL=http://127.0.0.1:5199/api`. No real customer credentials, production database or merchant transactions are involved. `/__scenario` controls isolated error/success/reconciliation cases for UI verification only; it is not bundled or deployed.

Browser checks: grey pending button, approved order detail and saved 5,000đ price, QR dialog, manual read-only status check, reconciliation notice, verified fixture success updating the list, Escape/focus/background behavior. Evidence images produced by this local fixture must be labelled as UI previews, not proof of an actual payment.
