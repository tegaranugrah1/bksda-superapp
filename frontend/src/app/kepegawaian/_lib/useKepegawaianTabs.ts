"use client";

import { useId, type KeyboardEvent } from "react";

export function useKepegawaianTabs(activeValue: string, label: string) {
  const id = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const directions = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!directions.includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    const current = tabs.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
    tabs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return {
    indicatorId: id,
    tabListProps: { role: "tablist", "aria-label": label, onKeyDown },
    tabProps: (value: string) => ({
      role: "tab",
      id: `${id}-${value}`,
      "aria-controls": `${id}-panel`,
      "aria-selected": value === activeValue,
      tabIndex: value === activeValue ? 0 : -1,
    }),
    panelProps: { role: "tabpanel" as const, id: `${id}-panel`, "aria-labelledby": `${id}-${activeValue}` },
  };
}
