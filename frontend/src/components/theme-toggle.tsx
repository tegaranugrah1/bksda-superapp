"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggler, type Resolved, type ThemeSelection } from "@/components/ui/theme-toggler";

interface ThemeToggleProps {
  className?: string;
  size?: "default" | "sm";
}

export function ThemeToggle({ className, size = "default" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`relative inline-flex items-center justify-center ${
          size === "sm" ? "p-1.5 rounded-lg" : "p-2.5 rounded-xl"
        } bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 opacity-50`}
      >
        <div className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </div>
    );
  }

  return (
    <ThemeToggler
      theme={(theme ?? "system") as ThemeSelection}
      resolvedTheme={(resolvedTheme ?? "light") as Resolved}
      setTheme={setTheme}
      direction="radial"
    >
      {({ resolved, toggleTheme }) => {
        const isDark = resolved === "dark";
        const nextTheme = isDark ? "light" : "dark";

        return (
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.12 }}
            type="button"
            onClick={(e) => toggleTheme(nextTheme, e)}
            className={`group relative inline-flex items-center justify-center ${
              size === "sm" ? "p-1.5 rounded-lg" : "p-2.5 rounded-xl"
            } bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors shadow-2xs cursor-pointer overflow-hidden ${
              className || ""
            }`}
            aria-label={isDark ? "Beralih ke mode siang (terang)" : "Beralih ke mode malam (gelap)"}
            title={isDark ? "Beralih ke Mode Siang" : "Beralih ke Mode Malam"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: -60, scale: 0.7, filter: "blur(2px)" }}
                  animate={{ opacity: 1, rotate: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, rotate: 60, scale: 0.7, filter: "blur(2px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex items-center justify-center text-emerald-400"
                >
                  <Moon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: 60, scale: 0.7, filter: "blur(2px)" }}
                  animate={{ opacity: 1, rotate: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, rotate: -60, scale: 0.7, filter: "blur(2px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex items-center justify-center text-amber-500"
                >
                  <Sun className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      }}
    </ThemeToggler>
  );
}
