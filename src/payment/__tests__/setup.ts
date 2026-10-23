import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  // Test-only fetch boundary. Unexpected requests fail; no API server or DB is contacted.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Unexpected network request in test"))));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
