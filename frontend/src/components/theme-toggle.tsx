"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // State mounted mencegah error hydration antara server (SSG/SSR) dan browser
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Jika komponen belum di-mount di browser, jangan render icon apa-apa (blank button)
  // Ini adalah trik Best Practice untuk next-themes.
  if (!mounted) {
    return (
      <button className="relative inline-flex items-center justify-center p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 opacity-50 cursor-wait">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative inline-flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-emerald-500/50 transition-all duration-300 shadow-sm"
      aria-label="Toggle theme"
      title="Ubah Mode Gelap/Terang"
    >
      {/* 
        Matahari: Skala 100% di light mode, Mengecil jadi 0 dan berputar -90 derajat di dark mode 
      */}
      <Sun className="h-5 w-5 transition-all duration-500 ease-in-out scale-100 rotate-0 dark:scale-0 dark:-rotate-90 text-amber-500 dark:text-zinc-400" />
      
      {/* 
        Bulan: Bersembunyi (skala 0) dan terputar 90 derajat di light mode, muncul perlahan di dark mode 
      */}
      <Moon className="absolute h-5 w-5 transition-all duration-500 ease-in-out scale-0 rotate-90 dark:scale-100 dark:rotate-0 text-zinc-400 dark:text-emerald-400" />
    </button>
  );
}
