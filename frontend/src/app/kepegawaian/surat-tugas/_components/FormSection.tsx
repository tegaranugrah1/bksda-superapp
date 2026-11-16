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
          <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
            {title}
          </label>
          {action}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-zinc-800">
        <label className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
          {title}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
