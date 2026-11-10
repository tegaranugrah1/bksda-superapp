"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Handshake, Loader2, Package, Wrench } from "lucide-react";

export function ExportReportsTab() {
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  const executeDownload = async (endpoint: string, filename: string, setLoading: (s: boolean) => void) => {
    setLoading(true);
    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(`${filename} berhasil diunduh.`);
    } catch {
      toast.error("Gagal mengunduh laporan.");
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      title: "Katalog Aset BMN",
      desc: "Rekapitulasi seluruh aset beserta nilai perolehan.",
      icon: <Package className="w-6 h-6" />,
      loading: loadingAsset,
      buttonLabel: "Unduh Excel",
      buttonIcon: Download,
      action: () => executeDownload("/bmn/assets/export", "Katalog_Aset_BMN.xlsx", setLoadingAsset),
    },
    {
      title: "Riwayat Peminjaman",
      desc: "Catatan historis serah-terima aset kepada pegawai.",
      icon: <Handshake className="w-6 h-6" />,
      loading: loadingLoan,
      buttonLabel: "Unduh Excel",
      buttonIcon: Download,
      action: () => executeDownload("/bmn/loans/export", "Peminjaman_BMN.xlsx", setLoadingLoan),
    },
    {
      title: "Biaya Pemeliharaan",
      desc: "Rekap pengeluaran dana untuk servis dan perbaikan.",
      icon: <Wrench className="w-6 h-6" />,
      loading: loadingMaintenance,
      buttonLabel: "Unduh Excel",
      buttonIcon: Download,
      action: () => executeDownload("/bmn/maintenances/export", "Pemeliharaan_BMN.xlsx", setLoadingMaintenance),
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {reports.map((report) => {
        const ButtonIcon = report.buttonIcon;
        return (
          <div
            key={report.title}
            className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center mb-4">
              {report.icon}
            </div>
            <h3 className="text-base font-bold text-[var(--ds-fg)] mb-1">{report.title}</h3>
            <p className="text-xs text-[var(--ds-fg-muted)] mb-6 flex-1">{report.desc}</p>
            <Button
              aria-label={`${report.buttonLabel} ${report.title}`}
              onClick={report.action}
              disabled={report.loading}
              className="bmn-primary w-full rounded-xl font-semibold"
            >
              {report.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ButtonIcon className="w-4 h-4 mr-2" />}
              {report.buttonLabel}
            </Button>
          </div>
        );
      })}
    </section>
  );
}
