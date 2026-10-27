import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  nested?: boolean;
}

/**
 * Clean Enterprise Pro Max section wrapper untuk sidebar ST Builder.
 */
export function FormSection({ title, children, action, nested = false }: FormSectionProps) {
  if (nested) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
            {title}
          </label>
          {action}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          {title}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
