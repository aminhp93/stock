import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base is '/' when standalone, '/stock' when run as microfrontend (via dev:mf)
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 3003,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
