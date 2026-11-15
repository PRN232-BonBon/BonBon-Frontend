# Local manual Payment — 15/11/2026

UPDATE: A new portable PostgreSQL instance and PaymentLocal environment are now ready.
The blockers below describe the OLD shared-test instance and are retained as history.
Use NEW credentials in Backend BonBon.API/.payment-local-accounts.local.json.
Current instructions: ../BonBon-Backend/docs/PAYMENT_LOCAL_MANUAL.md (sibling repo).
API5288 now verifies bonbon_payment_local at loopback55432; Payment is enabled only
there. UI5289 remains local. Choose AwaitingPaymentBookingId for a fresh checkout;
ProbeBookingId already has an automated Pending attempt. Public IPN remains unavailable.

Backend and Vite were started on loopback only, from review/payment-sandbox-web.
Do not switch branches while they are running.

- UI/login modal: http://127.0.0.1:5289/ (click Đăng nhập).
- Customer trips: http://127.0.0.1:5289/my-trips
- Owner approvals: http://127.0.0.1:5289/owner/bookings
- Result: http://127.0.0.1:5289/payment/result (requires a real paymentId to query).
- Backend health: http://127.0.0.1:5288/health

Use exactly 127.0.0.1, to keep the same browser storage scope and CORS origin.
Synthetic account credentials already exist in the Backend ignored file
BonBon.API/.payment-staging-accounts.local.json: customerEmail/customerPassword
and ownerEmail/ownerPassword. Open that file locally; never paste it into chat/Git.
No production credentials or accounts are needed.

Frontend start command (after Backend is ready):

```powershell
npm exec vite -- --config vite.payment-local.config.ts --mode payment-local
```

This config forces API=/api and proxies only to 127.0.0.1:5288. It does not use
production API values from .env and does not expose the dev server on the LAN.

## Verified and current blockers

Health verified bonbon_payment_test with PaymentStaging identity/schema marker guard;
Payment remains disabled. Both synthetic logins and mine/owner list endpoints work.
SPA paths above return200; disabled Return returns302 to the local result page.
Authenticated POST payments returned503 PAYMENT_DISABLED with payment row count
unchanged (0 before/0 after) for the existing synthetic booking. No checkout was created.

The existing test database is an older baseline: vehicle has only the original13
columns, missing catalog/discount/mileage/registration columns expected by current main.
Catalog and booking detail return500. The old AwaitingPayment booking starts in the
past, so the UI correctly disables payment. A healthy marker does not prove the newer
catalog schema is present. No schema was changed or migration executed.

Full manual booking/approval/checkout requires either a local PostgreSQL installation
(not currently available; installation needs consent) with a new isolated baseline,
or DBA-approved schema updates on the test database only. Never change bonbon.
Do not work around this by changing old decided booking dates, bypassing guards, or
enabling Payment without verified callbacks and reconciliation plan.

After schema approval: seed fresh synthetic PendingApproval and AwaitingPayment
bookings with future pickup through current Booking APIs; keep dates non-overlapping.
Customer creates a request; Owner logs in separately and approves it; Customer reloads
trips. With Payment disabled the UI should show unavailability, never success.
Without public HTTPS IPN readiness the current PaymentStaging guard intentionally
blocks enabling real sandbox checkout. Browser return alone cannot prove payment.
No mock gateway or fake success callback was installed.

No server/container changes, production writes, tunnel, transaction, commit or push.
Local app logs live under ignored Backend bin and Frontend node_modules/.tmp.
