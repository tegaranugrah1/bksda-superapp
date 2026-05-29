/**
 * Helpers untuk styling dan label status Surat Tugas di Inbox.
 */

export function getStatusStyle(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-50 dark:bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-500/20";
    case "pending":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";
    case "approved":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
    case "completed":
      return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20";
    case "rejected":
      return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20";
    default:
      return "bg-slate-50 dark:bg-slate-500/10 text-slate-500 border-slate-100 dark:border-slate-500/20";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Menunggu Persetujuan";
    case "approved":
      return "Diterbitkan";
    case "completed":
      return "Selesai";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}
