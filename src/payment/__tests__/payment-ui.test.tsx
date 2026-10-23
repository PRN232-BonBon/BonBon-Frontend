import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../../auth/auth-api";
import { PaymentButton } from "../../components/payment/PaymentButton";
import { PaymentResultPage } from "../../components/payment/PaymentResultPage";
import { TripsPage } from "../../components/portal/TripsPage";
import { paymentNavigation, readPaymentAction, savePaymentAction } from "../payment-session";
import { PAYMENT_POLL_INTERVAL, PAYMENT_POLL_LIMIT } from "../payment-presentation";
import { accountId, booking, bookingId, checkout, json, paymentId, session, status } from "./fixtures";

const auth = vi.hoisted(() => ({ session: null as AuthSession | null, isRestoring: false }));
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => auth }));
// Icons have no behavioral role here; avoid transforming the entire icon catalog in jsdom.
vi.mock("@phosphor-icons/react", () => ({
  ArrowSquareOut: () => null, CreditCard: () => null, ArrowClockwise: () => null,
  ArrowLeft: () => null, CheckCircle: () => null, Clock: () => null, ShieldCheck: () => null,
  WarningCircle: () => null, CalendarBlank: () => null, MapPin: () => null,
}));
beforeEach(() => { auth.session = session; auth.isRestoring = false; });

describe("PaymentButton", () => {
  it.each(["PendingApproval", "Confirmed", "Rejected", "Cancelled"])("does not offer payment for Booking %s", value => {
    render(<PaymentButton booking={{ ...booking, status: value }} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("does not offer payment when signed out or without Customer role", () => {
    auth.session = null;
    const view = render(<PaymentButton booking={booking} />);
    expect(screen.queryByRole("button")).toBeNull();
    auth.session = { ...session, account: { ...session.account, roles: ["VehicleOwner"] } };
    view.rerender(<PaymentButton booking={booking} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("persists payment before redirecting and prevents double-click", async () => {
    let finish!: (value: Response) => void;
    const fetch = vi.mocked(globalThis.fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const redirect = vi.spyOn(paymentNavigation, "toGateway").mockImplementation(() => {});
    render(<PaymentButton booking={booking} />);
    const button = screen.getByRole("button", { name: "Thanh toán VNPay" });
    fireEvent.click(button); fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { finish(json(checkout)); });
    expect(redirect).toHaveBeenCalledWith(checkout.checkoutUrl);
    expect(readPaymentAction(accountId, bookingId)?.paymentId).toBe(paymentId);
  });
  it("shows disabled Backend message without fake success or redirect", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json({ title: "PAYMENT_DISABLED" }, 503));
    const redirect = vi.spyOn(paymentNavigation, "toGateway").mockImplementation(() => {});
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain("chưa khả dụng");
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Thanh toán thành công$/)).toBeNull();
  });
  it("keeps the same operation after network failure and a second click", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(json({ title: "PAYMENT_DISABLED" }, 503));
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const headers = fetch.mock.calls.map(([, options]) => (options?.headers as Record<string, string>)["Idempotency-Key"]);
    expect(headers[0]).toBe(headers[1]);
  });
  it("refuses an untrusted checkout URL", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json({ ...checkout, checkoutUrl: "https://evil.invalid/" }));
    const redirect = vi.spyOn(paymentNavigation, "toGateway").mockImplementation(() => {});
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain("Đường dẫn thanh toán không hợp lệ");
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Xem trạng thái/ }).getAttribute("href")).toContain(paymentId);
  });
  it("checks a remembered uncertain transaction using GET, never starts another POST", async () => {
    savePaymentAction(accountId, bookingId, { idempotencyKey: "checkout_request_0001", paymentId });
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json({ ...status, status: "Succeeded", requiresReconciliation: true }));
    const result = vi.spyOn(paymentNavigation, "toResult").mockImplementation(() => {});
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(result).toHaveBeenCalledWith(paymentId));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("retains key and stops on 409 instead of automatically retrying", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json({ title: "PAYMENT_IN_PROGRESS" }, 409));
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain("không thanh toán lại");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(readPaymentAction(accountId, bookingId)?.idempotencyKey).toBeTruthy();
  });
  it("does not redirect if the server amount differs from the price shown for the trip", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json({ ...checkout, amount: 1500000 }));
    const redirect = vi.spyOn(paymentNavigation, "toGateway").mockImplementation(() => {});
    render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain("Số tiền thuê vừa thay đổi");
    expect(redirect).not.toHaveBeenCalled();
    expect(readPaymentAction(accountId, bookingId)?.paymentId).toBe(paymentId);
  });
  it("does not redirect after the customer leaves during a request", async () => {
    let finish!: (response: Response) => void;
    vi.mocked(globalThis.fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const redirect = vi.spyOn(paymentNavigation, "toGateway").mockImplementation(() => {});
    const view = render(<PaymentButton booking={booking} />);
    fireEvent.click(screen.getByRole("button"));
    view.unmount();
    await act(async () => { finish(json(checkout)); });
    expect(redirect).not.toHaveBeenCalled();
    expect(readPaymentAction(accountId, bookingId)?.idempotencyKey).toBeTruthy();
  });
});

