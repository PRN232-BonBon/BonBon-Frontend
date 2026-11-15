import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { usePaymentStatus } from "../../src/payment/usePaymentStatus";
import type { AuthSession } from "../../src/auth/auth-api";
const id="30000000-0000-0000-0000-000000000001";
const session={accessToken:"test-only",account:{accountId:"a",roles:["Customer"]}} as AuthSession;
const status={paymentId:id,bookingId:"20000000-0000-0000-0000-000000000001",amount:1300000,currency:"VND",status:"Pending",expiresAt:"2099-01-01T00:00:00Z",requiresReconciliation:false};
it("limits polling and visibility events cannot restart it after the bound",async()=>{
  vi.useFakeTimers(); const fetch=vi.mocked(globalThis.fetch).mockImplementation(async()=>Response.json(status));
  const {result}=renderHook(()=>usePaymentStatus(id,session));
  await act(async()=>{await vi.advanceTimersByTimeAsync(60000)}); expect(fetch).toHaveBeenCalledTimes(12);
  await act(async()=>{document.dispatchEvent(new Event("visibilitychange"));await vi.advanceTimersByTimeAsync(60000)}); expect(fetch).toHaveBeenCalledTimes(12);
  await act(async()=>{result.current.refresh();}); await act(async()=>{await vi.advanceTimersByTimeAsync(60000)}); expect(fetch).toHaveBeenCalledTimes(13);
});
it("stops on unavailable/network failures until manual check",async()=>{
  vi.useFakeTimers();const fetch=vi.mocked(globalThis.fetch).mockResolvedValue(Response.json({title:"PAYMENT_DISABLED"},{status:503}));
  const {result}=renderHook(()=>usePaymentStatus(id,session));await act(async()=>{await vi.advanceTimersByTimeAsync(60000)});
  expect(fetch).toHaveBeenCalledTimes(1);expect(result.current.error).toContain("chưa khả dụng");
  await act(async()=>{document.dispatchEvent(new Event("visibilitychange"));await vi.advanceTimersByTimeAsync(60000)});expect(fetch).toHaveBeenCalledTimes(1);
});
it("terminal success does not poll on visibility; account switch hides the previous receipt",async()=>{
  vi.useFakeTimers(); const fetch=vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json({...status,status:"Succeeded"})).mockImplementation(()=>new Promise(()=>{}));
  const {result,rerender}=renderHook(({user})=>usePaymentStatus(id,user),{initialProps:{user:session}});
  await act(async()=>{await vi.advanceTimersByTimeAsync(0)});expect(result.current.status?.status).toBe("Succeeded");
  await act(async()=>{document.dispatchEvent(new Event("visibilitychange"));await vi.advanceTimersByTimeAsync(60000)}); expect(fetch).toHaveBeenCalledTimes(1);
  rerender({user:{...session,account:{...session.account,accountId:"b"}}});expect(result.current.status).toBeNull();
});
