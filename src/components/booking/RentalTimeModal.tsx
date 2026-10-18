import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CaretDown, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { validateRentalWindow, type RentalType, type RentalWindowResponse } from "../../booking/booking-api";

export type RentalSelection = RentalWindowResponse;

interface RentalTimeModalProps {
  value: RentalSelection;
  onClose: () => void;
  onConfirm: (selection: RentalSelection) => void;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, "0");
  return `${hour}:${index % 2 ? "30" : "00"}`;
});
const MAX_DAILY_RENTAL_MS = 30 * 86_400_000;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function vietnamParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

function exceedsDailyRentalLimit(startDate: string, startTime: string, endDate: string, endTime: string) {
  if (!startDate || !endDate) return false;
  return new Date(toIso(endDate, endTime)).getTime() - new Date(toIso(startDate, startTime)).getTime()
    > MAX_DAILY_RENTAL_MS;
}

export function createDefaultRentalSelection(): RentalSelection {
  const pickup = addDays(new Date(), 1);
  pickup.setHours(9, 0, 0, 0);
  const returned = addDays(pickup, 1);
  return {
    rentalType: "Daily",
    startAt: pickup.toISOString(),
    endAt: returned.toISOString(),
    billableUnits: 1,
    unitLabel: "ngày",
  };
}

