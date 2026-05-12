import { cn } from "@/lib/utils";

export function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-200/60 hover:shadow-md transition-shadow">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">{icon}</span>
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" || value === 0 ? "-" : String(value);
  const isEmpty = display === "-";
  return (
    <div className="flex hover:bg-slate-50/50 transition-colors">
      <div className="w-2/5 px-5 py-2.5 text-[11px] font-semibold text-slate-500">{label}</div>
      <div className={cn("w-3/5 px-5 py-2.5 text-sm", isEmpty ? "text-slate-300" : "text-slate-800 font-medium")}>{display}</div>
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
