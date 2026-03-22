import { defineConfig } from "vite";

const apiPort = Number.parseInt(process.env.API_PORT || "8787", 10);

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 9999,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true
      }
    }
  }
});