export function formatRentalSummary(selection: RentalSelection) {
  const start = new Date(selection.startAt);
  const end = new Date(selection.endAt);
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function CalendarMonth({
  month,
  startDate,
  endDate,
  onSelect,
}: {
  month: Date;
  startDate: string;
  endDate: string;
  onSelect: (date: string) => void;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey(new Date());
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) => {
    if (index < leadingDays) return null;
    return new Date(month.getFullYear(), month.getMonth(), index - leadingDays + 1);
  });

  return (
    <section className="rental-calendar-month" aria-label={`Tháng ${month.getMonth() + 1}`}>
      <h3>Tháng {month.getMonth() + 1}</h3>
      <div className="rental-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="rental-days">
        {cells.map((date, index) => {
          if (!date) return <span className="rental-day-empty" key={`empty-${index}`} />;
          const key = dateKey(date);
          const disabled = key < today;
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const inRange = Boolean(endDate && key > startDate && key < endDate);
          return (
            <button
              type="button"
              key={key}
              disabled={disabled}
              className={`${isStart || isEnd ? "is-selected" : ""} ${inRange ? "is-in-range" : ""}`}
              aria-label={`Chọn ngày ${date.getDate()} tháng ${date.getMonth() + 1}`}
              onClick={() => onSelect(key)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RentalTimeModal({ value, onClose, onConfirm }: RentalTimeModalProps) {
  const initialStart = vietnamParts(value.startAt);
  const initialEnd = vietnamParts(value.endAt);
  const [mode, setMode] = useState<RentalType>(value.rentalType);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [durationHours, setDurationHours] = useState(value.rentalType === "Hourly" ? value.billableUnits : 4);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = new Date(`${initialStart.date}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  const nextMonth = useMemo(
    () => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    [viewMonth],
  );

  const draft = useMemo(() => {
    const startAt = toIso(startDate, startTime);
    const endAt = mode === "Hourly" ? addHours(startAt, durationHours) : endDate ? toIso(endDate, endTime) : "";
    return { startAt, endAt };
  }, [durationHours, endDate, endTime, mode, startDate, startTime]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showLimitWarning) {
        setEndDate("");
        setShowLimitWarning(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, showLimitWarning]);

  useEffect(() => {
    if (mode === "Daily" && exceedsDailyRentalLimit(startDate, startTime, endDate, endTime)) {
      setShowLimitWarning(true);
    }
  }, [endDate, endTime, mode, startDate, startTime]);

  function selectDailyDate(date: string) {
    setError("");
    if (!startDate || endDate || date < startDate) {
      setStartDate(date);
      setEndDate("");
    } else if (date === startDate) {
      setEndDate("");
    } else {
      setEndDate(date);
    }
  }

  function chooseAnotherRange() {
    setEndDate("");
    setError("");
    setShowLimitWarning(false);
  }

  async function confirm() {
    if (!draft.endAt) {
      setError("Vui lòng chọn ngày trả xe.");
      return;
    }
    if (mode === "Daily" && exceedsDailyRentalLimit(startDate, startTime, endDate, endTime)) {
      setShowLimitWarning(true);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const normalized = await validateRentalWindow({
        rentalType: mode,
        startAt: draft.startAt,
        endAt: draft.endAt,
      });
      onConfirm(normalized);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kiểm tra thời gian thuê.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displaySelection: RentalSelection = {
    rentalType: mode,
    startAt: draft.startAt,
    endAt: draft.endAt || draft.startAt,
    billableUnits: mode === "Hourly"
      ? durationHours
      : Math.max(1, Math.ceil((new Date(draft.endAt || draft.startAt).getTime() - new Date(draft.startAt).getTime()) / 86_400_000)),
    unitLabel: mode === "Hourly" ? "giờ" : "ngày",
  };

  return createPortal(
    <div className="rental-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rental-modal" role="dialog" aria-modal="true" aria-labelledby="rental-title">
        <header className="rental-modal-header">
          <h2 id="rental-title">Thời gian</h2>
          <button type="button" aria-label="Đóng" onClick={onClose}><X size={20} weight="bold" /></button>
        </header>

        <div className="rental-mode-tabs" role="tablist" aria-label="Hình thức thuê">
          <button type="button" role="tab" aria-selected={mode === "Daily"} className={mode === "Daily" ? "active" : ""} onClick={() => { setMode("Daily"); setError(""); }}>Thuê ngày</button>
          <button type="button" role="tab" aria-selected={mode === "Hourly"} className={mode === "Hourly" ? "active" : ""} onClick={() => { setMode("Hourly"); setError(""); }}>Thuê giờ</button>
        </div>

        <div className="rental-modal-body">
          {mode === "Daily" ? (
            <>
              <div className="rental-calendar-shell">
                <button
                  className="rental-month-nav previous"
                  type="button"
                  aria-label="Tháng trước"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                ><CaretLeft size={22} /></button>
                <div className="rental-calendar-grid">
                  <CalendarMonth month={viewMonth} startDate={startDate} endDate={endDate} onSelect={selectDailyDate} />
                  <CalendarMonth month={nextMonth} startDate={startDate} endDate={endDate} onSelect={selectDailyDate} />
                </div>
                <button
                  className="rental-month-nav next"
                  type="button"
                  aria-label="Tháng sau"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                ><CaretRight size={22} /></button>
                {showLimitWarning ? (
                  <div className="rental-limit-layer">
                    <section
                      className="rental-limit-dialog"
                      role="alertdialog"
                      aria-modal="true"
                      aria-labelledby="rental-limit-title"
                      aria-describedby="rental-limit-description"
                    >
                      <img src="/not-found.webp" alt="Không thể đặt xe cho khoảng thời gian đã chọn" />
                      <div>
                        <h3 id="rental-limit-title">Thời gian thuê quá dài</h3>
                        <p id="rental-limit-description">
                          BonBon hỗ trợ mỗi lượt thuê tối đa 30 ngày. Bạn vui lòng chọn ngày trả xe sớm hơn.
                        </p>
                      </div>
                      <button type="button" autoFocus onClick={chooseAnotherRange}>Chọn lại thời gian</button>
                    </section>
                  </div>
                ) : null}
              </div>

              <div className="rental-time-row">
                <label><span>Nhận xe</span><span className="rental-select-wrap"><select value={startTime} onChange={(event) => setStartTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time}>{time}</option>)}</select><CaretDown size={18} /></span></label>
                <ArrowRight className="rental-time-arrow" size={20} />
                <label><span>Trả xe</span><span className="rental-select-wrap"><select value={endTime} onChange={(event) => setEndTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time}>{time}</option>)}</select><CaretDown size={18} /></span></label>
              </div>
            </>
          ) : (
            <div className="rental-hourly-fields">
              <label><span>Ngày bắt đầu</span><input type="date" min={dateKey(new Date())} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label><span>Giờ nhận xe</span><span className="rental-select-wrap"><select value={startTime} onChange={(event) => setStartTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time}>{time}</option>)}</select><CaretDown size={18} /></span></label>
              <label className="rental-duration-field"><span>Thời gian thuê</span><span className="rental-select-wrap"><select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>{[4, 5, 6, 7, 8].map((hours) => <option value={hours} key={hours}>{hours} giờ — kết thúc {vietnamParts(addHours(draft.startAt, hours)).time}</option>)}</select><CaretDown size={18} /></span></label>
              <p className="rental-hourly-note">Thuê theo giờ phù hợp cho chuyến đi ngắn, tối đa 8 giờ.</p>
            </div>
          )}

          {error ? <p className="rental-error" role="alert">{error}</p> : null}
        </div>

        <footer className="rental-modal-footer">
          <div>
            <strong>{formatRentalSummary(displaySelection)}</strong>
            <span>Thời gian thuê: <b>{displaySelection.billableUnits} {displaySelection.unitLabel}</b></span>
          </div>
          <button type="button" onClick={() => void confirm()} disabled={isSubmitting || showLimitWarning}>
            {isSubmitting ? "Đang kiểm tra…" : "Tiếp tục"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
