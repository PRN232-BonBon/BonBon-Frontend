import { useEffect, useState } from "react";
import { ArrowClockwise, ArrowLeft, CheckCircle, Clock, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getPayment, isPaymentId, PaymentApiError, resolveVnPayReturn } from "../../payment/payment-api";
import { formatVnd, PAYMENT_POLL_INTERVAL, PAYMENT_POLL_LIMIT, paymentPresentation } from "../../payment/payment-presentation";
import { paymentResultPath } from "../../payment/payment-session";
import type { PaymentStatusResponse } from "../../payment/payment-types";

interface ResultState { accountId: string; payment: PaymentStatusResponse | null; error: string | null; loading: boolean; stopped: boolean }

export function PaymentResultPage() {
  const { session, isRestoring } = useAuth();
  const [state, setState] = useState<ResultState | null>(null);
  const [refresh, setRefresh] = useState(0);
  const accountId = session?.account.accountId;
  const token = session?.accessToken;
  const customer = !!session?.account.roles.includes("Customer");

  useEffect(() => {
    if (!session || !customer || isRestoring) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    const limit = refresh === 0 ? PAYMENT_POLL_LIMIT : 1;
    setState({ accountId: session.account.accountId, payment: null, error: null, loading: true, stopped: false });
    async function start() {
      try {
        const params = new URLSearchParams(window.location.search);
        // A redirect error is only navigation feedback, never evidence of a payment result.
        if (params.has("returnError")) {
          if (params.getAll("returnError").length === 1 && params.get("returnError") === "unavailable")
            throw new PaymentApiError("PAYMENT_TEMPORARILY_UNAVAILABLE", 503);
          throw new PaymentApiError("INVALID_RETURN");
        }
        const ids = params.getAll("paymentId");
        let id = ids.length === 1 && isPaymentId(ids[0]) ? ids[0] : null;
        if (ids.length > 0 && !id) throw new PaymentApiError("INVALID_RETURN");
        if (!id) {
          if (!params.has("vnp_SecureHash")) throw new PaymentApiError("INVALID_RETURN");
          const resolved = await resolveVnPayReturn(params, controller.signal);
          if (controller.signal.aborted) return;
          id = resolved.paymentId;
          window.history.replaceState(null, "", paymentResultPath(id));
        }
        const paymentId = id;
        async function check() {
          try {
            const payment = await getPayment(session!, paymentId, controller.signal);
            if (controller.signal.aborted) return;
            count += 1;
            const terminal = paymentPresentation(payment).terminal;
            const stopped = !terminal && count >= limit;
            setState({ accountId: session!.account.accountId, payment, error: null, loading: false, stopped });
            if (!terminal && !stopped) timer = setTimeout(() => void check(), PAYMENT_POLL_INTERVAL);
          } catch (cause) { fail(cause); }
        }
        await check();
      } catch (cause) { fail(cause); }
    }
    function fail(cause: unknown) {
      if (controller.signal.aborted) return;
      setState(previous => ({ accountId: session!.account.accountId,
        payment: previous?.accountId === session!.account.accountId ? previous.payment : null,
        error: cause instanceof PaymentApiError ? cause.message : new PaymentApiError("NETWORK_ERROR").message,
        loading: false, stopped: true }));
    }
    void start();
    return () => { controller.abort(); clearTimeout(timer); };
    // Token refresh cancels old requests. Render also guards against account switching.
  }, [accountId, token, customer, isRestoring, refresh]);

  if (isRestoring) return <div className="portal-card payment-result-card" role="status">Đang khôi phục phiên đăng nhập...</div>;
  if (!session) return <div className="portal-card payment-result-card"><h1>Bạn cần đăng nhập</h1><p>Đăng nhập đúng tài khoản đặt xe để kiểm tra kết quả thanh toán.</p><a href="/" className="button portal-primary">Về trang chủ</a></div>;
  if (!customer) return <div className="portal-card payment-result-card" role="alert"><h1>Không có quyền xem thanh toán</h1><p>Vui lòng đăng nhập bằng tài khoản khách hàng đã đặt xe.</p></div>;
  const visible = state?.accountId === accountId ? state : null;
  const payment = visible?.payment;
  const presentation = payment ? paymentPresentation(payment) : null;
  const Icon = presentation?.tone === "success" ? CheckCircle : presentation?.tone === "warning" || presentation?.tone === "error" ? WarningCircle : Clock;
  return <>
    <div className="portal-title-row"><div><h1>Kết quả thanh toán</h1><p>Theo dõi xác nhận giao dịch của bạn tại BonBon.</p></div></div>
    <article className={`portal-card payment-result-card payment-tone-${presentation?.tone ?? "waiting"}`} aria-busy={!visible || visible.loading}>
      <div className="payment-result-topline"><span className="payment-eyebrow"><ShieldCheck size={18} aria-hidden="true" /> Thanh toán BonBon</span><span className="payment-mode">VNPay sandbox</span></div>
      {!visible || visible.loading ? <div className="payment-result-state" role="status"><Clock size={54} aria-hidden="true" /><h2>Đang kiểm tra giao dịch...</h2><p>Vui lòng chờ BonBon lấy trạng thái mới nhất.</p></div> : null}
      {presentation && payment ? <>
        <div className="payment-result-state" aria-live="polite"><Icon size={58} weight="duotone" aria-hidden="true" /><h2>{presentation.title}</h2><p>{presentation.detail}</p></div>
        <dl className="payment-summary"><div><dt>Số tiền thuê</dt><dd className="payment-amount">{formatVnd(payment.amount)}</dd></div><div><dt>Mã thanh toán</dt><dd>{payment.paymentId}</dd></div><div><dt>Mã đặt xe</dt><dd>{payment.bookingId}</dd></div><div><dt>Hạn thanh toán</dt><dd>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(payment.expiresAt))}</dd></div></dl>
      </> : null}
      {visible?.error ? <div className="payment-notice payment-notice-error" role="alert"><WarningCircle size={22} aria-hidden="true" /><p>{visible.error}</p></div> : null}
      {visible?.stopped && !visible.error ? <p className="payment-poll-note" role="status">Đã tạm dừng cập nhật tự động. Bạn có thể kiểm tra lại; không có giao dịch mới được tạo.</p> : null}
      {payment && presentation && !presentation.terminal && !visible?.stopped ? <p className="payment-poll-note">Tự cập nhật mỗi 5 giây, tối đa 12 lần.</p> : null}
      <div className="payment-result-actions"><a className="button portal-primary" href="/my-trips"><ArrowLeft aria-hidden="true" /> Chuyến của tôi</a><button className="button payment-secondary" type="button" disabled={!visible || visible.loading} onClick={() => setRefresh(value => value + 1)}><ArrowClockwise aria-hidden="true" /> Kiểm tra lại</button></div>
    </article>
    <p className="payment-safe-note">Không thanh toán lại khi kết quả chưa rõ. Vui lòng lưu mã thanh toán nếu cần BonBon hỗ trợ.</p>
  </>;
}
