"use client";

import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, FileText, Shield, Briefcase, Building2, BadgeCheck, Hash, ChevronDown, Pencil, Save, X, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { AssignmentLetterHistory } from "../../_components/AssignmentLetterHistory";
import { EmployeeAccessSheet } from "../../_components/EmployeeAccessSheet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const PANGKAT_OPTIONS = [
  "- (Tidak ada pangkat)",
  "Juru Muda (I/a)", "Juru Muda Tingkat I (I/b)", "Juru (I/c)", "Juru Tingkat I (I/d)",
  "Pengatur Muda (II/a)", "Pengatur Muda Tingkat I (II/b)", "Pengatur (II/c)", "Pengatur Tingkat I (II/d)",
  "Penata Muda (III/a)", "Penata Muda Tingkat I (III/b)", "Penata (III/c)", "Penata Tingkat I (III/d)",
  "Pembina (IV/a)", "Pembina Tingkat I (IV/b)", "Pembina Utama Muda (IV/c)", "Pembina Utama Madya (IV/d)", "Pembina Utama (IV/e)",
  "PPPK Golongan I", "PPPK Golongan II", "PPPK Golongan III", "PPPK Golongan IV",
  "PPPK Golongan V", "PPPK Golongan VI", "PPPK Golongan VII", "PPPK Golongan VIII",
  "PPPK Golongan IX", "PPPK Golongan X", "PPPK Golongan XI", "PPPK Golongan XII",
  "PPPK Golongan XIII", "PPPK Golongan XIV", "PPPK Golongan XV", "PPPK Golongan XVI",
  "PPPK Golongan XVII",
];

