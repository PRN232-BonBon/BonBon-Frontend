import type { AuthSession } from "../auth/auth-api";

const API_BASE_URL = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

const NETWORK_MESSAGE = "Không kết nối được tới máy chủ BonBon.";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** `GET /api/bookings/{id}/tracking/status` */
export interface TrackingStatus {
  bookingId: string;
  viewerRole: string;
  /** Ready | MeetingPointsMissing | Inactive */
  state: string;
  canTrack: boolean;
  deadline: string;
  meetingPointsConfigured: boolean;
}

/** `GET /api/bookings/{id}/tracking/snapshot` và payload `PositionUpdated` của SignalR. */
export interface TrackingSnapshot {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  destinationLatitude: number;
  destinationLongitude: number;
  distanceMeters: number;
  arrived: boolean;
}

/** `GET /api/bookings/owner` */
export interface OwnerBooking {
  bookingId: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  coverImageUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  rentalType: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

/** `POST /api/bookings/{id}/tracking/positions` — điện thoại/trình duyệt người thuê gửi GPS. */
export interface ReportPositionPayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedAt?: string;
}

/** `PUT /api/bookings/{id}/tracking/meeting-points` */
export interface MeetingPointsPayload {
  pickupLatitude: number;
  pickupLongitude: number;
  returnLatitude: number;
  returnLongitude: number;
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class TrackingApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "TrackingApiError";
    this.status = status;
    this.code = code;
  }

  get isSessionExpired() {
    return this.status === 401;
  }
}

async function readProblem(response: Response) {
  let problem: ProblemDetails | null = null;
  try {
    problem = await response.json() as ProblemDetails;
  } catch {
    // Some authorization failures return an empty body.
  }

  const validationMessage = problem?.errors
    ? Object.values(problem.errors).flat().find(Boolean)
    : undefined;
  const code = problem?.title?.trim() || `HTTP_${response.status}`;

  return new TrackingApiError(
    response.status,
    code,
    validationMessage ?? problem?.detail ?? problem?.title ?? "Không thể kết nối tới BonBon. Vui lòng thử lại.",
  );
}

async function request<T>(path: string, session: AuthSession, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        ...init?.headers,
      },
    });
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "AbortError") throw reason;
    throw new TrackingApiError(0, "NETWORK", NETWORK_MESSAGE);
  }

  if (!response.ok) throw await readProblem(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function bookingPath(bookingId: string, suffix: string) {
  return `/bookings/${encodeURIComponent(bookingId)}/tracking/${suffix}`;
}

export function getOwnerBookings(session: AuthSession, signal?: AbortSignal) {
  return request<OwnerBooking[]>("/bookings/owner", session, { signal });
}

export function getTrackingStatus(bookingId: string, session: AuthSession, signal?: AbortSignal) {
  return request<TrackingStatus>(bookingPath(bookingId, "status"), session, { signal });
}

export function getTrackingSnapshot(bookingId: string, session: AuthSession, signal?: AbortSignal) {
  return request<TrackingSnapshot>(bookingPath(bookingId, "snapshot"), session, { signal });
}

export function reportTrackingPosition(bookingId: string, payload: ReportPositionPayload, session: AuthSession) {
  return request<void>(bookingPath(bookingId, "positions"), session, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setMeetingPoints(bookingId: string, payload: MeetingPointsPayload, session: AuthSession) {
  return request<void>(bookingPath(bookingId, "meeting-points"), session, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Hub thật của backend là `/hubs/tracking`. Khi `VITE_API_URL` trỏ tới một
 * origin tuyệt đối thì bỏ hậu tố `/api` để lấy origin đó.
 */
export function trackingHubUrl() {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return `${API_BASE_URL.replace(/\/api$/i, "")}/hubs/tracking`;
  }
  return "/hubs/tracking";
}

export function trackingErrorMessage(error: unknown) {
  if (error instanceof TrackingApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Không thể tải dữ liệu theo dõi. Vui lòng thử lại.";
}
