import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// Same-origin staging build; never inherit a production API/Google target from local .env.
export default defineConfig({plugins:[react(),tailwindcss()],
  define:{"import.meta.env.VITE_API_URL":JSON.stringify("/api"),"import.meta.env.VITE_GOOGLE_CLIENT_ID":JSON.stringify(""),"import.meta.env.VITE_LOCAL_IPN_SIMULATION":JSON.stringify("false")},
  build:{outDir:"dist-payment-sandbox"},
});
