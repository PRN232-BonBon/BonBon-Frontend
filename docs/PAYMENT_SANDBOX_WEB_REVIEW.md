# Payment web sandbox review

Source nhánh `review/payment-sandbox-web` từ main, giữ UI Booking/Owner/PaymentModal
và tracking của nhóm. Không merge nguyên nhánh Payment cũ.

Sửa persistence/recovery idempotency (migrate session key sang localStorage trước POST,
không fallback memory); runtime validation contract GET/POST; HTTP errors an toàn;
duplicate/tampered Return IDs; bounded polling+visibility+account scoping; che Trips
của account cũ và đóng modal khi chuyển account. Không coi thiếu reconciliation flag
là success. Không tự retry/create attempt khi kết quả chưa rõ.

Môi trường web staging và các bước admin/DB/merchant: xem
[runbook Backend](../../BonBon-Backend/docs/PAYMENT_SANDBOX_WEB_RUNBOOK.md).
`vite.payment-sandbox.config.ts` build artifact riêng, ép /api cùng origin staging,
không mang API production từ .env. Không dùng artifact sandbox để overwrite website production.

Lệnh kiểm tra:

```text
npm run build
npm run typecheck:payment
npm run build:payment-sandbox
npm test
```

Tests mock fetch/storage và clock, không gọi mạng/DB/VNPay. Không có sandbox E2E
hoặc giao dịch nào được thực hiện. Không tự deploy/push/merge main.

Kết quả: typecheck đạt;31 Node +23 Vitest tests passed; build thường,
build:payment-sandbox và build:admin đạt. Các cảnh báo Vite về SignalR annotation
và bundle lớn chưa xử lý vì ngoài phạm vi. Runtime dependencies không thay đổi;
chỉ bổ sung test tooling ở devDependencies. Vitest chạy ngoài filesystem sandbox
sau lỗi EPERM cache tạm, vẫn dùng mock fetch, không cần dịch vụ bên ngoài.

16 file thay đổi, chưa stage/commit:

```text
.gitignore
package.json
package-lock.json
src/components/portal/PaymentResultPage.tsx
src/components/portal/TripsPage.tsx
src/payment/payment-api.ts
src/payment/usePaymentStatus.ts
tests/payment.test.mjs
tests/payment/setup.ts
tests/payment/contract.test.ts
tests/payment/polling.test.tsx
tests/payment/trips.test.tsx
tsconfig.payment-tests.json
vite.payment-sandbox.config.ts
vitest.config.ts
docs/PAYMENT_SANDBOX_WEB_REVIEW.md
```
