import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

const enabled = process.env.BONBON_STAGING_BROWSER_CONSENT === "I_CONFIRM_LOCAL_STAGE_TEST_DB_ONLY";
const accountsPath = process.env.BONBON_STAGING_ACCOUNTS_FILE;
test.beforeEach(async ({ context, page }) => {
  test.skip(!enabled || !accountsPath, "Explicit local staging consent and ignored accounts file required.");
  await context.route("**/*", route => new URL(route.request().url()).origin === "http://127.0.0.1:5289" ? route.continue() : route.abort());
  const health = await page.request.get("http://127.0.0.1:5289/health");
  expect(health.status()).toBe(200);
  const value = await health.json();
  expect(value.environment).toBe("PaymentStaging"); expect(value.database).toBe("bonbon_payment_test");
  expect(value.databaseVerified).toBe(true); expect(value.paymentEnabled).toBe(false);
});

async function signIn(page: Page) {
  const accounts = JSON.parse(await readFile(accountsPath!, "utf8"));
  if (await page.getByRole("button", { name: "Mở menu", exact: true }).isVisible())
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const dialog = page.getByRole("dialog");
  try {
    await dialog.getByLabel("Email", { exact: true }).fill(accounts.customerEmail);
    // No password literal in locator/action logs; never persist JWT/storage state.
    await dialog.locator('input[type="password"]').evaluate((element, value) => {
      const input = element as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, accounts.customerPassword);
    await dialog.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  } finally {
    await page.locator('input[type="password"]').evaluateAll(elements => elements.forEach(element => { (element as HTMLInputElement).value = ""; }));
  }
}

test("real local login, mine and disabled Payment keep the customer in staging", async ({ page }) => {
  await page.goto("/my-trips");
  await expect(page.getByRole("heading", { name: "Bạn cần đăng nhập" })).toBeVisible();
  await signIn(page);
  const payment = page.getByRole("button", { name: "Thanh toán VNPay" });
  await expect(payment).toHaveCount(1);
  await expect(page.getByText(/1\.300\.000/).first()).toBeVisible();
  const response = page.waitForResponse(value => new URL(value.url()).pathname === "/api/payments" && value.request().method() === "POST");
  await payment.click(); expect((await response).status()).toBe(503);
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  await expect(page).toHaveURL(/\/my-trips$/);
  await page.reload(); await expect(page.getByRole("button", { name: "Thanh toán VNPay" })).toHaveCount(1);
});

test("direct result route, login and refresh never invent success while Payment is off", async ({ page }) => {
  const path = "/payment/result?paymentId=30000000-0000-0000-0000-000000000001&status=Succeeded";
  await page.goto(path); await signIn(page);
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("chưa khả dụng");
  expect(new URL(page.url()).searchParams.get("paymentId")).toBe("30000000-0000-0000-0000-000000000001");
});
