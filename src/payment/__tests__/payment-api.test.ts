import { describe, expect, it, vi } from "vitest";
import { createPayment, getPayment, PaymentApiError, resolveVnPayReturn } from "../payment-api";
import { getPaymentAction, savePaymentAction, trustedCheckoutUrl } from "../payment-session";
import { accountId, bookingId, checkout, json, paymentId, session, status } from "./fixtures";

describe("real Backend Payment contract at the fetch boundary", () => {
  it("POSTs bookingId only with JWT and stable Idempotency-Key", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json(checkout));
    await createPayment(session, { bookingId }, "checkout_request_0001");
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/payments");
    expect(options?.body).toBe(JSON.stringify({ bookingId }));
    expect(options?.headers).toMatchObject({ Authorization: "Bearer test-only-jwt", "Idempotency-Key": "checkout_request_0001" });
    expect(options?.cache).toBe("no-store");
  });
  it("GETs authoritative status using JWT", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json(status));
    await expect(getPayment(session, paymentId)).resolves.toEqual(status);
    expect(fetch.mock.calls[0][0]).toBe(`/api/payments/${paymentId}`);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer test-only-jwt" });
  });
  it.each([401, 403, 404, 409, 503])("reports HTTP %s without trusting raw server detail", async code => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json({ title: "HTTP_ERROR", detail: "sensitive internal error" }, code));
    const error = await getPayment(session, paymentId).catch(value => value) as PaymentApiError;
    expect(error.status).toBe(code);
    expect(error.message).not.toContain("sensitive");
    expect(error.message.length).toBeGreaterThan(20);
  });
  it("keeps the same key after network loss and simulated reload", async () => {
    const action = getPaymentAction(accountId, bookingId);
    const fetch = vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(json(checkout));
    await expect(createPayment(session, { bookingId }, action.idempotencyKey)).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    const resumed = getPaymentAction(accountId, bookingId);
    await createPayment(session, { bookingId }, resumed.idempotencyKey);
    expect(action.idempotencyKey).toBe(resumed.idempotencyKey);
    expect(fetch.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)["Idempotency-Key"])).toEqual([action.idempotencyKey, action.idempotencyKey]);
  });
  it("scopes persisted attempts by account and booking, retaining payment id", () => {
    const action = getPaymentAction(accountId, bookingId);
    savePaymentAction(accountId, bookingId, { ...action, paymentId });
    expect(getPaymentAction(accountId, bookingId)).toEqual({ ...action, paymentId });
    expect(getPaymentAction("another-account", bookingId).idempotencyKey).not.toBe(action.idempotencyKey);
  });
  it("fails closed if persistent storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => getPaymentAction(accountId, bookingId)).toThrow(/lưu yêu cầu/);
  });
  it.each([null, [], { idempotencyKey: 1234567890123456 },
    { idempotencyKey: "checkout_request_0001", paymentId: null },
    { idempotencyKey: "checkout_request_0001", paymentId: "" },
    { idempotencyKey: "checkout_request_0001\n" }])("does not replace malformed persisted payment actions", value => {
    const raw = JSON.stringify(value);
    localStorage.setItem(`bonbon.payment.v1:${accountId}:${bookingId}`, raw);
    expect(() => getPaymentAction(accountId, bookingId)).toThrow(/lưu yêu cầu/);
    expect(localStorage.getItem(`bonbon.payment.v1:${accountId}:${bookingId}`)).toBe(raw);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it.each(["https://evil.invalid/payment", "https://sandbox.vnpayment.vn.evil.invalid/paymentv2/vpcpay.html",
    "http://sandbox.vnpayment.vn/paymentv2/vpcpay.html", "https://user:password@sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    "https://sandbox.vnpayment.vn/another-path", "javascript:alert(1)", "https://pay.vnpay.vn/vpcpay.html"])("rejects untrusted redirect %s", value => {
    expect(() => trustedCheckoutUrl(value)).toThrow(/Đường dẫn/);
  });
  it("accepts only the configured sandbox integration", () => {
    expect(trustedCheckoutUrl(checkout.checkoutUrl!)).toBe(checkout.checkoutUrl);
    expect(() => trustedCheckoutUrl(checkout.checkoutUrl!, "https://pay.vnpay.vn/vpcpay.html")).toThrow();
  });
  it.each([{ ...status, status: "Refunded" }, { ...status, currency: "USD" }, { ...status, requiresReconciliation: undefined },
    { ...status, paymentId: bookingId }])("rejects malformed/unknown response rather than inventing success", async value => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json(value));
    await expect(getPayment(session, paymentId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("resolves signed return only via Backend and does not POST", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json({ paymentId, status: "Succeeded", requiresReconciliation: false, message: "Backend response" }));
    await resolveVnPayReturn(new URLSearchParams("vnp_ResponseCode=00&vnp_SecureHash=test-signature"));
    expect(fetch.mock.calls[0][0]).toBe("/api/payments/vnpay/return?vnp_ResponseCode=00&vnp_SecureHash=test-signature");
    expect(fetch.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("rejects duplicate callback parameters before fetch", async () => {
    await expect(resolveVnPayReturn(new URLSearchParams("vnp_SecureHash=x&vnp_Amount=100&vnp_amount=200"))).rejects.toMatchObject({ code: "INVALID_RETURN" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