const UNIT_KERJA_OPTIONS = [
  "Kantor Balai KSDA Kalimantan Timur",
  "Seksi KSDA Wilayah I Berau",
  "Seksi KSDA Wil I - Resor 01. Berau",
  "Seksi KSDA Wil I - Resor 02. Pulau Semama dan Pulau Sangalaki",
  "Seksi KSDA Wil I - Resor 03. Tanjung Selor",
  "Seksi KSDA Wil I - Resor 04. Tarakan",
  "Seksi KSDA Wilayah II Tenggarong",
  "Seksi KSDA Wil II - Resor 05. Samarinda",
  "Seksi KSDA Wil II - Resor 06. Padang Luway",
  "Seksi KSDA Wil II - Resor 07. Muara Kaman Sedulang",
  "Seksi KSDA Wil II - Resor 08. Sangatta",
  "Seksi KSDA Wil II - Resor 09. Suaka Badak Kelian",
  "Seksi KSDA Wilayah III Balikpapan",
  "Seksi KSDA Wil III - Resor 10. Balikpapan",
  "Seksi KSDA Wil III - Resor 11. Teluk Adang",
  "Seksi KSDA Wil III - Resor 12. Teluk Apar",
  "Seksi KSDA Wil III - Resor 13. Paser",
  "Seksi KSDA Wil III - Resor 14. Ibu Kota Nusantara",
];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "biodata">("history");
  const { canManageAccess, canWrite } = useRole();

  // Biodata edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    satuan_kerja: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Employee }>(`/kepegawaian/employees/${id}`);
      return data.data;
    },
  });

  const startEditing = () => {
    if (!employee) return;
    setEditForm({
      nip: employee.nip || "",
      nama_lengkap: employee.nama_lengkap || "",
      jabatan: employee.jabatan || "",
      pangkat_golongan: employee.pangkat_golongan || "",
      satuan_kerja: employee.satuan_kerja || "",
      is_active: employee.is_active,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editForm.nip || !editForm.nama_lengkap) {
      toast.error("NIP dan Nama Lengkap wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/kepegawaian/employees/${id}`, {
        nip: editForm.nip,
        nama_lengkap: editForm.nama_lengkap,
        jabatan: editForm.jabatan || null,
        pangkat_golongan: editForm.pangkat_golongan || null,
        satuan_kerja: editForm.satuan_kerja || null,
        is_active: editForm.is_active,
      });
      toast.success("Biodata berhasil diperbarui.");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
    } catch {
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      await api.post(`/kepegawaian/employees/${id}/reset-password`);
      toast.success("Password berhasil direset ke '123'.");
      setResetDialogOpen(false);
    } catch {
      toast.error("Gagal mereset password.");
    } finally {
      setResetting(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setResetDialogOpen(true)}>
              <KeyRound className="w-4 h-4 text-amber-500" />
              Reset Password
            </Button>
          )}
          {canManageAccess && (
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setAccessSheetOpen(true)}>
              <Shield className="w-4 h-4 text-blue-500" />
              Kelola Akses
            </Button>
          )}
        </div>
      </div>

      {/* Reset Password Dialog */}
      {resetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
            <p className="text-sm text-slate-600">
              Password untuk <span className="font-semibold">{employee.nama_lengkap}</span> akan direset ke <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">123</code>. Lanjutkan?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setResetDialogOpen(false)} disabled={resetting}>
                Batal
              </Button>
              <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Mereset..." : "Ya, Reset"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
              {employee.foto_url ? (
                <Image src={employee.foto_url} alt={employee.nama_lengkap} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-400">{employee.nama_lengkap.charAt(0)}</span>
              )}
              {canManageAccess && (
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                  <User className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) { alert("Maksimal 10MB"); return; }
                      const fd = new FormData();
                      fd.append("foto", file);
                      try {
                        await api.post(`/kepegawaian/employees/${id}/photo`, fd, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        window.location.reload();
                      } catch { alert("Gagal mengupload foto."); }
                    }}
                  />
                </label>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Identitas Kepegawaian</h3>
              {canWrite && !isEditing && (
                <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={startEditing}>
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={cancelEditing} disabled={saving}>
                    <X className="w-3.5 h-3.5" />
                    Batal
                  </Button>
                  <Button size="sm" className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BioItem label="NIP" value={employee.nip} />
                <BioItem label="Nama Lengkap" value={employee.nama_lengkap} />
                <BioItem label="Jabatan" value={employee.jabatan || "-"} />
                <BioItem label="Pangkat / Golongan" value={employee.pangkat_golongan || "-"} />
                <BioItem label="Unit Kerja" value={employee.satuan_kerja || "-"} />
                <BioItem label="Status" value={employee.is_active ? "Aktif Bertugas" : "Non-Aktif"} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BioField label="NIP">
                  <input
                    type="text"
                    value={editForm.nip}
                    onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold"
                  />
                </BioField>
                <BioField label="Nama Lengkap">
                  <input
                    type="text"
                    value={editForm.nama_lengkap}
                    onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold"
                  />
                </BioField>
                <BioField label="Jabatan">
                  <input
                    type="text"
                    value={editForm.jabatan}
                    onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold"
                  />
                </BioField>
                <BioField label="Pangkat / Golongan">
                  <div className="relative">
                    <select
                      value={editForm.pangkat_golongan}
                      onChange={(e) => setEditForm({ ...editForm, pangkat_golongan: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
                    >
                      <option value="">Pilih Pangkat/Golongan</option>
                      {PANGKAT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </BioField>
                <BioField label="Unit Kerja">
                  <div className="relative">
                    <select
                      value={editForm.satuan_kerja}
                      onChange={(e) => setEditForm({ ...editForm, satuan_kerja: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
                    >
                      <option value="">Pilih Unit Kerja</option>
                      {UNIT_KERJA_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </BioField>
                <BioField label="Status">
                  <div className="relative">
                    <select
                      value={editForm.is_active ? "active" : "inactive"}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === "active" })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold appearance-none cursor-pointer"
                    >
                      <option value="active">Aktif Bertugas</option>
                      <option value="inactive">Non-Aktif</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </BioField>
              </div>
            )}
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

function BioField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}
