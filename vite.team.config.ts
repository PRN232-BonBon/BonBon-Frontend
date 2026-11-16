import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // TEAM_* is consumed by the Vite server only; never embed it in client code.
  const env = loadEnv(mode, process.cwd(), 'TEAM_');
  const target = env.TEAM_BACKEND_URL?.replace(/\/$/, '');
  const key = env.TEAM_ACCESS_KEY;
  if (!target || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(target) || !key || key.length < 32)
    throw new Error('Set the actual TEAM_BACKEND_URL and TEAM_ACCESS_KEY in .env.team.local.');
  const proxy = { target, changeOrigin: true, secure: true, headers: { 'X-BonBon-Team-Key': key } };
  return {
    plugins: [react(), tailwindcss(), {
      name: 'team-sandbox-notice',
      transformIndexHtml: () => [{ tag:'div', injectTo:'body-prepend',
        // attrs:{style:'padding:8px;text-align:center;background:#fff3cd;font:14px sans-serif'},
        // children:'TEST NHÓM · SePay Sandbox · Dùng chung Backend/DB test',
      }],
    }],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(''),
      'import.meta.env.VITE_LOCAL_IPN_SIMULATION': JSON.stringify('false'),
    },
    server: { host:'127.0.0.1', port:5289, strictPort:true, proxy:{'/api':proxy,'/health':proxy} },
  };
});
