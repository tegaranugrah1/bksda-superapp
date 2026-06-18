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

function cookieSecurityAttributes() {
  if (typeof window === "undefined") return "";

  return window.location.protocol === "https:" ? "; Secure" : "";
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
  const [loggedIn, userString] = snapshot.split("\n");

  if (!loggedIn || !userString) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userString) as StoredUser;
    if (user.nama_lengkap && !user.name) user.name = user.nama_lengkap;

    // "session" bertindak sebagai placeholder token untuk kompatibilitas pengecekan isAuthenticated
    return { token: "session", user };
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

    return () => {
      window.removeEventListener("auth-change", notify);
      window.removeEventListener("storage", notify);
      window.removeEventListener("pageshow", notify);
      window.removeEventListener("popstate", notify);
    };
  },

  getSnapshot: getAuthSnapshot,

  // Fungsi Login Sentral
  login(token: string, userData: unknown) {
    if (typeof window === "undefined") return;
    
    // Simpan indikator logged_in alih-alih token mentah
    localStorage.setItem("bksda_logged_in", "true");
    localStorage.setItem("bksda_user", JSON.stringify(userData));
    
    setAuthCookie("bksda_logged_in", "true");
    setAuthCookie("bksda_user", JSON.stringify(userData));

    window.dispatchEvent(new Event("auth-change"));
  },

  // Update User Data only
  updateUser(userData: unknown) {
    if (typeof window === "undefined") return;

    localStorage.setItem("bksda_user", JSON.stringify(userData));
    setAuthCookie("bksda_user", JSON.stringify(userData));

    window.dispatchEvent(new Event("auth-change"));
  },

  // Fungsi Logout Sentral
  logout() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("bksda_logged_in");
    localStorage.removeItem("bksda_user");
    localStorage.removeItem("bksda_token"); // Bersihkan sisa token lama
    
    deleteAuthCookie("bksda_logged_in");
    deleteAuthCookie("bksda_user");
    deleteAuthCookie("bksda_token");

    window.dispatchEvent(new Event("auth-change"));
  }
};
