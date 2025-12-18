import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 8080,
    open: true,
    proxy: {
      // Socket.IO (websocket + polling)
      "/socket.io": {
        target: "http://localhost:3002",
        ws: true,
        changeOrigin: true,
      }
    },
  },
});