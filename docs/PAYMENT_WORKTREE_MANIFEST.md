# Payment integration worktree manifest — BonBon-Frontend

Branch: feature/sepay-payment-integration. Base origin/main: e5dcdb93571486b39c6b9d624481d817e859201f.
Người dùng cho phép commit/push nhánh feature sau khi staged scan đạt; rủi ro credential lịch sử vẫn được ghi trong docs/PAYMENT_INTEGRATION_REVIEW.md. Danh sách chỉ source/config/example/test/docs; không secret/build output.

```text
.gitignore
docs/LOCAL_MANUAL_PAYMENT.md
docs/PAYMENT_INTEGRATION_REVIEW.md
docs/PAYMENT_SANDBOX_WEB_REVIEW.md
docs/PAYMENT_WORKTREE_MANIFEST.md
package-lock.json
package.json
src/components/booking/PaymentModal.tsx
src/components/portal/PaymentResultPage.tsx
src/components/portal/TripsPage.tsx
src/payment/LocalIpnSimulation.tsx
src/payment/payment-api.ts
src/payment/usePaymentStatus.ts
tests/payment.test.mjs
tests/payment/contract.test.ts
tests/payment/local-ipn-simulation.test.tsx
tests/payment/polling.test.tsx
tests/payment/setup.ts
tests/payment/trips.test.tsx
tsconfig.payment-tests.json
vite.config.ts
vite.payment-local.config.ts
vite.payment-sandbox.config.ts
vitest.config.ts
```
