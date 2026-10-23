import { test as base, expect, type Route } from "@playwright/test";
import { session, status, paymentId, booking } from "../../src/payment/__tests__/fixtures";

type ApiHandler = (route: Route) => Promise<void>;
const resultPath = `/payment/result?paymentId=${paymentId}`;
const localSession = { ...session, accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600 };
const test = base.extend<{ sandbox: { requests: string[]; handle: (handler: ApiHandler) => void; signedIn: (expired?: boolean) => Promise<void> } }>({
  sandbox: [async ({ context }, use) => {
    const requests: string[] = [];
    const unexpected: string[] = [];
    let handler: ApiHandler = async route => {
      const request = route.request();
      if (new URL(request.url()).pathname === `/api/payments/${paymentId}` && request.method() === "GET") {
        expect(request.headers().authorization).toBe("Bearer test-only-jwt");
        await route.fulfill({ json: status });
      } else {
        unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort();
      }
    };
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      // External services (including VNPay/Google) are blocked; no real API can escape.
      if (url.pathname.startsWith("/api/")) {
        requests.push(`${route.request().method()} ${url.pathname}`);
        await handler(route);
      } else if (url.origin === "http://127.0.0.1:4179") await route.continue();
      else await route.abort();
    });
    await use({ requests, handle: next => { handler = next; }, signedIn: async (expired = false) => {
      await context.addInitScript(value => localStorage.setItem("bonbon.auth.session", JSON.stringify(value)),
        { ...localSession, accessTokenExpiresAt: expired ? 1 : localSession.accessTokenExpiresAt });
    } });
    expect(unexpected).toEqual([]);
  }, { auto: true }],
});

test("direct route and browser refresh retain ID and use authenticated status", async ({ page, sandbox }, info) => {
  await sandbox.signedIn();
  await page.goto(resultPath + "&status=Succeeded&vnp_ResponseCode=00");
  await expect(page.getByRole("heading", { name: "Chờ xác minh thanh toán" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chờ xác minh thanh toán" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("paymentId")).toBe(paymentId);
  await expect(page.getByText(/1\.300\.000/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("pending.png"), fullPage: true });
  expect(sandbox.requests.every(value => value.startsWith("GET /api/payments/"))).toBe(true);
});

test("signed out customer logs in on the return page without losing paymentId", async ({ page, sandbox }) => {
  sandbox.handle(async route => {
    if (new URL(route.request().url()).pathname === "/api/auth/login") await route.fulfill({ json: localSession });
    else await route.fulfill({ json: status });
  });
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: "Bạn cần đăng nhập" })).toBeVisible();
  expect(sandbox.requests).toEqual([]);
  if (await page.getByRole("button", { name: "Mở menu", exact: true }).isVisible())
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill("test@example.invalid");
  await dialog.locator('input[type="password"]').fill("test-only-password");
  await dialog.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chờ xác minh thanh toán" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("paymentId")).toBe(paymentId);
});

test("expired refresh session fails safely and keeps the result address", async ({ page, sandbox }) => {
  await sandbox.signedIn(true);
  sandbox.handle(async route => {
    expect(new URL(route.request().url()).pathname).toBe("/api/auth/refresh");
    await route.fulfill({ status: 401, json: { title: "UNAUTHORIZED" } });
  });
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: "Bạn cần đăng nhập" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("paymentId")).toBe(paymentId);
  expect(sandbox.requests.some(value => value.includes("/api/payments"))).toBe(false);
});

test("tampered or duplicate IDs never reach the API", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  for (const query of ["paymentId=forged&status=Succeeded", `paymentId=${paymentId}&paymentId=${paymentId}`]) {
    await page.goto("/payment/result?" + query);
    await expect(page.getByRole("alert")).toContainText("không hợp lệ");
  }
  expect(sandbox.requests).toEqual([]);
});

