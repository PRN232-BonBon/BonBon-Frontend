import { useState } from "react";
import type { AuthSession } from "../auth/auth-api";

export function LocalIpnSimulation({ paymentId, session, onCheck }: { paymentId: string; session: AuthSession; onCheck: () => void }) {
  const [scenario,setScenario]=useState("success");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function send() {
    if(busy) return;
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/local/vnpay-ipn-simulation",{
        method:"POST",cache:"no-store",redirect:"error",credentials:"omit",signal:AbortSignal.timeout(20000),
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.accessToken}`,"X-BonBon-Local-Simulation":"I_UNDERSTAND_LOCAL_SIMULATION"},
        body:JSON.stringify({paymentId,scenario}),
      });
      if(!response.ok) { setMessage(`Không gửi được mô phỏng (HTTP ${response.status}). Mỗi tình huống dùng Booking mới; IPN trùng cần bấm thành công trước trên cùng Payment. Không tạo lại giao dịch khi chưa rõ kết quả.`); return; }
      const result=await response.json() as {simulated?:boolean;rspCode?:string;after?:{paymentStatus?:string;bookingStatus?:string;auditCount?:number;reconciliation?:boolean}};
      if(result.simulated!==true) throw new Error("Invalid simulation response");
      setMessage(`GIẢ LẬP LOCAL: IPN ${result.rspCode ?? "?"}; Payment ${result.after?.paymentStatus ?? "?"}; Booking ${result.after?.bookingStatus ?? "?"}; audit ${result.after?.auditCount ?? "?"}${result.after?.reconciliation?"; CẦN ĐỐI SOÁT":""}. Không phải VNPay xác nhận.`);
      onCheck();
    } catch { setMessage("Chưa rõ kết quả mô phỏng. Kiểm tra trạng thái; retry cùng thao tác sẽ dùng lại callback cũ."); }
    finally { setBusy(false); }
  }
  return <section style={{padding:16,border:"2px dashed #b45309",borderRadius:12,background:"#fff7ed",marginTop:12}} aria-label="Công cụ giả lập IPN local">
    <strong>GIẢ LẬP VNPay IPN — KHÔNG PHẢI KẾT QUẢ TỪ VNPay</strong>
    <p>Chỉ local. Mỗi tình huống độc lập dùng một Booking/Payment mới. Bấm nút dưới mới gửi IPN đã ký qua endpoint thật; không gọi cổng VNPay.</p>
    <label>Tình huống mô phỏng <select value={scenario} disabled={busy} onChange={event=>setScenario(event.target.value)}>
      <option value="success">Thành công (00)</option><option value="failure">Thất bại (51)</option>
      <option value="cancel">Khách hủy (24)</option><option value="duplicate">Gửi lại nguyên IPN thành công</option>
      <option value="bad-signature">Chữ ký sai (97)</option><option value="wrong-amount">Số tiền sai (04)</option>
    </select></label>
    <button className="payment-check-status" type="button" disabled={busy} onClick={()=>void send()}>{busy?"Đang gửi IPN local…":"Gửi mô phỏng IPN đã chọn"}</button>
    {message?<p role="status">{message}</p>:null}
  </section>;
}
