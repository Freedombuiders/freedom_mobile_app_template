import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: Vite serves the React app on :5173 and forwards /api to the Worker (`wrangler dev` on :8787).
// Prod: `vite build` → dist/, which the Worker serves as static assets (apps/api/wrangler.jsonc "assets").
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: false } },
  },
});
