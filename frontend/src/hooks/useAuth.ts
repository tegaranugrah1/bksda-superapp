"use client";

import { useState, useEffect } from "react";
import { authStore } from "@/lib/auth-store";

export function useAuth() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Fungsi untuk menyinkronkan data dari localStorage secara aman
    const syncUser = () => {
      const userStr = localStorage.getItem("bksda_user");
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    // Sinkronisasi setelah mount dengan setTimeout untuk membongkar event loop 
    // agar terbebas dari bug Next.js startTransition popstate batching!
    setTimeout(syncUser, 0);

    // Berlangganan ke perubahan authStore (saat login/logout dari tab/komponen yang sama)
    // Gunakan setTimeout 0 untuk membongkar antrean event loop dari Next.js popstate batch
    const unsubscribe = authStore.subscribe(() => {
      setTimeout(syncUser, 0);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isAuthenticated,
    login: authStore.login,
    logout: authStore.logout,
  };
}
