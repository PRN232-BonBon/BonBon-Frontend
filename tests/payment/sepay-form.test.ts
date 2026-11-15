import { describe, expect, it } from "vitest";
import { isSafeCheckoutForm } from "../../src/payment/payment-api";

const form = {
  action: "https://pay-sandbox.sepay.vn/v1/checkout/init", method: "POST",
  fields: ["merchant", "operation", "order_amount", "currency", "order_invoice_number", "signature"]
    .map(name => ({ name, value: "test" })),
};

describe("SePay checkout form", () => {
  it("accepts the fixed sandbox destination", () => expect(isSafeCheckoutForm(form)).toBe(true));
  it("rejects an untrusted action", () => expect(isSafeCheckoutForm({ ...form, action: "https://pay-sandbox.sepay.vn.evil.invalid/v1/checkout/init" })).toBe(false));
  it("rejects duplicate and unknown fields", () => {
    expect(isSafeCheckoutForm({ ...form, fields: [...form.fields, form.fields[0]] })).toBe(false);
    expect(isSafeCheckoutForm({ ...form, fields: [...form.fields, { name: "unexpected", value: "x" }] })).toBe(false);
  });
});
