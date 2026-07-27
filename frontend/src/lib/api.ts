import axios from "axios";
import { authStore } from "@/lib/auth-store";

const api = axios.create({
  baseURL: typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL?.startsWith("http") ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000/api")
    : (process.env.NEXT_PUBLIC_API_URL || "/api"),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
  }
  return null;
}

api.interceptors.request.use((config) => {
  // Prevent double /api prefix if baseURL already contains /api
  if (config.url && config.baseURL) {
    const baseEndsWithApi = config.baseURL.replace(/\/$/, "").endsWith("/api");
    if (baseEndsWithApi && config.url.startsWith("/api/")) {
      config.url = config.url.substring(4);
    }
  } else if (config.url && config.url.startsWith("/api/")) {
    // Default fallback if baseURL is implicitly /api
    config.url = config.url.substring(4);
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bksda_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Secara manual melampirkan X-XSRF-TOKEN untuk request cross-origin (Next.js -> Laravel)
    const xsrfToken = getCookie("XSRF-TOKEN");
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "unknown endpoint";

    if (process.env.NODE_ENV === "development" && !url.includes("logout")) {
      const detail = status ? `HTTP ${status}` : error.message;
      console.warn(`[API] ${url} failed: ${detail}`);
    }

    if (status === 401 && typeof window !== "undefined" && url !== "/login" && !url.includes("logout")) {
      authStore.logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

const apiExport = api;

export function resolveApiUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return url;

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase || apiBase === "/api" || !apiBase.startsWith("http")) {
    return url;
  }

  try {
    const origin = new URL(apiBase).origin;
    return `${origin}${url}`;
  } catch {
    return url;
  }
}

export { apiExport as api };
export default apiExport;
