"use client";

import Image from "next/image";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, FileText, Shield, MapPin, Briefcase, Users } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentLetterHistory } from "../../_components/AssignmentLetterHistory";
import { EmployeeAccessSheet } from "../../_components/EmployeeAccessSheet";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  jabatan: string | null;
  pangkat_golongan: string | null;
  satuan_kerja: string | null;
  is_active: boolean;
  foto_url: string | null;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Employee }>(`/kepegawaian/employees/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return <div className="max-w-5xl mx-auto py-10 space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
    </div>;
  }

  if (isError || !employee) {
    return <div className="max-w-5xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold">Pegawai tidak ditemukan</h2>
        <Button variant="link" onClick={() => router.push("/kepegawaian")}>Kembali ke daftar</Button>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link
                href="/kepegawaian"
                className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-emerald-600 transition-all shadow-sm"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                        <Users className="w-4 h-4" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Detail Kepegawaian</h2>
                </div>
                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{employee.nama_lengkap}</h1>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                className="rounded-2xl border-zinc-200 dark:border-zinc-800 gap-2 h-11 px-6 shadow-sm"
                onClick={() => setAccessSheetOpen(true)}
            >
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm">Kelola Akses</span>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Profile Card */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
                <div className="relative aspect-3/4 w-full max-w-[220px] mx-auto rounded-3xl overflow-hidden border-8 border-zinc-50 dark:border-zinc-800 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                    {employee.foto_url ? (
                        <Image src={employee.foto_url} alt={employee.nama_lengkap} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <User className="w-16 h-16 text-zinc-300" />
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{employee.nama_lengkap}</h2>
                    <p className="text-sm font-mono text-zinc-500 mt-2 bg-zinc-50 dark:bg-zinc-800/50 py-1.5 rounded-full inline-block px-4">{employee.nip}</p>
                </div>
                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    employee.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${employee.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {employee.is_active ? 'Aktif Bertugas' : 'Non-Aktif'}
                </div>
            </div>

            <div className="bg-zinc-900 dark:bg-white rounded-[2.5rem] p-8 text-white dark:text-zinc-900 space-y-6 shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Informasi Jabatan</h3>
                <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5 opacity-70" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black opacity-40 mb-1">Jabatan Sekarang</p>
                            <p className="text-sm font-bold leading-tight">{employee.jabatan || "-"}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 opacity-70" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black opacity-40 mb-1">Satuan Kerja</p>
                            <p className="text-sm font-bold leading-tight">{employee.satuan_kerja || "-"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-8">
            <Tabs defaultValue="history" className="w-full space-y-6">
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl inline-flex shadow-sm">
                    <TabsList className="bg-transparent h-auto p-0 flex gap-1">
                        <TabsTrigger value="history" className="px-6 py-2.5 rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                            <FileText className="w-4 h-4" />
                            Riwayat Penugasan
                        </TabsTrigger>
                        <TabsTrigger value="biodata" className="px-6 py-2.5 rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                            <User className="w-4 h-4" />
                            Biodata Lengkap
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="history" className="mt-0 outline-none">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm min-h-[500px]">
                        <AssignmentLetterHistory employeeId={employee.id} />
                    </div>
                </TabsContent>

                <TabsContent value="biodata" className="mt-0 outline-none">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                        <div>
                            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                                <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                                Identitas Kepegawaian
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                                <InfoItem label="NIP Induk" value={employee.nip} />
                                <InfoItem label="Nama Lengkap" value={employee.nama_lengkap} />
                                <InfoItem label="Pangkat / Golongan" value={employee.pangkat_golongan || "-"} />
                                <InfoItem label="Jabatan" value={employee.jabatan || "-"} />
                                <div className="sm:col-span-2">
                                    <InfoItem label="Unit Kerja / Penempatan" value={employee.satuan_kerja || "-"} />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </div>

      <EmployeeAccessSheet 
        employee={employee}
        open={accessSheetOpen}
        onOpenChange={setAccessSheetOpen}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="group">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">{label}</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 group-hover:border-emerald-500/20 transition-all">{value}</p>
        </div>
    )
}
