"use client";

import { useRef } from "react";

/** Also resolves menu items to the trigger that remains mounted after the menu closes. */
export function useDialogFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement as HTMLElement | null;
      const menu = active?.closest('[data-slot="dropdown-menu-content"]');
      const triggerId = menu?.getAttribute("aria-labelledby");
      opener.current = (triggerId ? document.getElementById(triggerId) : null) || active;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      opener.current?.focus();
    },
  };
}
