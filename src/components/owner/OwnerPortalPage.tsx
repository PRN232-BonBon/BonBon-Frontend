import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowClockwise, ArrowLeft, ArrowRight, CalendarBlank, Car, CarProfile, MapPin, Plus, MagnifyingGlass, SteeringWheel, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { useOwnerPortal } from "../../owner/useOwnerPortal";
import { addDay, blocksOnDay, bookingsOnDay, calendarBookingTone, calendarWindow, matchesOwnerVehicle, mondayOfWeek, ownerPortalAssets, ownerVehicleStatus, vietnamDay } from "../../owner/owner-portal-model";
import { getOwnerBlocks, type OwnerBlock, type OwnerBooking, type OwnerVehicle } from "../../owner/owner-api";
import { bookingStatusLabel } from "../../booking/booking-status";
import { formatBookingMoney as money } from "../../booking/booking-display";
import "./owner-portal.css";

type PortalView = "cars" | "calendar";
const shortDate = (day: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${day}T12:00:00Z`));

function OwnerEmpty({ image, title, description, register = false }: { image: string; title: string; description?: string; register?: boolean }) {
  return <div className="owner-portal-empty"><img src={image} alt="" /><h2>{title}</h2>{description ? <p>{description}</p> : null}{register ? <a className="op-primary" href="/owner/register"><Plus size={19} />Đăng ký xe tự lái</a> : null}</div>;
}
function OwnerLoading() { return <div className="op-skeletons" role="status" aria-label="Đang tải xe của bạn">{[1, 2, 3].map(item => <div key={item}><span /><section><i /><i /><i /></section></div>)}</div>; }

// Authentication and the shared remote navigation are supplied by App/PortalLayout.
export function OwnerPortalPage({ view }: { view: PortalView }) {
  const data = useOwnerPortal();
  const reduce = useReducedMotion();
  const refresh = <button className="op-refresh" type="button" disabled={data.refreshing} onClick={() => void data.refresh()}><ArrowClockwise size={19} className={data.refreshing ? "is-refreshing" : ""} /><span>Cập nhật</span></button>;
  return <section className={`owner-management owner-management-${view}`}>
    <header className="portal-title-row op-page-title"><h1>{view === "calendar" ? "Lịch xe" : "Danh sách xe"}</h1><div>{refresh}{view === "cars" ? <a className="op-register" href="/owner/register"><CarProfile size={22} /><span>Đăng ký</span></a> : null}</div></header>
    {data.error ? <div className="op-load-error" role="alert"><WarningCircle size={22} /><p>{data.error}</p><button type="button" onClick={() => void data.refresh()}>Thử lại</button></div> : null}
    <motion.div className="op-content" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
      {view === "cars" ? <OwnerCars {...data} /> : <OwnerCalendar {...data} />}
    </motion.div>
  </section>;
}

function OwnerCars({ vehicles, bookings, loading, error }: { vehicles: OwnerVehicle[]; bookings: OwnerBooking[]; loading: boolean; error: string }) {
  const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
  const filtered = vehicles.filter(car => (filter === "all" || (filter === "inactive" ? ["Suspended", "Archived", "Draft"].includes(car.status) : car.status === filter)) && matchesOwnerVehicle(car, search));
  return <>
    <div className="op-list-tools"><span className="op-self-drive"><SteeringWheel size={23} />Xe tự lái</span><label className="op-search"><MagnifyingGlass size={20} /><input aria-label="Tìm xe của tôi" placeholder="Tìm tên xe hoặc biển số" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label className="op-status-filter"><Car size={21} /><select aria-label="Trạng thái xe" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="Available">Đang hoạt động</option><option value="PendingApproval">Chờ duyệt</option><option value="Rejected">Bị từ chối</option><option value="inactive">Dừng hoạt động</option></select></label></div>
    {loading ? <OwnerLoading /> : error ? null : filtered.length === 0 ? <OwnerEmpty image={ownerPortalAssets.emptyVehicles} title="Không tìm thấy xe nào." description={vehicles.length ? "Thử chọn trạng thái hoặc từ khóa khác." : "Đăng ký chiếc xe đầu tiên để bắt đầu quản lý cho thuê."} register={!vehicles.length} /> : <div className="op-vehicle-list">{filtered.map(car => {
      const pending = bookings.filter(booking => booking.vehicleId === car.vehicleId && booking.status === "PendingApproval").length;
      return <article className="op-vehicle" key={car.vehicleId}>
        {car.coverImageUrl ? <img className="op-vehicle-cover" src={car.coverImageUrl} alt={`${car.brand} ${car.model}`} loading="lazy" /> : <div className="op-cover-empty"><CarProfile size={50} /></div>}
        <div className="op-vehicle-info"><h2>{car.brand} {car.model} {car.productionYear}</h2><span className="op-plate">{car.plateNumber}</span><span className={`op-vehicle-status op-status-${car.status.toLowerCase()}`}>{ownerVehicleStatus(car.status)}</span><p>{car.transmission === "Automatic" ? "Số tự động" : "Số sàn"} · {car.seats} chỗ · {car.imageCount} ảnh</p><p className="op-pickup"><MapPin size={16} />{car.pickupAddress}</p>
          {car.status === "Rejected" && car.rejectionReason ? <p className="op-rejection">Lý do từ chối: {car.rejectionReason}</p> : null}{pending ? <a className="op-pending-count" href="/owner/bookings">{pending} yêu cầu thuê đang chờ duyệt<ArrowRight size={16} /></a> : null}</div>
        <div className="op-vehicle-actions"><strong>{money(car.dayPrice)}<small>/ngày</small></strong><span>{money(car.hourPrice)}/giờ</span><a className="op-secondary" href={`/owner/calendar?vehicle=${car.vehicleId}`}><CalendarBlank size={18} />Xem lịch xe</a></div>
      </article>;
    })}</div>}
  </>;
}

function OwnerCalendar({ vehicles, bookings, loading, error, revision }: { vehicles: OwnerVehicle[]; bookings: OwnerBooking[]; loading: boolean; error: string; revision: number }) {
  const { session } = useAuth();
  const [day, setDay] = useState(() => mondayOfWeek(vietnamDay(Date.now())));
  const [search, setSearch] = useState(""); const [transmission, setTransmission] = useState(""); const [body, setBody] = useState(""); const [brand, setBrand] = useState(""); const [sort, setSort] = useState("available");
  const [vehicleId, setVehicleId] = useState(() => new URLSearchParams(window.location.search).get("vehicle") || "");
  const [blocks, setBlocks] = useState<OwnerBlock[]>([]); const [blocksError, setBlocksError] = useState(""); const [blocksLoading, setBlocksLoading] = useState(true); const [blockAttempt, setBlockAttempt] = useState(0);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController(); setBlocks([]); setBlocksError(""); setBlocksLoading(true);
    const window = calendarWindow(day);
    getOwnerBlocks(session, window.startAt, window.endAt, controller.signal).then(items => { if (!controller.signal.aborted) setBlocks(items); }).catch(reason => {
      if (!controller.signal.aborted) setBlocksError(reason instanceof TypeError ? "Không thể tải lịch bận. Chưa thể xác định ô lịch trống." : reason instanceof Error ? reason.message : "Không thể tải lịch bận.");
    }).finally(() => { if (!controller.signal.aborted) setBlocksLoading(false); });
    return () => controller.abort();
  }, [session, day, blockAttempt, revision]);
  const days = Array.from({ length: 14 }, (_, index) => addDay(day, index));
  const cars = vehicles.filter(car => matchesOwnerVehicle(car, search) && (!vehicleId || car.vehicleId === vehicleId) && (!transmission || car.transmission === transmission) && (!body || car.bodyType === body) && (!brand || car.brand === brand));
  const occupied = (id: string) => days.filter(date => bookingsOnDay(bookings, id, date).length || blocksOnDay(blocks, id, date).length).length;
  cars.sort((a, b) => sort === "price" ? a.dayPrice - b.dayPrice : sort === "name" ? `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "vi") : Number(b.status === "Available") - Number(a.status === "Available") || occupied(a.vehicleId) - occupied(b.vehicleId));
  return <section className="op-calendar-content">
    <div className="op-calendar-filters"><label><span>Sắp xếp</span><select aria-label="Sắp xếp lịch xe" value={sort} onChange={event => setSort(event.target.value)}><option value="available">Trống lịch (Mặc định)</option><option value="name">Tên xe</option><option value="price">Giá mặc định</option></select></label><label className="op-calendar-search"><MagnifyingGlass size={20} /><input aria-label="Tìm xe trên lịch" placeholder="Lọc theo tên hoặc biển số" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label><span>Truyền động</span><select aria-label="Truyền động lịch xe" value={transmission} onChange={event => setTransmission(event.target.value)}><option value="">Tất cả</option><option value="Automatic">Số tự động</option><option value="Manual">Số sàn</option></select></label><label><span>Xe của tôi</span><select aria-label="Chọn xe trên lịch" value={vehicleId} onChange={event => setVehicleId(event.target.value)}><option value="">Tất cả xe</option>{vehicles.map(car => <option key={car.vehicleId} value={car.vehicleId}>{car.brand} {car.model} · {car.plateNumber}</option>)}</select></label>
      <label><span>Dòng xe</span><select aria-label="Dòng xe trên lịch" value={body} onChange={event => setBody(event.target.value)}><option value="">Tất cả</option>{[...new Set(vehicles.map(car => car.bodyType))].sort().map(item => <option key={item}>{item}</option>)}</select></label><label><span>Hãng xe</span><select aria-label="Hãng xe trên lịch" value={brand} onChange={event => setBrand(event.target.value)}><option value="">Tất cả</option>{[...new Set(vehicles.map(car => car.brand))].sort().map(item => <option key={item}>{item}</option>)}</select></label></div>
    <div className="op-date-navigation"><button className="op-icon-button" type="button" aria-label="Hai tuần trước" onClick={() => setDay(addDay(day, -14))}><ArrowLeft size={19} /></button><label>Từ ngày<span className="op-date-field"><span aria-hidden="true">{shortDate(day)}</span><input aria-label="Ngày bắt đầu lịch" type="date" lang="vi-VN" value={day} onChange={event => { const value = event.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= "2100-12-17") setDay(value); }} /></span></label><span>Đến ngày <strong>{shortDate(addDay(day, 13))}</strong></span><button className="op-icon-button" type="button" aria-label="Hai tuần sau" onClick={() => setDay(addDay(day, 14))}><ArrowRight size={19} /></button><button className="op-today" type="button" onClick={() => setDay(mondayOfWeek(vietnamDay(Date.now())))}>Hôm nay</button></div>
    <ul className="op-calendar-legend"><li className="reserved">Chuyến BonBon</li><li className="payment">Chờ thanh toán</li><li className="pending">Chờ duyệt</li><li className="free">Trống lịch</li><li className="blocked">Bận lịch</li></ul>
    {blocksError ? <div className="op-inline-error" role="alert"><p>{blocksError}</p><button type="button" onClick={() => setBlockAttempt(value => value + 1)}>Tải lại lịch bận</button></div> : null}
    {loading ? <OwnerLoading /> : error ? null : !cars.length ? <OwnerEmpty image={ownerPortalAssets.emptyCalendar} title={vehicles.length ? "Không có xe phù hợp." : "Chưa có xe để hiển thị lịch."} description={vehicles.length ? "Điều chỉnh bộ lọc để xem lịch xe khác." : "Xe đã đăng ký sẽ xuất hiện tại đây cùng lịch cho thuê."} register={!vehicles.length} /> : <>
      <div className="op-calendar-table-wrap" aria-busy={blocksLoading}><table className="op-calendar-table"><caption>Lịch cho thuê từ {shortDate(day)} đến {shortDate(addDay(day, 13))}</caption><thead><tr><th scope="col">Xe tự lái <small>Giá mặc định/ngày</small></th>{days.map(date => <th key={date} scope="col" className={date === vietnamDay(Date.now()) ? "is-today" : ""}><small>{new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T12:00:00Z`))}</small>{date.slice(8)}/{date.slice(5, 7)}</th>)}</tr></thead><tbody>{cars.map(car => <tr key={car.vehicleId}><th scope="row"><div>{car.coverImageUrl ? <img src={car.coverImageUrl} alt="" /> : <CarProfile size={30} />}<span><strong>{car.brand} {car.model}</strong><small>{car.plateNumber}</small><small>{ownerVehicleStatus(car.status)}</small></span></div></th>{days.map(date => {
        const items = bookingsOnDay(bookings, car.vehicleId, date); const busy = blocksOnDay(blocks, car.vehicleId, date);
        return <td key={date} className={date === vietnamDay(Date.now()) ? "is-today" : ""}>{items.length || busy.length ? <div className="op-cell-events">{items.map(order => <button type="button" key={order.bookingId} className={`op-calendar-event ${calendarBookingTone(order.status)}`} title={`${bookingStatusLabel(order.status)} · ${order.customerName}`} aria-label={`${car.plateNumber}, ${shortDate(date)}, ${bookingStatusLabel(order.status)}, ${order.customerName}`} onClick={() => { window.location.href = `/owner/bookings?bookingId=${encodeURIComponent(order.bookingId)}`; }}>{order.customerName}<small>{bookingStatusLabel(order.status)}</small></button>)}{busy.map(block => <span key={block.blockId} className="op-calendar-event blocked" title={block.reason || "Bận lịch"}>Bận lịch</span>)}</div> : blocksLoading ? <span className="op-cell-unknown">Đang tải…</span> : blocksError ? <span className="op-cell-unknown" title="Chưa tải được lịch bận">Chưa rõ</span> : car.status !== "Available" ? <span className="op-cell-unknown">Chưa mở thuê</span> : <span className="op-cell-price" title="Trống lịch; đơn giá mặc định theo ngày">{(car.dayPrice / 1000).toLocaleString("vi-VN")}K</span>}</td>;
      })}</tr>)}</tbody></table></div><p className="op-calendar-note">Bấm vào đơn trên lịch để xem chi tiết. Ô trống hiển thị giá thuê ngày mặc định; giờ nhận và trả xe được ghi trong từng đơn.</p>

    </>}
  </section>;
}
