import { useCallback, useEffect, useState } from "react";
import type { AuthSession } from "../auth/auth-api";
import { getPaymentStatus, paymentErrorMessage, type PaymentStatus } from "./payment-api";

export function usePaymentStatus(paymentId: string | null, session: AuthSession | null) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    setStatus(null); setError("");
    if (!paymentId || !session) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let running = false;
    const deadline = Date.now() + 15 * 60 * 1000;
    const poll = async () => {
      if (controller.signal.aborted || running) return;
      clearTimeout(timer);
      running = true; setChecking(true);
      let again = true;
      try {
        const payment = await getPaymentStatus(paymentId, session, controller.signal);
        if (controller.signal.aborted) return;
        failures = 0; setError(""); setStatus(payment);
        again = !payment.requiresReconciliation && ["Pending", "Processing"].includes(payment.status)
          && Date.parse(payment.expiresAt) > Date.now() && Date.now() < deadline;
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(paymentErrorMessage(reason)); failures++;
        again = failures < 3 && Date.now() < deadline;
      } finally {
        running = false;
        if (!controller.signal.aborted) {
          setChecking(false);
          if (again && document.visibilityState !== "hidden") timer = setTimeout(() => void poll(), 3000);
        }
      }
    };
    const onVisible = () => { if (document.visibilityState !== "hidden") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    void poll();
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [paymentId, session, attempt]);
  return { status, error, checking, refresh };
}
