"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 hover:shadow-md transition-shadow overflow-visible">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2.5 rounded-t-2xl">
        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">{icon}</span>
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

export function DetailRow({ label, value, badge }: { label: string; value: string | number | null | undefined; badge?: React.ReactNode }) {
  const display = value === null || value === undefined || value === "" || value === 0 ? "-" : String(value);
  const isEmpty = display === "-";
  return (
    <div className="flex hover:bg-slate-50/50 transition-colors">
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm flex items-center gap-2", isEmpty ? "text-slate-300" : "text-slate-800 font-medium")}>
        {display}
        {badge}
      </div>
    </div>
  );
}

export function EditableRow({ label, value, field, onSave, type = "text", badge }: {
  label: string;
  value: string | number | null | undefined;
  field: string;
  onSave: (field: string, value: string) => Promise<void>;
  type?: "text" | "number" | "date" | "select";
  badge?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = value === null || value === undefined || value === "" || value === 0 ? "-" : String(value);
  const isEmpty = display === "-";

  const startEdit = () => {
    setEditValue(isEmpty ? "" : display);
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(field, editValue);
      setEditing(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex hover:bg-slate-50/50 transition-colors">
        <div className="w-2/5 px-5 py-2 text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="w-3/5 px-5 py-1.5 flex items-center gap-1.5">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-8 px-2.5 rounded-lg border border-emerald-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={startEdit}>
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm flex items-center gap-2", isEmpty ? "text-slate-300" : "text-slate-800 font-medium")}>
        {display}
        {badge}
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function CurrencyRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  const isEmpty = num === 0;
  return (
    <div className="flex hover:bg-slate-50/50 transition-colors">
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm font-bold", isEmpty ? "text-slate-300" : "text-slate-900")}>{display}</div>
    </div>
  );
}

export function EditableCurrencyRow({ label, value, field, onSave }: {
  label: string; value: number | null | undefined; field: string;
  onSave: (field: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const num = value || 0;
  const display = num === 0 ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  const isEmpty = num === 0;

  const formatRibuan = (val: string) => {
    const raw = val.replace(/\D/g, "");
    return raw ? Number(raw).toLocaleString("id-ID") : "";
  };

  const startEdit = () => {
    setEditValue(num === 0 ? "" : num.toLocaleString("id-ID"));
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rawValue = editValue.replace(/\./g, "").replace(/,/g, "");
      await onSave(field, rawValue);
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex hover:bg-slate-50/50 transition-colors">
        <div className="w-2/5 px-5 py-2 text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="w-3/5 px-5 py-1.5 flex items-center gap-1.5">
          <div className="flex-1 flex items-center h-8 px-2.5 rounded-lg border border-emerald-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
            <span className="text-xs text-slate-400 mr-1">Rp</span>
            <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(formatRibuan(e.target.value))} onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-transparent outline-none" />
          </div>
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={startEdit}>
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm font-bold flex items-center gap-2", isEmpty ? "text-slate-300" : "text-slate-900")}>
        {display}
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function EditableSelectRow({ label, value, field, onSave, options }: {
  label: string;
  value: string | null | undefined;
  field: string;
  onSave: (field: string, value: string) => Promise<void>;
  options: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const display = value || "-";
  const isEmpty = display === "-";

  const startEdit = () => {
    setEditValue(value || "");
    setEditing(true);
  };

  const handleSave = async (val: string) => {
    setSaving(true);
    try {
      await onSave(field, val);
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex hover:bg-slate-50/50 transition-colors">
        <div className="w-2/5 px-5 py-2 text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="w-3/5 px-5 py-1.5 flex items-center gap-1.5">
          <select
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); handleSave(e.target.value); }}
            className="flex-1 h-8 px-2.5 rounded-lg border border-emerald-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Pilih...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
          <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={startEdit}>
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm flex items-center gap-2", isEmpty ? "text-slate-300" : "text-slate-800 font-medium")}>
        {display}
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function EditableEmployeeRow({ label, value, field, onSave, employees }: {
  label: string;
  value: string | null | undefined;
  field: string;
  onSave: (field: string, value: string) => Promise<void>;
  employees: { id: string; nama_lengkap?: string; name?: string; nip?: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = value || "-";
  const isEmpty = display === "-";

  const startEdit = () => {
    setSearch("");
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSelect = async (name: string) => {
    setSaving(true);
    try {
      await onSave(field, name);
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(field, "");
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const filtered = employees.filter(e => {
    const name = (e.nama_lengkap || e.name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  }).slice(0, 8);

  if (editing) {
    return (
      <div className="flex hover:bg-slate-50/50 transition-colors">
        <div className="w-2/5 px-5 py-2 text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="w-3/5 px-5 py-1.5">
          <div className="flex items-center gap-1.5">
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pegawai..."
              className="flex-1 h-8 px-2.5 rounded-lg border border-emerald-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
            <button onClick={handleClear} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-slate-100">
              ✕ Kosongkan
            </button>
            {filtered.map(emp => (
              <button key={emp.id} onClick={() => handleSelect(emp.nama_lengkap || emp.name || "")} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <span className="font-medium">{emp.nama_lengkap || emp.name}</span>
                {emp.nip && <span className="text-slate-400 ml-2">{emp.nip}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={startEdit}>
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm flex items-center gap-2", isEmpty ? "text-slate-300" : "text-slate-800 font-medium")}>
        {display}
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function AreaRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : `${num.toLocaleString("id-ID")} m²`;
  const isEmpty = num === 0;
  return (
    <div className="flex hover:bg-slate-50/50 transition-colors">
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm", isEmpty ? "text-slate-300" : "text-slate-800")}>{display}</div>
    </div>
  );
}

export function BadgeRow({ label, value, variant }: { label: string; value: string | null | undefined; variant?: "success" | "warning" | "danger" | "info" }) {
  const display = value || "-";
  if (display === "-") {
    return (
      <div className="flex hover:bg-slate-50/50 transition-colors">
        <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="w-3/5 px-5 py-2.5 text-sm text-slate-300">-</div>
      </div>
    );
  }
  const colors = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200/50",
    info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/50",
  };
  const color = variant ? colors[variant] : "bg-slate-100 text-slate-700";
  return (
    <div className="flex hover:bg-slate-50/50 transition-colors">
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="w-3/5 px-5 py-2.5">
        <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold", color)}>{display}</span>
      </div>
    </div>
  );
}
