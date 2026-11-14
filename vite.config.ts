import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5188",
        changeOrigin: true,
      },
      // SignalR hub của backend tracking: cần ws: true để WebSocket đi qua Vite.
      "/hubs": {
        target: "http://localhost:5188",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
