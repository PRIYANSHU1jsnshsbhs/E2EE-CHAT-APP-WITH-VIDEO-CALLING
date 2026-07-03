import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Vite configuration for the React frontend.
// The proxy matters because the browser talks to the Vite dev server on one port,
// while the Spring Boot backend listens on another.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/chat": {
        // Frontend code connects to `/chat`, but the actual websocket endpoint lives on the backend.
        // Vite forwards that local dev request to Spring Boot on port 8080.
        target: "http://localhost:8080",
        changeOrigin: true,
        // Important for websocket/SockJS traffic. Without this, Vite would only proxy normal HTTP.
        ws: true,
        headers: {
          // Some backends validate the request origin during the websocket handshake.
          Origin: "http://localhost:8080",
        },
      },
      "/api": {
        // Forward all REST API calls to the Spring Boot backend.
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
