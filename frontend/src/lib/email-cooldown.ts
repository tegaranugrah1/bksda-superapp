"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "bksda_email_cooldown_until";
const COOLDOWN_EVENT = "bksda_email_cooldown_event";

/**
 * Returns remaining cooldown seconds from localStorage.
 */
export function getEmailCooldownRemaining(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    if (isNaN(until)) return 0;
    const diff = Math.ceil((until - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

/**
 * Persists cooldown timestamp and notifies all components across tabs/pages.
 */
export function setEmailCooldown(seconds: number = 60): void {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + Math.max(0, seconds) * 1000;
    localStorage.setItem(STORAGE_KEY, until.toString());
    window.dispatchEvent(new CustomEvent(COOLDOWN_EVENT, { detail: seconds }));
  } catch {
    // ignore storage error
  }
}

/**
 * React hook to synchronize cooldown state across components and tabs in real-time.
 */
export function useEmailCooldown(initialServerSeconds: number = 0) {
  const [cooldown, setCooldown] = useState<number>(() => {
    const local = getEmailCooldownRemaining();
    return Math.max(local, initialServerSeconds);
  });

  // Sync if server returns remaining seconds from /me/dashboard
  useEffect(() => {
    if (initialServerSeconds > 0) {
      setEmailCooldown(initialServerSeconds);
      setCooldown((prev) => Math.max(prev, initialServerSeconds));
    }
  }, [initialServerSeconds]);

  // Listen to custom event or storage changes from other components/tabs
  useEffect(() => {
    const handleUpdate = () => {
      setCooldown(getEmailCooldownRemaining());
    };

    window.addEventListener(COOLDOWN_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(COOLDOWN_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // 1-second interval tick when cooldown > 0
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      const remaining = getEmailCooldownRemaining();
      setCooldown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown > 0]);

  return {
    cooldown,
    startCooldown: setEmailCooldown,
  };
}
