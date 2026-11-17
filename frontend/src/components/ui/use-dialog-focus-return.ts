"use client";

import { useRef } from "react";

interface FocusableTarget {
  focus?: (options?: FocusOptions & { focusVisible?: boolean }) => void;
  blur?: () => void;
  closest?: (selector: string) => Element | null;
  getAttribute?: (name: string) => string | null;
  isConnected?: boolean;
  matches?: (selector: string) => boolean;
}

let modalityBound = false;
let lastInteractionWasKeyboard = false;
let pendingDropdownOpener: FocusableTarget | null = null;

function ensureModalityTracker() {
  if (modalityBound || typeof document === "undefined" || typeof document.addEventListener !== "function") {
    return;
  }
  modalityBound = true;
  const markPointer = () => {
    lastInteractionWasKeyboard = false;
    pendingDropdownOpener = null;
  };
  const markKeyboard = (event: KeyboardEvent) => {
    if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta") {
      lastInteractionWasKeyboard = true;
      if (event.key !== "Enter" && event.key !== " ") {
        pendingDropdownOpener = null;
      }
    }
  };
  document.addEventListener("pointerdown", markPointer, true);
  document.addEventListener("mousedown", markPointer, true);
  document.addEventListener("touchstart", markPointer, true);
  document.addEventListener("keydown", markKeyboard, true);
}

export function hadKeyboardFocusIntent(): boolean {
  ensureModalityTracker();
  return lastInteractionWasKeyboard;
}

export function rememberDropdownOpener(element: FocusableTarget | null) {
  pendingDropdownOpener = element;
}

export function resolveDialogOpener(): HTMLElement | null {
  ensureModalityTracker();
  if (pendingDropdownOpener && pendingDropdownOpener.isConnected !== false) {
    return pendingDropdownOpener as HTMLElement;
  }
  if (typeof document === "undefined") return null;
  const active = document.activeElement as FocusableTarget | null;
  const menuFromActive = active?.closest?.('[data-slot="dropdown-menu-content"]') ?? null;
  const menu =
    menuFromActive ??
    (typeof document.querySelector === "function"
      ? document.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')
      : null);
  const triggerId = menu?.getAttribute?.("aria-labelledby");
  return ((triggerId ? document.getElementById?.(triggerId) : null) || active) as HTMLElement | null;
}

export function focusElementRespectingModality(element: FocusableTarget | null | undefined, preventScroll = true) {
  ensureModalityTracker();
  if (!element || typeof element.focus !== "function") return;
  if (!lastInteractionWasKeyboard) {
    if (typeof document !== "undefined" && document.activeElement === (element as unknown as Element)) {
      element.blur?.();
    }
    element.focus({ preventScroll, focusVisible: false });
    return;
  }
  element.focus({ preventScroll });
}

export function clearStuckPointerFocusVisible() {
  ensureModalityTracker();
  if (lastInteractionWasKeyboard || typeof document === "undefined" || typeof queueMicrotask !== "function") return;
  queueMicrotask(() => {
    if (lastInteractionWasKeyboard) return;
    const active = document.activeElement as FocusableTarget | null;
    if (
      active &&
      active !== (document.body as unknown as FocusableTarget) &&
      typeof active.matches === "function" &&
      active.matches("button, a[href], [role='button'], [role='menuitem'], [role='tab'], [data-slot='select-trigger']") &&
      active.matches(":focus-visible")
    ) {
      active.blur?.();
      active.focus?.({ preventScroll: true, focusVisible: false });
    }
  });
}

/** Also resolves menu items to the trigger that remains mounted after the menu closes. */
export function useDialogFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      opener.current = resolveDialogOpener();
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      focusElementRespectingModality(opener.current, true);
    },
  };
}
