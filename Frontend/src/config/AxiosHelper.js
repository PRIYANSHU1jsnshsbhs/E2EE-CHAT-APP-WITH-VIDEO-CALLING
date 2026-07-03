import axios from "axios";

// In local dev, baseURL is empty — Vite's proxy forwards /api and /chat to localhost:8080.
// In production, set VITE_API_BASE_URL to your deployed backend URL, e.g.:
//   VITE_API_BASE_URL=https://your-backend.up.railway.app
// Vite exposes env vars prefixed with VITE_ to the browser bundle at build time.
export const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export const httpClient = axios.create({
  baseURL,
});
