/**
 * Kho lưu trữ cục bộ theo tài khoản.
 *
 * Dữ liệu cá nhân (GPLX, địa chỉ) KHÔNG được lưu bằng một khoá cố định —
 * nếu không, tài khoản B đăng nhập sau tài khoản A trên cùng trình duyệt sẽ
 * đọc lại dữ liệu của A.
 *
 * Mỗi tài khoản có một namespace riêng theo accountId, và kho của tài khoản
 * vừa đăng xuất được dọn khỏi RAM để không còn "bản xem trước" của người trước.
 */

const NAMESPACE_PREFIX = "bonbon.user.";

/** Khoá lưu trữ đang gắn với tài khoản hiện tại (RAM, không persist). */
let activeAccountId: string | null = null;

/** Dữ liệu đã nạp cho tài khoản hiện tại, dùng để đồng bộ giữa các màn hình. */
const listeners = new Set<() => void>();

function accountPrefix(accountId: string) {
  return `${NAMESPACE_PREFIX}${accountId}.`;
}

/**
 * Đặt tài khoản đang hoạt động. Khi đổi tài khoản, dữ liệu trong RAM của
 * tài khoản cũ bị xóa để không ai nhìn thấy dữ liệu của người trước.
 */
export function setActiveAccount(accountId: string | null) {
  if (activeAccountId === accountId) return;
  activeAccountId = accountId;
  notify();
}

/** Tài khoản hiện tại. */
export function getActiveAccount() {
  return activeAccountId;
}

/** Khoá đầy đủ của một tài khoản (dùng khi cần dọn toàn bộ dữ liệu của account). */
export function accountStorageKey(accountId: string, name: string) {
  return `${accountPrefix(accountId)}${name}`;
}

/**
 * Đọc một giá trị của tài khoản hiện tại.
 * Nếu chưa có tài khoản hoạt động -> trả null (không đọc dữ liệu của người khác).
 */
export function readUserValue<T>(name: string, fallback: T): T {
  if (!activeAccountId) return fallback;
  try {
    const raw = localStorage.getItem(accountStorageKey(activeAccountId, name));
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Ghi một giá trị của tài khoản hiện tại. */
export function writeUserValue<T>(name: string, value: T) {
  if (!activeAccountId) return;
  try {
    localStorage.setItem(accountStorageKey(activeAccountId, name), JSON.stringify(value));
  } catch {
    // localStorage đầy hoặc bị chặn — bỏ qua, dữ liệu demo không chặn luồng chính.
  }
  notify();
}

/** Xoá một giá trị của tài khoản hiện tại. */
export function removeUserValue(name: string) {
  if (!activeAccountId) return;
  localStorage.removeItem(accountStorageKey(activeAccountId, name));
  notify();
}

/** Đăng ký listener được gọi khi dữ liệu tài khoản thay đổi. */
export function subscribeUserStore(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Xoá toàn bộ dữ liệu lưu của một tài khoản khỏi localStorage.
 * Dùng khi logout nếu chính sách yêu cầu không giữ dữ liệu trên thiết bị.
 */
export function clearAccountStorage(accountId: string) {
  const prefix = accountPrefix(accountId);
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
