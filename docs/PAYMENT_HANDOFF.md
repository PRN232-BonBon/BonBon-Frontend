# BonBon Frontend Payment — handoff

Tài liệu kiến trúc, API/DTO, cấu hình, migration, sandbox và giới hạn nằm tại
[Backend PAYMENT_HANDOFF.md](../../BonBon-Backend/docs/PAYMENT_HANDOFF.md).
Nếu hai repo checkout ở vị trí khác, lấy `docs/PAYMENT_HANDOFF.md` từ BonBon-Backend.

Frontend React/TypeScript: `src/payment/` chứa contract/API, idempotency storage,
gateway allowlist và presentation; `src/components/payment/` chứa nút checkout và
trang kết quả; `TripsPage` lấy booking từ `/bookings/mine`; `App.tsx` route `/payment/result`.

- Không nhận credential VNPay trong Frontend. `VITE_API_URL` gồm `/api`; gateway
  allowlist chỉ sandbox cố định. Các biến VITE_* là public, build-time.
- Render nút chỉ Customer + booking AwaitingPayment từ mine; quyền và amount vẫn do DB quyết định.
- LocalStorage giữ key theo account+booking; retry/reload giữ key, malformed record
  fail closed. Không clear record để tạo giao dịch mới khi chưa rõ kết quả.
- Return/URL status không xác nhận thành công. JWT GET payment mới là nguồn hiển thị;
  `requiresReconciliation=true` luôn ưu tiên cảnh báo, kể cả Succeeded.
- Poll5s tối đa12 lượt, HTTP/network errors dừng; manual check chỉ GET. SPA host phải
  fallback index.html khi vào trực tiếp/reload. Login giữ URL/paymentId.
- Chưa có recovery/history theo booking hoặc UI tạo attempt mới có chủ đích sau terminal
  failure; chưa có UI VehicleOwner approval inbox, Wallet, refund hoặc reconciliation admin.

Kiểm tra an toàn: `npm run build`, `npm run typecheck:payment-staging`, `npm test`,
`npm run test:browser`. Browser regression intercept API, không phải VNPay E2E.
Không chạy `test:payment-staging` trong bàn giao vì suite đó dùng API testDB thật.

`vite.payment-staging.config.ts`, Playwright stage và Caddy là công cụ của những
giai đoạn trước; không tự deploy/mở tunnel. Nhóm tiếp nhận tự review môi trường.
Danh mục mọi thay đổi chưa commit: `PAYMENT_WORKTREE_MANIFEST.md`.
