"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Calendar, MapPin, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";

interface AssignmentLetter {
  id: string;
  nomor_surat: string;
  maksud_tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tempat_tujuan: string;
  status: string;
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
  const { data, isLoading } = useQuery({
    queryKey: ["employee-assignments", employeeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/kepegawaian/employees/${employeeId}/assignment-letters`);
      return data;
    },
  });

  if (isLoading) {
    return <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />)}
    </div>;
  }

  const assignments = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Riwayat Penugasan</h3>
        {canWrite && (
          <Link href={`/surat-tugas/create?employee_id=${employeeId}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Buat Surat Tugas
              </Button>
          </Link>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <FileText className="w-12 h-12 opacity-10 mb-2" />
          <p className="text-sm">Belum ada riwayat penugasan.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {assignments.map((st) => (
            <div key={st.id} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {st.nomor_surat}
                  </p>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {st.maksud_tujuan}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {st.tanggal_mulai ? format(new Date(st.tanggal_mulai), "dd MMM yyyy", { locale: id }) : '-'} - {st.tanggal_selesai ? format(new Date(st.tanggal_selesai), "dd MMM yyyy", { locale: id }) : '-'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {st.tempat_tujuan || '-'}
                    </span>
                  </div>
                </div>
                <Link href={`/surat-tugas/${st.id}`}>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-blue-500">
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
