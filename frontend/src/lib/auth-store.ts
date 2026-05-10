export interface StoredUser {
  id: string;
  name?: string;
  nama_lengkap?: string;
  role: string;
  username: string;
  access_modules: string[];
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;

  return null;
}

function getUserString() {
  if (typeof window === "undefined") return null;

  const localUser = localStorage.getItem("bksda_user");
  if (localUser) return localUser;

  const cookieUser = getCookie("bksda_user");
  return cookieUser ? decodeURIComponent(cookieUser) : null;
}

export function getAuthSnapshot() {
  if (typeof window === "undefined") return "";

  const token = localStorage.getItem("bksda_token") || getCookie("bksda_token") || "";
  const user = getUserString() || "";

  return `${token}\n${user}`;
}

export function parseAuthSnapshot(snapshot: string) {
  const [token, userString] = snapshot.split("\n");

  if (!token || !userString) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userString) as StoredUser;
    if (user.nama_lengkap && !user.name) user.name = user.nama_lengkap;

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
    
    localStorage.setItem("bksda_token", token);
    localStorage.setItem("bksda_user", JSON.stringify(userData));
    
    document.cookie = `bksda_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `bksda_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=604800; SameSite=Lax`;

    window.dispatchEvent(new Event("auth-change"));
  },

  // Update User Data only
  updateUser(userData: unknown) {
    if (typeof window === "undefined") return;

    localStorage.setItem("bksda_user", JSON.stringify(userData));
    document.cookie = `bksda_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=604800; SameSite=Lax`;

    window.dispatchEvent(new Event("auth-change"));
  },

  // Fungsi Logout Sentral
  logout() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("bksda_token");
    localStorage.removeItem("bksda_user");
    
    document.cookie = "bksda_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "bksda_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    window.dispatchEvent(new Event("auth-change"));
  }
};
