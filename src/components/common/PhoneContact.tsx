import "./phone-contact.css";

export function PhoneContact({ phone, label }: { phone?: string | null; label: string }) {
  const display = phone?.trim();
  const number = display?.replace(/[\s().-]/g, "") ?? "";
  const callable = /^\+?\d{6,15}$/.test(number);
  return <span className="contact-phone"><span className="contact-phone-label">{label}:</span>{" "}
    {display ? callable ? <a href={`tel:${number}`}>{display}</a> : <span>{display}</span>
      : <span className="contact-phone-empty">Chưa cập nhật</span>}
  </span>;
}
