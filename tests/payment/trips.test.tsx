import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { AuthSession } from "../../src/auth/auth-api";
import { TripsPage } from "../../src/components/portal/TripsPage";
const auth=vi.hoisted(()=>({session:null as AuthSession|null}));
vi.mock("../../src/auth/AuthContext",()=>({useAuth:()=>auth}));
vi.mock("@phosphor-icons/react",()=>({ArrowClockwise:()=>null,CalendarBlank:()=>null,CaretRight:()=>null,CreditCard:()=>null,MapPin:()=>null}));
vi.mock("../../src/components/booking/OrderDetailModal",()=>({OrderDetailModal:()=>null}));
vi.mock("../../src/components/booking/PaymentModal",()=>({PaymentModal:()=>null}));
vi.mock("../../src/components/tracking/ShareLocationControl",()=>({ShareLocationControl:()=>null}));
it("hides another customer's trips while the new account's request is pending",async()=>{
  auth.session={accessToken:"test-only",account:{accountId:"a",roles:["Customer"]}} as AuthSession;
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json([{bookingId:"20000000-0000-0000-0000-000000000001",vehicleName:"Private trip A",plateNumber:"TEST",coverImageUrl:null,rentalType:"Daily",startAt:"2099-01-01T00:00:00Z",endAt:"2099-01-03T00:00:00Z",totalAmount:1300000,currency:"VND",status:"AwaitingPayment",createdAt:"2098-12-01T00:00:00Z"}]))
    .mockImplementation(()=>new Promise(()=>{}));
  const view=render(<TripsPage/>);await screen.findByText("Private trip A");
  auth.session={...auth.session,account:{...auth.session.account,accountId:"b"}};
  view.rerender(<TripsPage/>);expect(screen.queryByText("Private trip A")).toBeNull();
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
});