test("late IPN is represented by polling Backend, never by Return status", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  let settled = false;
  sandbox.handle(async route => route.fulfill({ json: { ...status, status: settled ? "Succeeded" : "Pending" } }));
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: "Chờ xác minh thanh toán" })).toBeVisible();
  settled = true;
  await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toBeVisible({ timeout: 8000 });
  expect(sandbox.requests.every(value => value.startsWith("GET /api/payments/"))).toBe(true);
});

for (const [value, reconciliation, title] of [
  ["Succeeded", false, "Thanh toán thành công"],
  ["Failed", false, "Thanh toán không thành công"],
  ["Cancelled", false, "Giao dịch đã hủy"],
  ["Succeeded", true, "Cần đối soát giao dịch"],
] as const) test(`Backend ${value}, reconciliation=${reconciliation}`, async ({ page, sandbox }, info) => {
  await sandbox.signedIn();
  sandbox.handle(async route => route.fulfill({ json: { ...status, status: value, requiresReconciliation: reconciliation } }));
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("result.png"), fullPage: true });
  expect(sandbox.requests.every(value => value.startsWith("GET /api/payments/"))).toBe(true);
});

test("browser follows simulated verified Backend redirect then fetches status with JWT", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  sandbox.handle(async route => {
    if (new URL(route.request().url()).pathname === "/api/payments/vnpay/return/redirect")
      await route.fulfill({ status: 302, headers: { Location: resultPath, "Referrer-Policy": "no-referrer" } });
    else {
      expect(route.request().headers().authorization).toBe("Bearer test-only-jwt");
      await route.fulfill({ json: status });
    }
  });
  await page.goto("/api/payments/vnpay/return/redirect?vnp_ResponseCode=00&vnp_SecureHash=test-only");
  await expect(page).toHaveURL("http://127.0.0.1:4179" + resultPath);
  await expect(page.getByRole("heading", { name: "Chờ xác minh thanh toán" })).toBeVisible();
});

for (const code of [401, 403, 404, 409, 503]) test(`HTTP ${code} displays an error without claiming success`, async ({ page, sandbox }) => {
  await sandbox.signedIn();
  sandbox.handle(async route => route.fulfill({ status: code, json: { title: "HTTP_ERROR" } }));
  await page.goto(resultPath);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toHaveCount(0);
  expect(sandbox.requests.every(value => value.startsWith("GET /api/payments/"))).toBe(true);
});

test("network failure can be manually checked without POST", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  sandbox.handle(async route => route.abort("failed"));
  await page.goto(resultPath);
  await expect(page.getByRole("alert")).toContainText("Không thể kết nối");
  sandbox.handle(async route => route.fulfill({ json: { ...status, status: "Processing", requiresReconciliation: true } }));
  await page.getByRole("button", { name: "Kiểm tra lại" }).click();
  await expect(page.getByRole("heading", { name: "Cần đối soát giao dịch" })).toBeVisible();
  expect(sandbox.requests.every(value => value.startsWith("GET /api/payments/"))).toBe(true);
});

test("Return errors remain honest after reload", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  await page.goto("/payment/result?returnError=unavailable");
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  expect(sandbox.requests).toEqual([]);
});

test("Trips retains approved-only payment and handles disabled Backend", async ({ page, sandbox }) => {
  await sandbox.signedIn();
  sandbox.handle(async route => {
    if (new URL(route.request().url()).pathname === "/api/bookings/mine")
      await route.fulfill({ json: [booking, { ...booking, bookingId: paymentId, status: "PendingApproval" }] });
    else {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ bookingId: booking.bookingId });
      await route.fulfill({ status: 503, json: { title: "PAYMENT_DISABLED" } });
    }
  });
  await page.goto("/my-trips");
  await expect(page.getByRole("button", { name: "Thanh toán VNPay" })).toHaveCount(1);
  await page.getByRole("button", { name: "Thanh toán VNPay" }).click();
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  await expect(page).toHaveURL(/\/my-trips$/);
});
