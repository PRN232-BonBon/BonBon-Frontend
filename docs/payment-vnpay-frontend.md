# Giai đoạn 2D — Frontend Payment VNPay sandbox

## Contract đã đối chiếu từ Backend

Đã đọc PaymentController, PaymentRequests/Responses, PaymentService,
VnPayOptions và docs/payment-vnpay-sandbox.md trong BonBon-Backend.
Không sửa Backend hoặc cấu hình triển khai của Backend trong giai đoạn này.

| API thật | Request | Response |
| --- | --- | --- |
| POST /api/payments | JWT Customer; header Idempotency-Key; JSON { bookingId } | paymentId, bookingId, amount, currency, status, checkoutUrl nullable, expiresAt, isReplay |
| GET /api/payments/{paymentId} | JWT Customer sở hữu Booking | paymentId, bookingId, amount, currency, status, expiresAt, requiresReconciliation |
| GET /api/payments/vnpay/return | Tham số vnp_* gốc; Backend xác minh chữ ký | paymentId, status, requiresReconciliation, message |
| GET /api/payments/vnpay/ipn | VNPay gọi Backend | Không có lời gọi IPN từ Frontend |

JSON camelCase; decimal amount thành number, Guid/timestamp thành string.
Payment status chỉ gồm Pending, Processing, Succeeded, Failed, Cancelled.
"Chờ xác minh" và "Cần đối soát" là nhãn UI, không phải trạng thái mới gửi về server.
Succeeded + requiresReconciliation=true luôn hiển thị cần đối soát, không hiển thị
thành công. Không lấy kết quả thanh toán từ query string, localStorage hoặc Return.

401: đăng nhập lại; 403: sai quyền/Account hoặc Role không phù hợp; 404: không
tìm thấy giao dịch; 409: trạng thái/xung đột/cần đối soát; 503: disabled, cấu hình,
schema hoặc dịch vụ chưa khả dụng. UI dùng thông báo tiếng Việt, không hiển thị
raw server detail, token, URL đã ký hoặc thông tin cấu hình nhạy cảm.

## Luồng Chuyến của tôi

1. Chỉ lấy danh sách bằng GET /bookings/mine có JWT. Không có ô nhập BookingId
   tùy ý; PaymentButton được gắn vào các dòng dữ liệu từ endpoint này.
2. Chỉ Customer đang đăng nhập, Booking AwaitingPayment có nút thanh toán.
   Backend vẫn kiểm tra quyền thật; FE không thể thay thế phân quyền server.
3. Hiển thị totalAmount/currency từ Backend, không tính lại tiền thuê.
4. Khi người dùng bấm, lưu idempotency key theo accountId + bookingId trước POST.
   Không thay key khi lỗi mạng, reload, lỗi HTTP hoặc giao dịch chưa rõ. Không tự
   tạo attempt mới sau Failed/Cancelled; lần bấm tiếp mở kết quả attempt cũ.
5. Nếu đã nhớ paymentId, GET trạng thái trước. Terminal/đối soát/hết hạn đưa về
   trang kết quả. Pending còn hạn mới POST cùng key để lấy lại checkout URL.
6. Lưu paymentId trước redirect. Chỉ đi tới đúng HTTPS origin/path sandbox được
   cho phép. Chặn credentials trong URL, host giả, protocol lạ, production gateway.
7. Nếu amount/currency phản hồi khác giá đang hiển thị, dừng redirect, giữ mã giao
   dịch và yêu cầu tải lại chuyến. Không gửi giá từ browser cho Backend.

Kho localStorage chỉ chứa key và paymentId; không lưu checkout URL hay token mới.
Storage bị chặn/hỏng thì dừng trước POST, không tạo key thay thế mù quáng.
Ref khóa đồng bộ chống double-click; trạng thái loading giữ đến lúc điều hướng.
Rời trang/đổi tài khoản hủy request UI và không chuyển hướng bằng phản hồi cũ.
Khóa và unique index Backend vẫn là bảo vệ cuối cùng cho các tab/thiết bị đồng thời.

## Trang kết quả

Route /payment/result?paymentId=<Guid> nằm trong portal yêu cầu đăng nhập.
Header/AuthContext hiện có tiếp tục phụ trách đăng nhập/refresh token.
Trang gọi GET bằng JWT; chỉ GET trả trạng thái thật mới được hiển thị kết quả.

Nếu route nhận vnp_* thay vì paymentId, FE chuyển nguyên tham số đã decode/encode
đến endpoint Return thật để Backend xác minh và lấy ID. Response Return không
quyết định thành công: tiếp tục GET có JWT. Sau khi resolve, xóa tham số VNPay khỏi
URL bằng replaceState, chỉ giữ paymentId. Tham số lặp hoặc ID sai bị từ chối.

Pending/Processing tự cập nhật mỗi 5 giây, tối đa 12 GET trong lần vào trang.
Terminal/đối soát/lỗi/unmount dừng polling. Nút "Kiểm tra lại" do người dùng bấm
chỉ gọi một GET, không POST và không khởi động vòng tạo Payment mới.
Request có timeout 15 giây; không retry POST tự động. Lỗi mạng giữ nguyên key.
Khi hết lượt polling, UI nói rõ đã tạm dừng và không suy luận thất bại/thành công.

## Return flow hoàn thiện ở giai đoạn 2D.1

