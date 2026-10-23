import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dedicated local stage: .env cannot silently point Auth/Payment at production.
const proxy = { "/api": { target: "http://127.0.0.1:5288", changeOrigin: true },
  "/health": { target: "http://127.0.0.1:5288", changeOrigin: true } };
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("/api"), "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify("") },
  build: { outDir: "dist-payment-staging" },
  server: { host: "127.0.0.1", port: 5289, strictPort: true, proxy },
  preview: { host: "127.0.0.1", port: 5289, strictPort: true, proxy },
});
