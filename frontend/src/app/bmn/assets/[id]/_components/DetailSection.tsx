"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--ds-surface)] rounded-2xl shadow-xs border border-[var(--ds-border-subtle)] overflow-visible">
      <div className="px-3 sm:px-5 py-3.5 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] flex items-center gap-2.5 rounded-t-2xl">
        <span className="p-1.5 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">{icon}</span>
        <h3 className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-[var(--ds-border-subtle)]">{children}</div>
    </div>
  );
}

export function DetailRow({ label, value, badge }: { label: string; value: string | number | null | undefined; badge?: React.ReactNode }) {
  const display = value === null || value === undefined || value === "" || value === 0 ? "-" : String(value);
  const isEmpty = display === "-";
  return (
    <div className="flex hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className={cn("w-3/5 min-w-0 break-words px-3 sm:px-5 py-2.5 text-xs flex items-center gap-2", isEmpty ? "text-[var(--ds-fg-muted)]" : "text-[var(--ds-fg)] font-medium")}>
        {display}
        {badge}
      </div>
    </div>
  );
}

export function FormInputRow({
  label,
  value,
  onChange,
  isEditMode,
  type = "text",
  badge,
  placeholder,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  isEditMode: boolean;
  type?: "text" | "number" | "date";
  badge?: React.ReactNode;
  placeholder?: string;
}) {
  if (!isEditMode) {
    return <DetailRow label={label} value={value} badge={badge} />;
  }
  return (
    <div className="flex items-center hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className="w-3/5 min-w-0 break-words px-3 sm:px-5 py-1.5 flex items-center gap-2">
        <input
          aria-label={label}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Isi ${label}...`}
          className="w-full h-8 px-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs text-[var(--ds-fg)] outline-none"
        />
        {badge}
      </div>
    </div>
  );
}

export function FormSelectRow({
  label,
  value,
  onChange,
  isEditMode,
  options,
  placeholder = "Pilih...",
  badge,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  isEditMode: boolean;
  options: string[];
  placeholder?: string;
  badge?: React.ReactNode;
}) {
  if (!isEditMode) {
    return <DetailRow label={label} value={value} badge={badge} />;
  }
  return (
    <div className="flex items-center hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className="w-3/5 min-w-0 break-words px-3 sm:px-5 py-1.5 flex items-center gap-2">
        <select
          aria-label={label}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs text-[var(--ds-fg)] outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {badge}
      </div>
    </div>
  );
}

export function FormCurrencyRow({
  label,
  value,
  onChange,
  isEditMode,
}: {
  label: string;
  value: number | string | null | undefined;
  onChange: (value: string) => void;
  isEditMode: boolean;
}) {
  if (!isEditMode) {
    const num = Number(value) || 0;
    return <CurrencyRow label={label} value={num} />;
  }
  return (
    <div className="flex items-center hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className="w-3/5 min-w-0 break-words px-3 sm:px-5 py-1.5">
        <div className="flex items-center h-8 px-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] bmn-currency-field">
          <span className="text-xs text-[var(--ds-fg-muted)] mr-1.5 font-medium">Rp</span>
          <input
            aria-label={label}
            type="text"
            value={value ? Number(String(value).replace(/\D/g, "")).toLocaleString("id-ID") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              onChange(raw);
            }}
            placeholder="0"
            className="w-full text-xs bg-transparent outline-none text-[var(--ds-fg)] font-medium"
          />
        </div>
      </div>
    </div>
  );
}

export function FormEmployeeRow({
  label,
  value,
  onChange,
  isEditMode,
  employees,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  isEditMode: boolean;
  employees: Array<{ id: string | number; nama_lengkap?: string; name?: string; nip?: string }>;
}) {
  if (!isEditMode) {
    return <DetailRow label={label} value={value} />;
  }
  const datalistId = `emp-list-${label.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return (
    <div className="flex items-center hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className="w-3/5 min-w-0 break-words px-3 sm:px-5 py-1.5">
        <input
          aria-label={label}
          list={datalistId}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pilih atau ketik nama pegawai..."
          className="w-full h-8 px-2.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs text-[var(--ds-fg)] outline-none"
        />
        <datalist id={datalistId}>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.nama_lengkap || emp.name || ""}>
              {emp.nip ? `NIP: ${emp.nip}` : ""}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
}

export function CurrencyRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  const isEmpty = num === 0;
  return (
    <div className="flex hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className={cn("w-3/5 min-w-0 break-words px-3 sm:px-5 py-2.5 text-xs font-bold", isEmpty ? "text-[var(--ds-fg-muted)]" : "text-[var(--ds-fg)]")}>{display}</div>
    </div>
  );
}

export function AreaRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : `${num.toLocaleString("id-ID")} m²`;
  const isEmpty = num === 0;
  return (
    <div className="flex hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
      <div className="w-2/5 px-3 sm:px-5 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)]">{label}</div>
      <div className={cn("w-3/5 min-w-0 break-words px-3 sm:px-5 py-2.5 text-xs", isEmpty ? "text-[var(--ds-fg-muted)]" : "text-[var(--ds-fg)] font-medium")}>{display}</div>
    </div>
  );
}
