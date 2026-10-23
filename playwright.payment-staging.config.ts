import { defineConfig } from "@playwright/test";

// Servers are explicitly started separately. No merchant call, mock API or trace.
export default defineConfig({
  testDir: "./tests/staging", workers: 1, fullyParallel: false, timeout: 30000,
  use: { baseURL: "http://127.0.0.1:5289", channel: "msedge", headless: true,
    serviceWorkers: "block", screenshot: "off", trace: "off", video: "off" },
  projects: [{ name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } }],
});
