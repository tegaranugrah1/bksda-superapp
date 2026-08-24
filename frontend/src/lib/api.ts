import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { authStore } from "@/lib/auth-store";

function getBaseApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://127.0.0.1:8000/api";
  }

  const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  if (rawUrl.startsWith("http")) {
    try {
      const urlObj = new URL(rawUrl);
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        urlObj.hostname = window.location.hostname;
      }
      return urlObj.toString();
    } catch {
      return rawUrl;
    }
  }
  return rawUrl;
}

const api = axios.create({
  baseURL: getBaseApiUrl(),
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

// --- In-Flight Deduplication & Short-Term Throttle Cache ---
const inFlightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { timestamp: number; response: any }>();
const CACHE_TTL_MS = 2500; // 2.5 seconds short-term throttle for identical GET requests

function getRequestKey(method: string, url: string, params?: any): string {
  const paramStr = params ? JSON.stringify(params) : "";
  return `${method.toLowerCase()}:${url}:${paramStr}`;
}

const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);
const originalPut = api.put.bind(api);
const originalDelete = api.delete.bind(api);
const originalPatch = api.patch.bind(api);

api.get = function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  const key = getRequestKey("get", url, config?.params);

  // 1. Check short-term cache
  const cached = responseCache.get(key);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.response as R);
  }

  // 2. Check in-flight request (promise sharing)
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight as Promise<R>;
  }

  // 3. Execute request and share promise
  const promise = originalGet<T, R, D>(url, config)
    .then((res) => {
      responseCache.set(key, { timestamp: Date.now(), response: res });
      return res;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

// Invalidate cache on mutations
function clearGetCache() {
  responseCache.clear();
}

api.post = function (...args: any[]) {
  clearGetCache();
  return (originalPost as any)(...args);
};

api.put = function (...args: any[]) {
  clearGetCache();
  return (originalPut as any)(...args);
};

api.delete = function (...args: any[]) {
  clearGetCache();
  return (originalDelete as any)(...args);
};

api.patch = function (...args: any[]) {
  clearGetCache();
  return (originalPatch as any)(...args);
};

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
