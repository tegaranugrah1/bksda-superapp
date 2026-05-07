import axios from "axios";
import { authStore } from "@/lib/auth-store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bksda_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "unknown endpoint";

    if (process.env.NODE_ENV === "development") {
      const detail = status ? `HTTP ${status}` : error.message;
      console.warn(`[API] ${url} failed: ${detail}`);
    }

    if (status === 401 && typeof window !== "undefined" && url !== "/login") {
      authStore.logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