describe("PaymentResultPage", () => {
  beforeEach(() => window.history.replaceState(null, "", `/payment/result?paymentId=${paymentId}`));
  it.each(["invalid", "unavailable", "Succeeded", "invalid&returnError=unavailable"])("redirect error %s cannot assert success or cause a payment request", async marker => {
    window.history.replaceState(null, "", `/payment/result?returnError=${marker}&paymentId=${paymentId}&status=Succeeded`);
    render(<PaymentResultPage />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(marker === "unavailable" ? "chưa khả dụng" : "không hợp lệ");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
  });
  it.each([
    ["Pending", false, "Chờ xác minh thanh toán"], ["Processing", false, "Đang xử lý thanh toán"],
    ["Succeeded", false, "Thanh toán thành công"], ["Failed", false, "Thanh toán không thành công"],
    ["Cancelled", false, "Giao dịch đã hủy"], ["Succeeded", true, "Cần đối soát giao dịch"],
  ] as const)("shows Backend status %s with reconciliation=%s", async (value, reconciliation, title) => {
    vi.mocked(globalThis.fetch).mockResolvedValue(json({ ...status, status: value, requiresReconciliation: reconciliation }));
    render(<PaymentResultPage />);
    await screen.findByRole("heading", { name: title });
    if (reconciliation) expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
    expect(screen.getByText(/1\.300\.000/)).toBeTruthy();
    expect(vi.mocked(globalThis.fetch).mock.calls.every(([, options]) => options?.method !== "POST")).toBe(true);
  });
  it("ignores forged success in query string", async () => {
    window.history.replaceState(null, "", `/payment/result?paymentId=${paymentId}&status=Succeeded&vnp_ResponseCode=00`);
    vi.mocked(globalThis.fetch).mockResolvedValue(json(status));
    render(<PaymentResultPage />);
    await screen.findByRole("heading", { name: "Chờ xác minh thanh toán" });
    expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
  });
  it("uses verified Return only to resolve ID, then trusts authenticated GET", async () => {
    window.history.replaceState(null, "", "/payment/result?vnp_ResponseCode=00&vnp_SecureHash=test-only");
    const fetch = vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(json({ paymentId, status: "Succeeded", requiresReconciliation: false, message: "signed return" }))
      .mockResolvedValueOnce(json(status));
    render(<PaymentResultPage />);
    await screen.findByRole("heading", { name: "Chờ xác minh thanh toán" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer test-only-jwt" });
    expect(window.location.search).toBe(`?paymentId=${paymentId}`);
    expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
  });
  it("stops automatic polling after the configured bound", async () => {
    vi.useFakeTimers();
    const fetch = vi.mocked(globalThis.fetch).mockImplementation(async () => json(status));
    render(<PaymentResultPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    for (let i = 1; i < PAYMENT_POLL_LIMIT; i++) await act(async () => { await vi.advanceTimersByTimeAsync(PAYMENT_POLL_INTERVAL); });
    expect(fetch).toHaveBeenCalledTimes(PAYMENT_POLL_LIMIT);
    expect(screen.getByText(/Đã tạm dừng cập nhật tự động/)).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetch).toHaveBeenCalledTimes(PAYMENT_POLL_LIMIT);
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetch).toHaveBeenCalledTimes(PAYMENT_POLL_LIMIT + 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetch).toHaveBeenCalledTimes(PAYMENT_POLL_LIMIT + 1);
  });
  it.each([401, 403, 404, 409, 503])("shows an honest HTTP %s error and stops polling", async code => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json({ title: "HTTP_ERROR" }, code));
    render(<PaymentResultPage />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not request data while logged out", () => {
    auth.session = null;
    render(<PaymentResultPage />);
    expect(screen.getByRole("heading", { name: "Bạn cần đăng nhập" })).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("does not request data for a non-Customer", () => {
    auth.session = { ...session, account: { ...session.account, roles: ["VehicleOwner"] } };
    render(<PaymentResultPage />);
    expect(screen.getByRole("alert").textContent).toContain("Không có quyền");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("rejects a missing payment ID without relying on a success flag", async () => {
    window.history.replaceState(null, "", "/payment/result?status=Succeeded");
    render(<PaymentResultPage />);
    await screen.findByRole("alert");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("cancels polling when the page unmounts", async () => {
    vi.useFakeTimers();
    const fetch = vi.mocked(globalThis.fetch).mockImplementation(async () => json(status));
    const view = render(<PaymentResultPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetch).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not retain a previous customer's receipt after switching accounts", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({ ...status, status: "Succeeded" }))
      .mockImplementationOnce(() => new Promise(() => {}));
    const view = render(<PaymentResultPage />);
    await screen.findByRole("heading", { name: "Thanh toán thành công" });
    auth.session = { ...session, account: { ...session.account, accountId: bookingId } };
    view.rerender(<PaymentResultPage />);
    expect(screen.queryByRole("heading", { name: "Thanh toán thành công" })).toBeNull();
    expect(screen.queryByText(/1\.300\.000/)).toBeNull();
  });
});

describe("TripsPage", () => {
  it("offers payment only for approved bookings from /bookings/mine", async () => {
    const fetch = vi.mocked(globalThis.fetch).mockResolvedValue(json([booking, { ...booking, bookingId: paymentId, status: "PendingApproval" }]));
    render(<TripsPage />);
    await screen.findByRole("button", { name: "Thanh toán VNPay" });
    expect(screen.getAllByRole("button", { name: "Thanh toán VNPay" })).toHaveLength(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/bookings/mine");
  });
  it("shows load failure instead of pretending the account has no bookings", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("offline"));
    render(<TripsPage />);
    await screen.findByRole("alert");
    expect(screen.queryByText("Bạn chưa có chuyến")).toBeNull();
  });
  it("never loads another account's bookings while logged out", () => {
    auth.session = null;
    render(<TripsPage />);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Thanh toán VNPay" })).toBeNull();
  });
});
