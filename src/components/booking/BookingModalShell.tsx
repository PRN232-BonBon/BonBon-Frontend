import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import "./BookingConfirmationModal.css";

export function BookingModalShell({ title, children, onClose, busy = false, className = "" }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string;
}) {
  const id = useId(); const ref = useRef<HTMLElement>(null); const reduce = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden"; ref.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); if (!busy) onClose(); }
      if (event.key !== "Tab") return;
      const controls = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]');
      if (!controls?.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement) || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, [busy, onClose]);
  return createPortal(<motion.div className="booking-confirmation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: reduce ? 0 : .18 }} onMouseDown={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <motion.article className={`booking-confirmation-modal ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
      initial={reduce ? false : { opacity: 0, y: 20, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : .24 }}>
      <header className="booking-confirmation-header"><h2 id={id}>{title}</h2><button type="button" aria-label={`Đóng ${title.toLowerCase()}`} onClick={onClose} disabled={busy}><X size={16} weight="bold" /></button></header>
      <div className="booking-confirmation-scroll">{children}</div>
    </motion.article>
  </motion.div>, document.body);
}
