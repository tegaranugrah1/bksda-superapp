let listeners: Array<() => void> = [];

export const authStore = {
  // Mendaftarkan komponen yang mau mendengarkan perubahan
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  // Mengambil data saat ini (Snapshot)
  getSnapshot() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("bksda_user"); // Kita pantau data user-nya
  },

  // Fungsi Login Sentral
  login(token: string, userData: unknown) {
    localStorage.setItem("bksda_token", token);
    localStorage.setItem("bksda_user", JSON.stringify(userData));
    
    // Set Cookies for Next.js Middleware support
    document.cookie = `bksda_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `bksda_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=604800; SameSite=Lax`;

    // Beritahu semua komponen bahwa data berubah!
    listeners.forEach((l) => l());
  },

  // Fungsi Logout Sentral
  logout() {
    localStorage.removeItem("bksda_token");
    localStorage.removeItem("bksda_user");
    
    // Hapus Cookies
    document.cookie = "bksda_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "bksda_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Beritahu semua komponen bahwa data terhapus!
    listeners.forEach((l) => l());
  }
};
