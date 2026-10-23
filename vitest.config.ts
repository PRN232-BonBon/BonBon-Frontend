import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:5173" } },
    setupFiles: ["./src/payment/__tests__/setup.ts"],
    include: ["src/payment/__tests__/**/*.test.{ts,tsx}"],
    clearMocks: true,
  },
});
