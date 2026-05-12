import { cn } from "@/lib/utils";

export function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" || value === 0 ? "-" : String(value);
  return (
    <div className="flex">
      <div className="w-2/5 px-5 py-2.5 text-xs font-medium text-slate-500 bg-slate-50/30">{label}</div>
      <div className="w-3/5 px-5 py-2.5 text-sm text-slate-800">{display}</div>
    </div>
  );
}

export function CurrencyRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  return (
    <div className="flex">
      <div className="w-2/5 px-5 py-2.5 text-xs font-medium text-slate-500 bg-slate-50/30">{label}</div>
      <div className="w-3/5 px-5 py-2.5 text-sm font-semibold text-slate-800">{display}</div>
    </div>
  );
}

export function AreaRow({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value || 0;
  const display = num === 0 ? "-" : `${num.toLocaleString("id-ID")} m²`;
  return (
    <div className="flex">
      <div className="w-2/5 px-5 py-2.5 text-xs font-medium text-slate-500 bg-slate-50/30">{label}</div>
      <div className="w-3/5 px-5 py-2.5 text-sm text-slate-800">{display}</div>
    </div>
  );
}

export function BadgeRow({ label, value, variant }: { label: string; value: string | null | undefined; variant?: "success" | "warning" | "danger" | "info" }) {
  const display = value || "-";
  const colors = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };
  const color = variant ? colors[variant] : "bg-slate-100 text-slate-700";
  return (
    <div className="flex">
      <div className="w-2/5 px-5 py-2.5 text-xs font-medium text-slate-500 bg-slate-50/30">{label}</div>
      <div className="w-3/5 px-5 py-2.5">
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold", color)}>{display}</span>
      </div>
    </div>
  );
}
