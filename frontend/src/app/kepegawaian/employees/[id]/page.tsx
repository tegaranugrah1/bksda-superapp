"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, FileText, Shield, Briefcase, Building2, BadgeCheck, Hash } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { AssignmentLetterHistory } from "../../_components/AssignmentLetterHistory";
import { EmployeeAccessSheet } from "../../_components/EmployeeAccessSheet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  jabatan: string | null;
  pangkat_golongan: string | null;
  satuan_kerja: string | null;
  is_active: boolean;
  foto_url: string | null;
  resor: string | null;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "biodata">("history");
  const { canManageAccess } = useRole();

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Employee }>(`/kepegawaian/employees/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="p-6 md:p-10 py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-700">Pegawai tidak ditemukan</h2>
        <Button variant="link" onClick={() => router.push("/kepegawaian")}>Kembali ke daftar</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link href="/kepegawaian" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        {canManageAccess && (
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setAccessSheetOpen(true)}>
            <Shield className="w-4 h-4 text-blue-500" />
            Kelola Akses
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {employee.foto_url ? (
                <Image src={employee.foto_url} alt={employee.nama_lengkap} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-400">{employee.nama_lengkap.charAt(0)}</span>
              )}
            </div>
            {/* Name + Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 truncate">{employee.nama_lengkap}</h1>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                  employee.is_active ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"
                )}>
                  <BadgeCheck className="w-3 h-3" />
                  {employee.is_active ? "Aktif" : "Non-Aktif"}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-mono mt-0.5">{employee.nip}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <InfoCard icon={<Briefcase className="w-4 h-4 text-blue-500" />} label="Jabatan" value={employee.jabatan || "-"} />
            <InfoCard icon={<Building2 className="w-4 h-4 text-violet-500" />} label="Unit Kerja" value={employee.satuan_kerja || "-"} />
            <InfoCard icon={<Hash className="w-4 h-4 text-amber-500" />} label="Pangkat/Gol" value={employee.pangkat_golongan || "-"} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-4">
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "history" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <FileText className="w-4 h-4" /> Riwayat Penugasan
          </button>
          <button
            onClick={() => setActiveTab("biodata")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "biodata" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <User className="w-4 h-4" /> Biodata
          </button>
        </div>

        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <AssignmentLetterHistory employeeId={employee.id} />
          </div>
        )}

        {activeTab === "biodata" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Identitas Kepegawaian</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BioItem label="NIP" value={employee.nip} />
              <BioItem label="Nama Lengkap" value={employee.nama_lengkap} />
              <BioItem label="Jabatan" value={employee.jabatan || "-"} />
              <BioItem label="Pangkat / Golongan" value={employee.pangkat_golongan || "-"} />
              <BioItem label="Unit Kerja" value={employee.satuan_kerja || "-"} />
              <BioItem label="Status" value={employee.is_active ? "Aktif Bertugas" : "Non-Aktif"} />
            </div>
          </div>
        )}
      </div>

      {canManageAccess && (
        <EmployeeAccessSheet employee={employee} open={accessSheetOpen} onOpenChange={setAccessSheetOpen} />
      )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}

function BioItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