VNPay ReturnUrl cần trỏ đến HTTPS Backend /api/payments/vnpay/return/redirect.
Backend xác minh callback và đọc payment, sau đó HTTP 302 về URL cố định trong
PaymentReturn__FrontendResultUrl=/payment/result (phải gồm origin Frontend).
URL đích không được nhận từ query. FE nhận ?paymentId=<Guid>, giữ ID qua reload
hoặc đăng nhập tại chỗ bằng Header/AuthContext, rồi GET trạng thái bằng JWT.
Return không ghi Payment/Booking và không xác nhận thành công. JSON endpoint
/api/payments/vnpay/return vẫn giữ nguyên để resolver hiện tại tương thích.

Backend lỗi xác minh trả ?returnError=invalid; chưa khả dụng trả
?returnError=unavailable. FE hiển thị lỗi tương ứng, không suy luận thành công hoặc
tự tạo Payment. Không có ID đã xác minh thì không đoán ID; mở Chuyến của tôi để
kiểm tra attempt trước/hỗ trợ. Khi đồng thời có returnError và paymentId, hiển thị
lỗi trước, không gọi API bằng ID trong URL đó. Marker lỗi không phải chứng cứ
kết quả giao dịch và người dùng sửa URL cũng không thể xác nhận thanh toán.

## Giới hạn cần phối hợp Backend/configuration

- Cấu hình cũ trỏ /vnpay/return vẫn trả JSON. Chưa đổi cấu hình đang chạy; cần cấu
  hình route /vnpay/return/redirect và URL Frontend cố định khi được phép E2E.
- Nếu thiết bị khác có attempt đang mở mà trình duyệt này chưa có paymentId,
  Backend chỉ trả PAYMENT_IN_PROGRESS, không trả ID. FE hiển thị hướng dẫn kiểm
  tra giao dịch trước/hỗ trợ; không đoán ID, không tự đổi key hoặc dựng endpoint mới.
- Backend Payment đang tắt và migration 004 chưa áp dụng. UI hiển thị 503 chưa
  khả dụng, không có nhánh demo báo thành công. Không bật production feature flag.
- Chưa có UI tạo attempt mới sau thất bại, xử lý đối soát, hoàn tiền hoặc Wallet.

## Cấu hình Frontend

VITE_API_URL dùng quy ước hiện có (/api hoặc URL API kết thúc bằng /api).
VITE_VNPAY_SANDBOX_URL mặc định:
https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

Allowlist chỉ chấp nhận đúng integration sandbox này, không mở rộng tới host tùy
ý từ biến môi trường. Không đưa HashSecret/TmnCode bí mật hoặc token vào VITE_*.
Vercel rewrite hiện tại đã hỗ trợ mở lại route /payment/result trực tiếp.

## Kiểm thử

- npm test: Vitest + jsdom + React Testing Library; 63 test passed, 0 failed ở 2D.1.
- Test fetch được thay thế trong bộ nhớ và mặc định từ chối mọi request không
  được khai báo; không có mock API server hoặc fallback demo trong ứng dụng.
- Test xác minh POST body/header, JWT, key lưu bền, 401/403/404/409/503, lỗi mạng,
  URL giả, mọi Payment status, đối soát ưu tiên, double-click, polling có giới hạn,
  rời trang, đổi tài khoản và giá thay đổi.
- Giao diện dùng layout portal/vàng Manrope hiện có; CSS responsive được giới
  hạn cho Trips/Payment, breakpoint 1100/820/480px. Không đổi layout account khác.
- Không chạy browser end-to-end với VNPay, không dùng tài khoản thật, không tạo
  Payment trên Backend, không chạy migration hoặc truy cập database nhóm.
- 2D.1: npm run test:browser có 36 tests passed (18 tình huống × desktop 1440px,
  mobile 390px) trên Microsoft Edge headless, chạy built assets qua Vite preview.
  Có kiểm tra trực tiếp /payment/result, refresh, query giả/trùng ID, đăng nhập
  không mất ID, refresh token thất bại, mọi kết quả terminal/đối soát, polling khi
  IPN đến muộn mô phỏng, lỗi mạng + kiểm tra thủ công, HTTP 401/403/404/409/503,
  redirect 302 mô phỏng và Trips chỉ thanh toán AwaitingPayment.
- Fixture chỉ tồn tại trong tests/browser; intercept toàn bộ /api/* trước khi ra
  mạng, chặn dịch vụ ngoài localhost, chặn service worker. Không khởi chạy Backend,
  không có mock server/fallback demo trong ứng dụng, không gọi VNPay/database thật.
- Đã xem screenshot pending desktop/mobile; các test trạng thái cũng chụp ảnh và
  kiểm tra không tràn ngang. Ảnh ở test-results/ (Git ignored). Cần Edge được cài
  trên máy; chạy npm run build trước npm run test:browser. Hosting production phải
  rewrite /payment/result về index.html (Vercel config hiện có); chưa test hosting.
- Thêm Playwright dev dependency; nâng Vitest lên 4.1.12 để vá cảnh báo audit.
  npm install cuối cùng báo 0 vulnerabilities. Runtime dependencies giữ nguyên.

## Điều kiện chạy end-to-end sau này

Review/apply migration và kiểm thử ghi chỉ khi được cho phép; cấu hình merchant
sandbox, ReturnUrl/HTTPS/CORS/IPN; giữ feature off tới khi được duyệt; kiểm thử
backend signature/transaction thực tế; sau đó kiểm tra browser quay về, GET JWT,
IPN chậm/trùng, hết hạn và đối soát. Không thử bằng giao dịch production.
