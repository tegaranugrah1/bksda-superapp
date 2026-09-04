"use client";

import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { formatDateToIndo, parseIndoDateToIso } from "./visum-shared";

export function IndoDatePicker({
  value,
  onChange,
  placeholder,
  className,
}: {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const isoVal = parseIndoDateToIso(value || "");

  const handleIsoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      onChange(formatDateToIndo(iso));
    }
  };

  const handleCalendarClick = () => {
    if (hiddenInputRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          hiddenInputRef.current.showPicker();
        } else {
          hiddenInputRef.current.focus();
        }
      } catch {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className || ""} pr-9`}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        title="Pilih tanggal dari kalender"
        className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={hiddenInputRef}
        type="date"
        value={isoVal}
        onChange={handleIsoChange}
        className="sr-only pointer-events-none absolute right-0 bottom-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  );
}
