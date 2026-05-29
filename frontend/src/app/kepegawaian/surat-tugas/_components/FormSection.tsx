import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/**
 * Section wrapper untuk sidebar ST Builder/Create.
 * Header dengan label + optional action button (mis. tombol "Tambah").
 */
export function FormSection({ title, children, action }: FormSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          {title}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
