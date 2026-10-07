import { api } from "@/lib/api";
import { toast } from "sonner";

export interface ConfirmAndDeleteOptions {
  confirm: (options: {
    title: string;
    description: string;
    confirmText?: string;
    variant?: "default" | "danger";
  }) => Promise<boolean>;
  endpoint: string;
  id: string;
  number: string;
  documentLabel: string;
  onSuccess?: () => Promise<void> | void;
}

/**
 * Generic confirmation and deletion helper for BMN report documents.
 */
export async function confirmAndDeleteDocument({
  confirm,
  endpoint,
  id,
  number,
  documentLabel,
  onSuccess,
}: ConfirmAndDeleteOptions): Promise<boolean> {
  const ok = await confirm({
    title: `Hapus Riwayat ${documentLabel}?`,
    description: `Riwayat ${number} akan dihapus permanen dari daftar ${documentLabel}.`,
    confirmText: "Ya, Hapus",
    variant: "danger",
  });
  if (!ok) return false;

  try {
    await api.delete(`${endpoint}/${id}`);
    toast.success(`Riwayat ${documentLabel} dihapus.`);
    if (onSuccess) {
      await onSuccess();
    }
    return true;
  } catch {
    toast.error(`Gagal menghapus riwayat ${documentLabel}.`);
    return false;
  }
}
