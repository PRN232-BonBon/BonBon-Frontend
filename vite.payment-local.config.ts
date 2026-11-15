import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Local manual test only. Never inherit production targets from .env.
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "payment-local-notice",
    transformIndexHtml: () => [{ tag: "div", injectTo: "body-prepend",
      attrs: { style: "padding:8px;text-align:center;background:#fff3cd;color:#573b00;font:14px sans-serif;position:relative;z-index:10" },
      children: "LOCAL · VNPay legacy sandbox · Không phải bằng chứng thanh toán thật",
    }],
  }],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("/api"),
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(""),
    "import.meta.env.VITE_LOCAL_IPN_SIMULATION": JSON.stringify("false"),
  },
  server: {
    host: "127.0.0.1", port: 5289, strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:5288", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:5288", changeOrigin: true },
    },
  },
});
