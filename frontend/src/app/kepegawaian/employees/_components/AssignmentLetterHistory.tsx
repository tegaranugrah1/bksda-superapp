"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Calendar, MapPin, Eye, Plus } from "lucide-react";
import { formatDateIndonesian } from "@/lib/letter-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import SuratTugasLetterPreview from "@/components/SuratTugasLetterPreview";

interface AssignmentLetter {
  id: string;
  nomor_surat: string;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan: string;
  status: string;
}

interface PreviewEmployee {
  id: string | number;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan?: string;
  pivot?: { peran?: string };
}

interface PreviewItem {
  id?: string;
  text: string;
}

interface AssignmentLetterPreviewData {
  id: string;
  nomor_surat?: string | null;
  kode_surat?: string | null;
  menimbang?: PreviewItem[] | string | null;
  dasar?: PreviewItem[] | string | null;
  maksud_tujuan: string;
  tempat_tujuan?: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tanggal_surat?: string | null;
  sumber_dana?: string | null;
  status: string;
  keterangan?: string | null;
  tembusan?: string[] | null;
  nama_plh?: string | null;
  employees?: PreviewEmployee[];
  approver?: { name: string; nip?: string };
}

interface Meta {
  current_page: number;
  last_page: number;
  total: number;
}

interface ApiResponse {
  data: AssignmentLetter[];
  meta: Meta;
}

export function AssignmentLetterHistory({ employeeId }: { employeeId: string }) {
  const { canWrite } = useRole();
  const [previewData, setPreviewData] = useState<AssignmentLetterPreviewData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-assignments", employeeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/kepegawaian/employees/${employeeId}/assignment-letters`);
      return data;
    },
  });

  const handleView = async (stId: string) => {
    try {
      const resp = await api.get(`/surat-tugas/${stId}`);
      setPreviewData((resp.data.data || resp.data) as AssignmentLetterPreviewData);
    } catch {
      toast.error("Gagal memuat detail surat tugas.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[var(--ds-surface-muted)] animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const assignments = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--ds-fg)]">Riwayat Penugasan</h3>
        {canWrite && (
          <Link href={`/surat-tugas?employee_id=${employeeId}`}>
            <Button size="sm" className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] gap-2">
              <Plus className="w-4 h-4" />
              Buat Surat Tugas
            </Button>
          </Link>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--ds-fg-muted)] border-2 border-dashed border-[var(--ds-border-subtle)] rounded-2xl">
          <FileText className="w-12 h-12 opacity-10 mb-2" />
          <p className="text-sm">Belum ada riwayat penugasan.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {assignments.map((st) => (
            <div
              key={st.id}
              className="group p-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl hover:border-[var(--ds-accent-soft-border)] transition-colors shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-[var(--ds-accent-fg)]">
                    {st.nomor_surat}
                  </p>
                  <h4 className="font-semibold text-[var(--ds-fg)] line-clamp-1">
                    {st.maksud_tujuan}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ds-fg-muted)]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {st.tanggal_mulai ? formatDateIndonesian(st.tanggal_mulai) : "-"} -{" "}
                      {st.tanggal_selesai ? formatDateIndonesian(st.tanggal_selesai) : "-"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {st.tempat_tujuan || "-"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)]"
                  onClick={() => handleView(st.id)} aria-label="Lihat detail"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Letter Preview */}
      {previewData && (
        <SuratTugasLetterPreview
          data={previewData}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
