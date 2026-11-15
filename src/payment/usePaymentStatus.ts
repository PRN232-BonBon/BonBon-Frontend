import { useCallback, useEffect, useState } from "react";
import type { AuthSession } from "../auth/auth-api";
import { getPaymentStatus, paymentErrorMessage, type PaymentStatus, type PaymentProvider } from "./payment-api";

export function usePaymentStatus(paymentId: string | null, session: AuthSession | null, provider: PaymentProvider = "SEPAY_SANDBOX") {
  const scope = `${provider}:${session?.account.accountId ?? ""}:${paymentId ?? ""}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; status: PaymentStatus | null; error: string }>({ scope: "", status: null, error: "" });
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    setSnapshot({ scope, status: null, error: "" }); setChecking(false);
    if (!paymentId || !session) return;
    if (!session.account.roles.includes("Customer")) {
      setSnapshot({ scope, status: null, error: "Bạn không có quyền xem thanh toán. Vui lòng dùng tài khoản khách đặt xe." }); return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let calls = 0;
    let stopped = false;
    const limit = attempt > 0 ? 1 : 12;
    let running = false;
    const poll = async () => {
      if (controller.signal.aborted || running || stopped || calls >= limit) return;
      clearTimeout(timer);
      running = true; setChecking(true);
      let again = false;
      calls++;
      try {
        const payment = await getPaymentStatus(paymentId, session, controller.signal, provider);
        if (controller.signal.aborted) return;
        setSnapshot({ scope, status: payment, error: "" });
        again = !payment.requiresReconciliation && ["Pending", "Processing"].includes(payment.status)
          && Date.parse(payment.expiresAt) > Date.now() && calls < limit;
      } catch (reason) {
        if (controller.signal.aborted) return;
        setSnapshot(previous => ({ scope, status: previous.scope === scope ? previous.status : null, error: paymentErrorMessage(reason) }));
      } finally {
        running = false;
        stopped = !again;
        if (!controller.signal.aborted) {
          setChecking(false);
          if (again && document.visibilityState !== "hidden") timer = setTimeout(() => void poll(), 5000);
        }
      }
    };
    const onVisible = () => { if (document.visibilityState !== "hidden") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    void poll();
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [paymentId, session, attempt, scope, provider]);
  return { status: snapshot.scope === scope ? snapshot.status : null, error: snapshot.scope === scope ? snapshot.error : "", checking, refresh };
}
