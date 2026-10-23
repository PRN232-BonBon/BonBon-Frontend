import { defineConfig } from "@playwright/test";

// Tests run against built assets. Every API call is intercepted by the test fixture.
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 20000,
  use: { baseURL: "http://127.0.0.1:4179", channel: "msedge", headless: true, serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4179 --strictPort",
    url: "http://127.0.0.1:4179", reuseExistingServer: false,
  },
});
