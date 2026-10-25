import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: { outDir: "dist-admin", rollupOptions: { input: "admin.html" } },
  server: { proxy: { "/api": { target: "http://localhost:5188", changeOrigin: true } } },
});
