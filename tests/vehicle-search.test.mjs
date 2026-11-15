import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getVehicleCatalog } from "../src/owner/catalog-api.ts";

test("catalog sends the selected location and complete rental window", async () => {
  const originalFetch = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url, options) => {
    requested = { url: new URL(url, "https://bonbon.test"), signal: options.signal };
    return new Response(JSON.stringify([]));
  };
  const controller = new AbortController();
  try {
    await getVehicleCatalog(controller.signal, {
      location: "TP. Hồ Chí Minh", rentalType: "Hourly",
      startAt: "2030-01-01T02:00:00.000Z", endAt: "2030-01-01T06:00:00.000Z",
    });
    assert.equal(requested.url.pathname, "/api/vehicles");
    assert.equal(requested.url.searchParams.get("location"), "TP. Hồ Chí Minh");
    assert.equal(requested.url.searchParams.get("rentalType"), "Hourly");
    assert.equal(requested.url.searchParams.get("startAt"), "2030-01-01T02:00:00.000Z");
    assert.equal(requested.url.searchParams.get("endAt"), "2030-01-01T06:00:00.000Z");
    assert.equal(requested.signal, controller.signal);
  } finally { globalThis.fetch = originalFetch; }
});

test("search updates browser history, reloads conditions and retains shared car links", async () => {
  const source = await readFile(new URL("../src/components/vehicles/VehicleListPage.tsx", import.meta.url), "utf8");
  assert.match(source, /window\.addEventListener\("popstate", syncSearch\)/);
  assert.match(source, /updateSearchUrl\(event\.target\.value, rentalWindow\)/);
  assert.match(source, /updateSearchUrl\(location, selection\)/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /linkedVehicle\?\.id === selectedVehicleId/);
});
