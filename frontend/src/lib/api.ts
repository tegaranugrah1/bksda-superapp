import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { authStore } from "@/lib/auth-store";

type SessionScope = { key: string; generation: number };
type ScopedRequest = InternalAxiosRequestConfig & { portalSession?: SessionScope };

let authGeneration = 0;
let cacheGeneration = 0;

function readSessionKey(): string {
  if (typeof window === "undefined") return "server";
  let identity = "";
  try {
    const user = JSON.parse(localStorage.getItem("bksda_user") || getCookie("bksda_user") || "null");
    identity = user?.username || user?.id || "";
  } catch {}
  return JSON.stringify([
    identity,
    localStorage.getItem("bksda_token") || getCookie("bksda_token") || "",
    localStorage.getItem("bksda_logged_in") || getCookie("bksda_logged_in") || "",
  ]);
}

let sessionKey = readSessionKey();

function currentSession(): SessionScope {
  if (sessionKey !== readSessionKey()) clearGetCache(true);
  return { key: sessionKey, generation: authGeneration };
}

function isCurrentSession(scope: SessionScope): boolean {
  const current = currentSession();
  return scope.generation === current.generation && scope.key === current.key;
}

function rejectStaleSession(config?: AxiosRequestConfig): void {
  const scope = (config as ScopedRequest | undefined)?.portalSession;
  if (scope && !isCurrentSession(scope)) {
    throw new axios.CanceledError("Request belongs to a previous session");
  }
}

export function getApiSessionSnapshot(): string {
  const scope = currentSession();
  return JSON.stringify([scope.generation, scope.key]);
}

function getBaseApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith("http")) {
    if (typeof window !== "undefined") {
      try {
        const urlObj = new URL(envUrl);
        if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
          urlObj.hostname = window.location.hostname;
          return urlObj.toString().replace(/\/$/, "");
        }
      } catch {
        // ignore
      }
    }
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000/api";
  }

  return "/api";
}

const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 20000,
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
  (config as ScopedRequest).portalSession = currentSession();
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
}, undefined, { synchronous: true });

api.interceptors.response.use(
  (response) => {
    rejectStaleSession(response.config);
    return response;
  },
  (error) => {
    rejectStaleSession(error.config);
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

    if (status === 423 && typeof window !== "undefined") {
      const reason = error.response?.data?.reason;
      if (reason === "must_change_password") {
        if (!window.location.pathname.startsWith("/portal") || !window.location.search.includes("force_password_change")) {
          window.location.href = "/portal?force_password_change=1";
        }
      } else if (reason === "must_setup_2fa") {
        if (!window.location.pathname.startsWith("/portal") || !window.location.search.includes("force_setup_2fa")) {
          window.location.href = "/portal?force_setup_2fa=1";
        }
      }
    }

    return Promise.reject(error);
  }
);

// --- In-Flight Deduplication & Short-Term Throttle Cache ---
const inFlightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { timestamp: number; response: any }>();
const CACHE_TTL_MS = 2500; // 2.5 seconds short-term throttle for identical GET requests

function getRequestKey(scope: SessionScope, method: string, url: string, params?: any): string {
  const paramStr = params ? JSON.stringify(params) : "";
  return JSON.stringify([scope.key, method.toLowerCase(), url, paramStr]);
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
  // Binary downloads (blob/arraybuffer/stream) must bypass dedup & cache
  if (config?.responseType && config.responseType !== "json") {
    return originalGet<T, R, D>(url, config);
  }

  const scope = currentSession();
  const generation = cacheGeneration;
  const key = getRequestKey(scope, "get", url, config?.params);

  // 1. Check short-term cache
  const cached = responseCache.get(key);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve().then(() => {
      if (!isCurrentSession(scope)) throw new axios.CanceledError("Request belongs to a previous session");
      return cached.response as R;
    });
  }

  // 2. Check in-flight request (promise sharing)
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight as Promise<R>;
  }

  // 3. Execute request and share promise
  const promise = originalGet<T, R, D>(url, config)
    .then((res) => {
      if (!isCurrentSession(scope)) throw new axios.CanceledError("Request belongs to a previous session");
      if (generation === cacheGeneration) responseCache.set(key, { timestamp: Date.now(), response: res });
      return res;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === promise) inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

// Invalidate cache on mutations or logout
export function clearGetCache(sessionChanged = false) {
  cacheGeneration++;
  if (sessionChanged) {
    authGeneration++;
    sessionKey = readSessionKey();
  }
  responseCache.clear();
  inFlightRequests.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "bksda_user") {
      try {
        const oldUser = JSON.parse(event.oldValue || "null");
        const newUser = JSON.parse(event.newValue || "null");
        const identity = oldUser?.username || oldUser?.id;
        const authFields = ["id", "username", "role", "access_modules", "permissions"];
        if (oldUser && newUser &&
          (typeof identity === "string" ? identity.trim() : Number.isSafeInteger(identity) && identity > 0) &&
          JSON.stringify(oldUser, authFields) === JSON.stringify(newUser, authFields)) {
          // Profile refreshes flush cached data without canceling valid same-session requests.
          clearGetCache();
          return;
        }
      } catch {}
    }
    // Keep the boundary even when queued logout/login events restore the same identity.
    if (event.key === null || ["bksda_user", "bksda_token", "bksda_logged_in"].includes(event.key)) {
      clearGetCache(true);
    }
  });
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

export { api };
export default api;
