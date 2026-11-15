import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = file => readFile(new URL(`../src/${file}`, import.meta.url), "utf8");

test("legacy GPS route and remote tracking route use the same remote view", async () => {
  const app = await source("App.tsx");
  assert.match(app, /"\/owner\/gps": OwnerTrackingPage/);
  assert.match(app, /"\/owner\/tracking": OwnerTrackingPage/);
  assert.match(app, /"\/owner\/bookings": OwnerBookingsPage/);
  assert.match(app, /"\/owner\/cars": \(\) => <OwnerPortalPage view="cars"/);
  assert.match(app, /"\/owner\/calendar": \(\) => <OwnerPortalPage view="calendar"/);
  assert.doesNotMatch(app, /interface-mode|<<<<<<<|>>>>>>>/);
});

test("remote sidebar exposes retained local views without a second mode switch", async () => {
  const nav = await source("components/portal/PortalLayout.tsx");
  for (const path of ["/owner/cars", "/owner/calendar", "/owner/tracking", "/owner/bookings"]) assert.ok(nav.includes(`href: "${path}"`) || nav.includes(`href="${path}"`));
  assert.doesNotMatch(await source("components/portal/AccountPage.tsx"), /account-interface-switch|interface-mode/);
});

test("calendar links to remote approval and tracking has no duplicate booking API", async () => {
  const calendar = await source("components/owner/OwnerPortalPage.tsx");
  assert.ok(calendar.includes("/owner/bookings?bookingId="));
  assert.doesNotMatch(calendar, /OwnerBookingDialog|OwnerGps|decideOwnerBooking/);
  assert.doesNotMatch(await source("tracking/tracking-api.ts"), /function getOwnerBookings|interface OwnerBooking/);
  for (const file of ["components/owner/OwnerTrackingPage.tsx", "components/owner/OwnerBookingsPage.tsx", "owner/useOwnerPortal.ts"]) assert.match(await source(file), /["'][^"']*owner-api["']/);
});
