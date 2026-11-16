import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CaretDown, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { checkVehicleAvailability, getOccupiedIntervals, validateRentalWindow, type OccupiedInterval, type RentalType, type RentalWindowResponse } from "../../booking/booking-api";
import { firstFutureRentalTime, HOURLY_PICKUP_OPTIONS, isFutureRentalSlot, isValidHourlyRental, RENTAL_TIME_OPTIONS, vietnamDateKey } from "../../booking/rental-time";

export type RentalSelection = RentalWindowResponse;

interface RentalTimeModalProps {
  vehicleId?: string;
  value: RentalSelection;
  onClose: () => void;
  onConfirm: (selection: RentalSelection) => void;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TIME_OPTIONS = RENTAL_TIME_OPTIONS;
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
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function CalendarMonth({
  month,
  startDate,
  endDate,
  onSelect,
  occupied,
}: {
  month: Date;
  startDate: string;
  endDate: string;
  onSelect: (date: string) => void;
  occupied: OccupiedInterval[];
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = vietnamDateKey(Date.now());
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
          const hasOccupiedTime = occupied.some(interval => new Date(interval.startAt).getTime() < new Date(`${key}T00:00:00+07:00`).getTime() + 86_400_000 && new Date(interval.endAt).getTime() > new Date(`${key}T00:00:00+07:00`).getTime());
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const inRange = Boolean(endDate && key > startDate && key < endDate);
          return (
            <button
              type="button"
              key={key}
              disabled={disabled}
              className={`${isStart || isEnd ? "is-selected" : ""} ${inRange ? "is-in-range" : ""} ${hasOccupiedTime ? "has-occupied-time" : ""}`}
              aria-label={`Chọn ngày ${date.getDate()} tháng ${date.getMonth() + 1}${hasOccupiedTime ? ", có giờ đã được đặt" : ""}`}
              title={hasOccupiedTime ? "Ngày này có giờ đã được đặt" : undefined}
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

export function RentalTimeModal({ vehicleId, value, onClose, onConfirm }: RentalTimeModalProps) {
  const initialStartValue = vietnamParts(value.startAt);
  const current = Date.now();
  let initialStart = initialStartValue;
  if (value.rentalType === "Hourly" && (!isFutureRentalSlot(initialStartValue.date, initialStartValue.time, current) || !isValidHourlyRental(initialStartValue.time, 4))) {
    let date = vietnamDateKey(current);
    let next = firstFutureRentalTime(date, current);
    if (!next) { date = vietnamDateKey(current + 86_400_000); next = firstFutureRentalTime(date, current); }
    if (next) initialStart = { date, time: next };
  }
  const initialEnd = vietnamParts(value.endAt);
  const [mode, setMode] = useState<RentalType>(value.rentalType);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [durationHours, setDurationHours] = useState(value.rentalType === "Hourly" && isValidHourlyRental(initialStart.time, value.billableUnits) ? value.billableUnits : 4);
  const [savedDailyStart, setSavedDailyStart] = useState<{ date: string; time: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [viewMonth, setViewMonth] = useState(() => {
    const date = new Date(`${initialStart.date}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [occupied, setOccupied] = useState<OccupiedInterval[]>([]);
  const [scheduleState, setScheduleState] = useState<"loading" | "ready" | "error">(vehicleId ? "loading" : "ready");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  function selectHourlyDate(date: string) {
    if (!date) return;
    const current = Date.now();
    setNow(current);
    setStartDate(date);
    setError("");
    if (!isFutureRentalSlot(date, startTime, current) || !isValidHourlyRental(startTime, 4)) {
      const next = firstFutureRentalTime(date, current);
      if (next) setStartTime(next);
    }
  }

  function selectHourlyMode() {
    if (mode === "Hourly") return;
    const current = Date.now();
    let date = vietnamDateKey(current);
    let next = firstFutureRentalTime(date, current);
    if (!next) {
      date = vietnamDateKey(current + 86_400_000);
      next = firstFutureRentalTime(date, current);
    }
    setNow(current);
    setSavedDailyStart({ date: startDate, time: startTime });
    setMode("Hourly");
    setError("");
    setStartDate(date);
    if (next) setStartTime(next);
    setDurationHours(4);
  }

  function selectDailyMode() {
    if (mode === "Daily") return;
    if (savedDailyStart) {
      setStartDate(savedDailyStart.date);
      setStartTime(savedDailyStart.time);
      setSavedDailyStart(null);
    }
    setMode("Daily");
    setError("");
  }

  const nextMonth = useMemo(
    () => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    [viewMonth],
  );

  const draft = useMemo(() => {
    const startAt = toIso(startDate, startTime);
    const endAt = mode === "Hourly" ? addHours(startAt, durationHours) : endDate ? toIso(endDate, endTime) : "";
    return { startAt, endAt };
  }, [durationHours, endDate, endTime, mode, startDate, startTime]);

  const scheduleMonth = mode === "Hourly" ? startDate.slice(0, 7) : `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
  useEffect(() => {
    if (!vehicleId || !/^\d{4}-\d{2}$/.test(scheduleMonth)) return;
    const [year, month] = scheduleMonth.split("-").map(Number);
    const start = toIso(`${scheduleMonth}-01`, "00:00");
    const endDateUtc = new Date(Date.UTC(year, month + 2, 1));
    const endKey = `${endDateUtc.getUTCFullYear()}-${String(endDateUtc.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const controller = new AbortController();
    setScheduleState("loading");
    getOccupiedIntervals(vehicleId, start, toIso(endKey, "00:00"), controller.signal)
      .then(intervals => { if (!controller.signal.aborted) { setOccupied(intervals); setScheduleState("ready"); } })
      .catch(() => { if (!controller.signal.aborted) setScheduleState("error"); });
    return () => controller.abort();
  }, [vehicleId, scheduleMonth]);

  const overlaps = (start: string, end: string) => !!end && occupied.some(interval =>
    Date.parse(start) < Date.parse(interval.endAt) && Date.parse(end) > Date.parse(interval.startAt));
  const selectedTimeBusy = vehicleId && overlaps(draft.startAt, draft.endAt);

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
      if (!isFutureRentalSlot(date, startTime, Date.now())) {
        const next = firstFutureRentalTime(date, Date.now());
        if (next) setStartTime(next);
      }
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
    if (!isFutureRentalSlot(startDate, startTime, Date.now())) {
      setNow(Date.now());
      setError("Giờ nhận xe đã qua. Vui lòng chọn giờ khác.");
      return;
    }
    if (mode === "Hourly" && !isValidHourlyRental(startTime, durationHours)) {
      setError("Vui lòng chọn giờ nhận xe và thời lượng thuê từ 4 đến 8 giờ.");
      return;
    }
    if (vehicleId && scheduleState !== "ready") { setError("Chưa thể kiểm tra lịch xe. Vui lòng mở lại và thử lại."); return; }
    if (selectedTimeBusy) { setError("Xe đã có lịch trong khoảng thời gian này. Vui lòng chọn giờ khác."); return; }
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
      if (vehicleId && !(await checkVehicleAvailability(vehicleId, normalized))) {
        setError("Xe vừa có lịch trong khoảng thời gian này. Vui lòng chọn giờ khác.");
        return;
      }
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
          <button type="button" role="tab" aria-selected={mode === "Daily"} className={mode === "Daily" ? "active" : ""} onClick={selectDailyMode}>Thuê ngày</button>
          <button type="button" role="tab" aria-selected={mode === "Hourly"} className={mode === "Hourly" ? "active" : ""} onClick={selectHourlyMode}>Thuê giờ</button>
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
                  <CalendarMonth month={viewMonth} startDate={startDate} endDate={endDate} onSelect={selectDailyDate} occupied={occupied} />
                  <CalendarMonth month={nextMonth} startDate={startDate} endDate={endDate} onSelect={selectDailyDate} occupied={occupied} />
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
                <label><span>Nhận xe</span><span className="rental-select-wrap"><select value={startTime} onChange={(event) => setStartTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time} disabled={!isFutureRentalSlot(startDate, time, now) || (!!vehicleId && occupied.some(interval => Date.parse(toIso(startDate, time)) >= Date.parse(interval.startAt) && Date.parse(toIso(startDate, time)) < Date.parse(interval.endAt)))}>{time}</option>)}</select><CaretDown size={18} /></span></label>
                <ArrowRight className="rental-time-arrow" size={20} />
                <label><span>Trả xe</span><span className="rental-select-wrap"><select value={endTime} onChange={(event) => setEndTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time} disabled={!!vehicleId && !!endDate && overlaps(draft.startAt, toIso(endDate, time))}>{time}</option>)}</select><CaretDown size={18} /></span></label>
              </div>
              {!isFutureRentalSlot(startDate, startTime, now) ? <p className="rental-error" role="alert">Giờ nhận xe đã qua. Vui lòng chọn giờ khác.</p> : null}
            </>
          ) : (
            <div className="rental-hourly-fields">
              <label><span>Ngày bắt đầu</span><input type="date" min={vietnamDateKey(now)} value={startDate} onChange={(event) => selectHourlyDate(event.target.value)} /></label>
              <label><span>Giờ nhận xe</span><span className="rental-select-wrap"><select value={startTime} onChange={(event) => { setStartTime(event.target.value); setError(""); }}>{HOURLY_PICKUP_OPTIONS.map((time) => <option key={time} disabled={!isFutureRentalSlot(startDate, time, now) || (!!vehicleId && overlaps(toIso(startDate, time), addHours(toIso(startDate, time), durationHours)))}>{time}</option>)}</select><CaretDown size={18} /></span></label>
              <label className="rental-duration-field"><span>Thời gian thuê</span><span className="rental-select-wrap"><select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>{[4, 5, 6, 7, 8].map((hours) => { const end = vietnamParts(addHours(draft.startAt, hours)); return <option value={hours} key={hours} disabled={!!vehicleId && overlaps(draft.startAt, addHours(draft.startAt, hours))}>{hours} giờ - kết thúc {end.time}{end.date !== startDate ? " (ngày hôm sau)" : ""}</option>; })}</select><CaretDown size={18} /></span></label>
              <p className="rental-hourly-note">Thuê từ 4 đến 8 giờ, có thể trả xe vào ngày hôm sau.</p>
              {!firstFutureRentalTime(startDate, now) ? <p className="rental-error" role="alert">Không còn giờ nhận xe trong ngày này. Vui lòng chọn ngày tiếp theo.</p> : !isFutureRentalSlot(startDate, startTime, now) ? <p className="rental-error" role="alert">Giờ nhận xe đã qua. Vui lòng chọn giờ khác.</p> : null}
            </div>
          )}

          {vehicleId && scheduleState === "loading" ? <p role="status">Đang tải lịch xe…</p> : null}
          {vehicleId && scheduleState === "error" ? <p className="rental-error" role="alert">Không thể tải lịch xe. Vui lòng đóng và mở lại.</p> : null}
          {selectedTimeBusy && scheduleState === "ready" ? <p className="rental-error" role="alert">Xe đã có lịch trong khoảng thời gian này. Vui lòng chọn giờ khác.</p> : null}
          {error ? <p className="rental-error" role="alert">{error}</p> : null}
        </div>

        <footer className="rental-modal-footer">
          <div>
            <strong>{formatRentalSummary(displaySelection)}</strong>
            <span>Thời gian thuê: <b>{displaySelection.billableUnits} {displaySelection.unitLabel}</b></span>
          </div>
          <button type="button" onClick={() => void confirm()} disabled={isSubmitting || showLimitWarning || !!selectedTimeBusy || !isFutureRentalSlot(startDate, startTime, now) || (mode === "Hourly" && !isValidHourlyRental(startTime, durationHours)) || (!!vehicleId && scheduleState !== "ready")}>
            {isSubmitting ? "Đang kiểm tra…" : "Tiếp tục"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
