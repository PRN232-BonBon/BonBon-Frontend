import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocalIpnSimulation } from "../../src/payment/LocalIpnSimulation";
import type { AuthSession } from "../../src/auth/auth-api";
const session={accessToken:"synthetic-test-token",account:{accountId:"local-customer",roles:["Customer"]}} as AuthSession;
it("never sends a callback on mount; only the explicit click sends the authenticated local command",async()=>{
  const refresh=vi.fn();vi.mocked(fetch).mockResolvedValue(Response.json({simulated:true,rspCode:"00",after:{paymentStatus:"Succeeded",bookingStatus:"Confirmed",auditCount:1}}));
  render(<LocalIpnSimulation paymentId="30000000-0000-0000-0000-000000000001" session={session} onCheck={refresh}/>);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Gửi mô phỏng IPN đã chọn"}));
  await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledWith("/api/local/vnpay-ipn-simulation",expect.objectContaining({method:"POST",body:JSON.stringify({paymentId:"30000000-0000-0000-0000-000000000001",scenario:"success"})}));
  expect(screen.getByRole("status").textContent).toContain("Không phải VNPay xác nhận");
});
it("a denied command does not declare payment success or trigger another attempt",async()=>{
  const refresh=vi.fn();vi.mocked(fetch).mockResolvedValue(new Response(null,{status:403}));
  render(<LocalIpnSimulation paymentId="30000000-0000-0000-0000-000000000001" session={session} onCheck={refresh}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gửi mô phỏng IPN đã chọn"}));
  await screen.findByText(/Không gửi được mô phỏng/);expect(refresh).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledTimes(1);
});
