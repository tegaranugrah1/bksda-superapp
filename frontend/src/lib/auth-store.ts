export interface StoredUser {
  id: string;
  name?: string;
  nama_lengkap?: string;
  username: string;
  email: string;
  role: string;
  access_modules: string[];
  permissions?: string[] | null;
}

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

// Cross-tab broadcast channel for instantaneous sync
const authChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("bksda_auth_channel")
    : null;

function cookieSecurityAttributes() {
  if (typeof window === "undefined") return "";

  const isHttps = window.location.protocol === "https:";
  const hostname = window.location.hostname;
  // If production domain, set domain to .bksdakaltim.net so both apex and all subdomains share cookies
  const domainAttr = hostname.endsWith("bksdakaltim.net") ? "; domain=.bksdakaltim.net" : "";
  return `${isHttps ? "; Secure" : ""}${domainAttr}`;
}

function setAuthCookie(name: string, value: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${cookieSecurityAttributes()}`;
}

function deleteAuthCookie(name: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${cookieSecurityAttributes()}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawValue = parts.pop()?.split(";").shift() ?? null;
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  return null;
}

function getUserString() {
  if (typeof window === "undefined") return null;

  const localUser = localStorage.getItem("bksda_user");
  if (localUser) return localUser;

  const cookieUser = getCookie("bksda_user");
  return cookieUser;
}

export function getAuthSnapshot() {
  if (typeof window === "undefined") return "";

  const loggedIn = localStorage.getItem("bksda_logged_in") || getCookie("bksda_logged_in") || "";
  const user = getUserString() || "";

  return `${loggedIn}\n${user}`;
}

export function parseAuthSnapshot(snapshot: string) {
  const newlineIndex = snapshot.indexOf("\n");
  if (newlineIndex === -1) {
    return { token: null, user: null };
  }

  const loggedIn = snapshot.substring(0, newlineIndex);
  const userString = snapshot.substring(newlineIndex + 1);

  if (!loggedIn || !userString) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userString) as StoredUser;
    if (user.nama_lengkap && !user.name) user.name = user.nama_lengkap;

    const token = (typeof window !== "undefined" ? localStorage.getItem("bksda_token") : null) || "session";
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const authStore = {
  subscribe(listener: () => void) {
    if (typeof window === "undefined") return () => {};

    const notify = () => listener();

    window.addEventListener("auth-change", notify);
    window.addEventListener("storage", notify);
    window.addEventListener("pageshow", notify);
    window.addEventListener("popstate", notify);
    window.addEventListener("focus", notify);
    document.addEventListener("visibilitychange", notify);

    if (authChannel) {
      authChannel.addEventListener("message", notify);
    }

    return () => {
      window.removeEventListener("auth-change", notify);
      window.removeEventListener("storage", notify);
      window.removeEventListener("pageshow", notify);
      window.removeEventListener("popstate", notify);
      window.removeEventListener("focus", notify);
      document.removeEventListener("visibilitychange", notify);

      if (authChannel) {
        authChannel.removeEventListener("message", notify);
      }
    };
  },

  getSnapshot: getAuthSnapshot,

  // Fungsi Login Sentral
  login(token: string, userData: unknown) {
    if (typeof window === "undefined") return;
    
    const userJson = JSON.stringify(userData);
    localStorage.setItem("bksda_logged_in", "true");
    localStorage.setItem("bksda_user", userJson);
    if (token) {
      localStorage.setItem("bksda_token", token);
    }
    
    setAuthCookie("bksda_logged_in", "true");
    setAuthCookie("bksda_user", userJson);
    if (token) {
      setAuthCookie("bksda_token", token);
    }

    window.dispatchEvent(new Event("auth-change"));

    if (authChannel) {
      try {
        authChannel.postMessage({ type: "LOGIN", token, user: userData });
      } catch {}
    }
  },

  // Update User Data only
  updateUser(userData: unknown) {
    if (typeof window === "undefined") return;

    const userJson = JSON.stringify(userData);
    const existing = localStorage.getItem("bksda_user");
    if (existing === userJson) {
      return; // No change, avoid dispatching events
    }

    localStorage.setItem("bksda_user", userJson);
    setAuthCookie("bksda_user", userJson);

    window.dispatchEvent(new Event("auth-change"));

    if (authChannel) {
      try {
        authChannel.postMessage({ type: "USER_UPDATE", user: userData });
      } catch {}
    }
  },

  // Fungsi Logout Sentral
  logout() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("bksda_logged_in");
    localStorage.removeItem("bksda_user");
    localStorage.removeItem("bksda_token");
    
    deleteAuthCookie("bksda_logged_in");
    deleteAuthCookie("bksda_user");
    deleteAuthCookie("bksda_token");

    window.dispatchEvent(new Event("auth-change"));

    if (authChannel) {
      try {
        authChannel.postMessage({ type: "LOGOUT" });
      } catch {}
    }
  }
};
