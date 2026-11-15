import { describe, expect, it, vi } from "vitest";
import { createPayment, getPaymentStatus, paymentIdFromSearch, safeCheckoutUrl, verifiedPaymentSucceeded } from "../../src/payment/payment-api";
import type { AuthSession } from "../../src/auth/auth-api";
const bookingId="20000000-0000-0000-0000-000000000001", paymentId="30000000-0000-0000-0000-000000000001";
const session={accessToken:"test-only",account:{accountId:"customer-a",roles:["Customer"]}} as AuthSession;
const checkout={bookingId,paymentId,amount:1300000,currency:"VND",status:"Pending",checkoutUrl:"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?synthetic=1",expiresAt:"2099-01-01T00:00:00Z",isReplay:false};
const status={...checkout,requiresReconciliation:false};
const storageKey=`bonbon.payment.web.v1:customer-a:${bookingId}`;
describe("current main Payment contract and persisted retries",()=>{
  it("double-click sends one POST, only bookingId, JWT and stable key",async()=>{
    const fetch=vi.mocked(globalThis.fetch).mockImplementation(async()=>Response.json(checkout));
    await Promise.all([createPayment(bookingId,session),createPayment(bookingId,session)]);
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][1]?.body).toBe(JSON.stringify({bookingId}));
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({Authorization:"Bearer test-only"});
    expect(fetch.mock.calls[0][1]?.redirect).toBe("error");
  });
  it("network retry and module reload retain the same persisted key",async()=>{
    const fetch=vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(Response.json(checkout));
    await expect(createPayment(bookingId,session)).rejects.toThrow();
    vi.resetModules(); const next=await import("../../src/payment/payment-api"); await next.createPayment(bookingId,session);
    expect((fetch.mock.calls[0][1]?.headers as Record<string,string>)["Idempotency-Key"])
      .toBe((fetch.mock.calls[1][1]?.headers as Record<string,string>)["Idempotency-Key"]);
  });
  it("migrates the team's existing session key without rotating it",async()=>{
    sessionStorage.setItem(`bonbon.payment.customer-a.${bookingId}`,"existing_request_key_0001");
    const fetch=vi.mocked(globalThis.fetch).mockResolvedValue(Response.json(checkout)); await createPayment(bookingId,session);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({"Idempotency-Key":"existing_request_key_0001"});
  });
  it("remembered uncertain receipt uses GET and never creates another POST",async()=>{
    localStorage.setItem(storageKey,JSON.stringify({key:"existing_request_key_0001",paymentId}));
    const fetch=vi.mocked(globalThis.fetch).mockResolvedValue(Response.json({...status,status:"Succeeded",requiresReconciliation:true}));
    expect((await createPayment(bookingId,session)).checkoutUrl).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("blocked storage fails closed before POST",async()=>{
    vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("blocked")});
    await expect(createPayment(bookingId,session)).rejects.toMatchObject({code:"STORAGE_UNAVAILABLE"}); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["null",JSON.stringify({key:123}),JSON.stringify({key:"existing_request_key_0001",paymentId:null})])("does not replace corrupt actions",async raw=>{
    localStorage.setItem(storageKey,raw); await expect(createPayment(bookingId,session)).rejects.toMatchObject({code:"STORAGE_UNAVAILABLE"});
    expect(localStorage.getItem(storageKey)).toBe(raw); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([401,403,404,409,503])("maps HTTP%s without exposing server detail",async http=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({title:"INTERNAL",detail:"private internal detail"},{status:http}));
    const error=await getPaymentStatus(paymentId,session).catch(e=>e); expect(error.status).toBe(http); expect(error.message).not.toContain("private");
  });
  it.each([{...status,status:"Unknown"},{...status,requiresReconciliation:undefined},{...status,amount:-1},{...status,paymentId:bookingId}])("rejects incompatible GET responses",async value=>{
    vi.mocked(fetch).mockResolvedValue(Response.json(value)); await expect(getPaymentStatus(paymentId,session)).rejects.toMatchObject({code:"INVALID_RESPONSE"});
  });
  it("rejects malformed POST response and unauthorized Customer before a request",async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({paymentId})); await expect(createPayment(bookingId,session)).rejects.toMatchObject({code:"INVALID_RESPONSE"});
    vi.mocked(fetch).mockClear(); await expect(createPayment(bookingId,{...session,account:{...session.account,roles:["VehicleOwner"]}})).rejects.toMatchObject({status:403}); expect(fetch).not.toHaveBeenCalled();
  });
  it("return errors/duplicate or forged query never substitute for status",()=>{
    expect(paymentIdFromSearch(`?paymentId=${paymentId}&paymentId=${bookingId}`)).toBeNull();
    expect(paymentIdFromSearch(`?paymentId=${paymentId}&returnError=unavailable`)).toBeNull();
    expect(paymentIdFromSearch(`?paymentId=${paymentId}&status=Succeeded`)).toBe(paymentId);
    expect(verifiedPaymentSucceeded({status:"Succeeded"} as never)).toBe(false);
    expect(verifiedPaymentSucceeded({...status,status:"Succeeded",requiresReconciliation:true})).toBe(false);
    expect(safeCheckoutUrl(checkout.checkoutUrl+"#fragment")).toBeNull();
  });
});
