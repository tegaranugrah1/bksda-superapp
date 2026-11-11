"use client";

import { useSyncExternalStore } from "react";

export type AssetView = "table" | "grid";
const mediaQuery = "(max-width: 767px)";
const changeEvent = "bmn-assets-view-change";
const fallback: Record<string, AssetView | undefined> = {};

function bucket() {
  return window.matchMedia(mediaQuery).matches ? "mobile" : "desktop";
}

function snapshot() {
  const screen = bucket();
  let saved: string | null | undefined;
  try { saved = window.localStorage.getItem(`bmn-assets-view-${screen}`); } catch {}
  const preferred = saved === "grid" || saved === "table" ? saved : fallback[screen];
  return preferred || (screen === "mobile" ? "grid" : "table");
}

function subscribe(notify: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", notify);
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}

function setView(view: AssetView) {
  const screen = bucket();
  fallback[screen] = view;
  try { window.localStorage.setItem(`bmn-assets-view-${screen}`, view); } catch {}
  window.dispatchEvent(new Event(changeEvent));
}

const serverSnapshot = () => null;

export function useAssetView() {
  const view = useSyncExternalStore<AssetView | null>(subscribe, snapshot, serverSnapshot);
  return [view, setView] as const;
}
