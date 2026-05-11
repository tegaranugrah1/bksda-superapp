"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { isAxiosError } from "axios";
import STBuilderPreview from "../builder/[id]/STBuilderPreview";
import {
  formatDateIndonesian,
  daysBetween,
  numberToWords,
  indexToLetter,
} from "@/lib/letter-utils";

// --- Types ---
interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  department?: string;
  position?: string;
}

interface DasarItem {
  id: string;
  text: string;
}

interface SumberDanaOption {
  id: string;
  label: string;
  dasarText: string;
  biayaText: string;
}

const SUMBER_DANA_OPTIONS: SumberDanaOption[] = [
  { id: 'dipa', label: 'DIPA', 
    dasarText: 'Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 23 Desember 2025.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};'
  },
  { id: 'kja', label: 'Dana Kerjasama KJA',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur and PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 and Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;'
  },
  { id: 'mja', label: 'Dana Kerjasama MJA',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;'
  },
  { id: 'cop', label: 'Dana Kerjasama COP',
    dasarText: 'Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur and Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 and Nomor 17/HQ10/COP/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur and Centre for Orangutan Protection (COP);'
  },
  { id: 'tjiwi_kimia', label: 'Dana Kerjasama PT. Tjiwi Kimia Tbk.',
    dasarText: 'Perjanjian kerjasama antara Balai KSDA Kalimantan Timur and PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 and Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang and Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur and PT Pabrik Kertas Tjiwi Kimia Tbk;'
  },
  { id: 'bosf', label: 'Dana Kerjasama BOSF',
    dasarText: 'Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 and Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);'
  },
  { id: 'can', label: 'Dana Kerjasama CAN',
    dasarText: 'Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 and 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur and Conservation Action Network (CAN);'
  },
  { id: 'alert', label: 'Dana Kerjasama ALeRT',
    dasarText: 'Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 and Nomor: 51/PKS-ALeRT/ X/2023.',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);'
  },
  { id: 'folu', label: 'Dana Kerjasama FOLU',
    dasarText: '',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Dana Kerjasama FOLU;'
  },
  { id: 'dl1', label: 'DL 1 / Tidak ada biaya',
    dasarText: '',
    biayaText: 'Segala biaya yang timbul akibat Surat Tugas ini tidak dibebankan pada anggaran manapun (DL 1 / tanpa biaya).'
  },
  { id: 'other', label: 'Lainnya',
    dasarText: '',
    biayaText: ''
  },
];

export default function STCreatePremiumPage() {
  const router = useRouter();

  // --- Form State ---
  const [stNumber, setStNumber] = useState("");
  const [stCode, setStCode] = useState("");
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();

  const [menimbangItems, setMenimbangItems] = useState<DasarItem[]>([
    { id: "1", text: "bahwa dalam rangka , perlu ;" },
    { id: "2", text: "bahwa sehubungan butir a di atas perlu untuk menugaskan staf tersebut di bawah ini untuk melaksanakan kegiatan dimaksud." },
  ]);
  const [dasarItems, setDasarItems] = useState<DasarItem[]>([
    { id: "1", text: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor 13 Tahun 2021 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;" },
    { id: "2", text: `Surat Pengesahan DIPA Tahun Anggaran ${currentYear} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/${currentYear} tanggal 23 Desember 2025.` },
  ]);

  const [sumberDana, setSumberDana] = useState("dipa");
  const [sumberDanaOther, setSumberDanaOther] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [activityPrefix, setActivityPrefix] = useState("Perjalanan Dinas");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [tempatKegiatan, setTempatKegiatan] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [kepalaBalai, setKepalaBalai] = useState({ name: "M. Ari Wibawanto, S.Hut., M.Sc.", nip: "19740514 199903 1 001" });
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().substring(0, 10));
  const [kotaSurat, setKotaSurat] = useState("Samarinda");

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["employees-select-builder-create"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data.data || [];
    },
  });

  const searchResults = allEmployees
    .filter((emp: Employee) => 
      (emp.nama_lengkap?.toLowerCase() || emp.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
      (emp.nip?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .slice(0, 50);

  // Helper for "Untuk" text
  const buildUntukText = (): string => {
    const days = daysBetween(tanggalMulai, tanggalSelesai);
    const daysWord = numberToWords(days);
    const mulaiFormatted = formatDateIndonesian(tanggalMulai);
    const selesaiFormatted = formatDateIndonesian(tanggalSelesai);

    let text = `${activityPrefix} dari ${kotaAsal || "..."} ke ${kotaTujuan || "..."}`;
    if (namaKegiatan) {
      text += ` dalam rangka ${namaKegiatan}`;
    }
    if (tempatKegiatan) {
      text += ` di ${tempatKegiatan}`;
    }
    if (days > 0) {
      text += `, selama ${days} (${daysWord}) hari terhitung mulai tanggal ${mulaiFormatted} sampai dengan ${selesaiFormatted};`;
    } else {
      text += ";";
    }
    return text;
  };

  // Build biaya text
  const buildBiayaText = (): string => {
    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === sumberDana);
    if (opt?.biayaText) {
      const tahun = tanggalSurat ? new Date(tanggalSurat).getFullYear().toString() : new Date().getFullYear().toString();
      return opt.biayaText.replace(/{tahun}/g, tahun);
    }
    if (sumberDana === 'other') {
      return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${sumberDanaOther || '...'};`;
    }
    return `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;`;
  };

  // Function to update Dasar items based on Funding
  const updateDasarFromFunding = (fundingId: string, date: string) => {
    const opt = SUMBER_DANA_OPTIONS.find(o => o.id === fundingId);
    if (opt && opt.dasarText) {
      const tahun = date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString();
      const text = opt.dasarText.replace(/{tahun}/g, tahun);
      
      setDasarItems(prev => {
        const newItems = [...prev];
        if (newItems.length >= 2) {
          newItems[1].text = text;
        } else if (newItems.length === 1) {
          newItems.push({ id: Date.now().toString(), text });
        }
        return newItems;
      });
    }
  };

  // Initial setup - nomor surat dikosongkan, diisi manual oleh user
  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // Handlers
  const handleApprove = async () => {
    if (!stNumber) return toast.error("Nomor surat harus diisi.");
    if (selectedEmployees.length === 0) return toast.error("Personil harus dipilih.");

    try {
      const fullNomorSurat = `ST.${stNumber}/${stCode}/${currentMonth}/${currentYear}`;
      const payload = {
        nomor_surat: fullNomorSurat,
        kode_surat: stCode,
        tanggal_surat: tanggalSurat,
        sumber_dana: sumberDana,
        sumber_dana_other: sumberDanaOther,
        menimbang: menimbangItems,
        dasar: dasarItems,
        employee_ids: selectedEmployees.map(e => e.id),
        maksud_tujuan: buildUntukText() + "\n" + buildBiayaText(),
        tempat_tujuan: kotaTujuan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai
      };
      await api.post(`/surat-tugas/direct`, payload);
      toast.success("Surat Tugas berhasil diterbitkan!");
      router.push("/kepegawaian/surat-tugas/history");
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "Gagal menerbitkan ST.";
      if (isAxiosError<{ message?: string }>(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("surat-preview-doc");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>ST.${stNumber}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Bookman Old Style', serif; font-size: 11pt; line-height: 1.25; color: #000; margin: 0; padding: 0; }
          #surat-preview-doc { padding: 0.4cm 1cm 1cm 3cm !important; box-sizing: border-box; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 2px 0; font-size: 11pt; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-800 uppercase tracking-widest">Inisialisasi Builder...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-800">ST Builder <span className="text-emerald-600">Premium</span></h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Direct Issuance Mode</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <FormSection title="Nomor Surat">
            <div className="flex items-stretch bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/10">
              <div className="bg-slate-100 px-3 flex items-center border-r border-slate-200 shrink-0"><span className="text-xs font-bold">ST.</span></div>
              <input value={stNumber} onChange={e => setStNumber(e.target.value)} placeholder="001" className="w-14 px-2 py-2 text-sm font-bold bg-transparent outline-none text-center" />
              <div className="px-0.5 flex items-center text-slate-300 shrink-0">/</div>
              <input value={stCode} onChange={e => setStCode(e.target.value)} placeholder="K.18/TU/KSA.0X.0X/B" className="flex-1 min-w-0 px-2 py-2 text-xs font-medium bg-transparent outline-none" />
              <div className="bg-slate-100 px-2 flex items-center border-l border-slate-200 shrink-0"><span className="text-[10px] font-bold text-slate-500">/{currentMonth}/{currentYear}</span></div>
            </div>
          </FormSection>

          <FormSection title="Pengaturan Dokumen">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kota</label>
                <input value={kotaSurat} onChange={e => setKotaSurat(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggalSurat} 
                  onChange={e => {
                    const newDate = e.target.value;
                    setTanggalSurat(newDate);
                    updateDasarFromFunding(sumberDana, newDate);
                  }} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white" 
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Sumber Dana">
            <div className="space-y-2">
              <select 
                value={sumberDana} 
                onChange={e => {
                  const newFunding = e.target.value;
                  setSumberDana(newFunding);
                  updateDasarFromFunding(newFunding, tanggalSurat);
                }} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
              >
                {SUMBER_DANA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              {sumberDana === 'other' && (
                <input 
                  value={sumberDanaOther} 
                  onChange={e => setSumberDanaOther(e.target.value)} 
                  placeholder="Sebutkan sumber dana..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white animate-in slide-in-from-top-1" 
                />
              )}
            </div>
          </FormSection>

          <FormSection title="Menimbang" action={<button onClick={() => setMenimbangItems([...menimbangItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-emerald-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {menimbangItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2">{indexToLetter(idx)}</span>
                  <textarea value={item.text} onChange={e => { const n = [...menimbangItems]; n[idx].text = e.target.value; setMenimbangItems(n); }} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none min-h-[60px]" />
                  <button onClick={() => setMenimbangItems(menimbangItems.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Dasar" action={<button onClick={() => setDasarItems([...dasarItems, { id: Math.random().toString(), text: "" }])} className="text-[10px] text-emerald-600 font-bold uppercase"><Plus className="w-3 h-3" /> Tambah</button>}>
            <div className="space-y-3">
              {dasarItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2">{idx + 1}.</span>
                  <textarea value={item.text} onChange={e => { const n = [...dasarItems]; n[idx].text = e.target.value; setDasarItems(n); }} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none min-h-[60px]" />
                  <button onClick={() => setDasarItems(dasarItems.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Kepada (Personil)" action={<span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{selectedEmployees.length}</span>}>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Cari..." />
              </div>
              <AnimatePresence>
                {showDropdown && searchQuery && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute w-full mt-1 bg-white border rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((emp: Employee) => (
                      <button key={emp.id} onClick={() => { 
                        const normalized = { ...emp, nama_lengkap: emp.nama_lengkap || emp.name || "", jabatan: emp.jabatan || emp.position || "" };
                        setSelectedEmployees([...selectedEmployees, normalized]); 
                        setSearchQuery(""); 
                        setShowDropdown(false); 
                      }} className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b last:border-0">
                        <p className="text-sm font-bold">{emp.nama_lengkap || emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.nip}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2 mt-3">
              {selectedEmployees.map((emp, idx) => (
                <div key={emp.id} className="flex items-center gap-2 p-2 bg-slate-50 border rounded-xl group">
                  <span className="text-[10px] font-bold text-slate-400">{idx+1}</span>
                  <div className="flex-1 truncate text-xs font-bold">{emp.nama_lengkap || emp.name}</div>
                  <button onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id))} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Detail Kegiatan">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Tugas</label>
                <select 
                  value={activityPrefix} 
                  onChange={e => setActivityPrefix(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                >
                  <option value="Perjalanan Dinas">Perjalanan Dinas</option>
                  <option value="Melaksanakan Tugas">Melaksanakan Tugas</option>
                  <option value="Menugaskan Staf">Menugaskan Staf</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={kotaAsal} onChange={e => setKotaAsal(e.target.value)} placeholder="Asal" className="px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
                <input value={kotaTujuan} onChange={e => setKotaTujuan(e.target.value)} placeholder="Tujuan" className="px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
              </div>
              <textarea value={namaKegiatan} onChange={e => setNamaKegiatan(e.target.value)} placeholder="Kegiatan..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm min-h-[60px] outline-none" />
              <input value={tempatKegiatan} onChange={e => setTempatKegiatan(e.target.value)} placeholder="Tempat Spesifik" className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
                <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Penandatangan">
            <input value={kepalaBalai.name} onChange={e => setKepalaBalai({...kepalaBalai, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm mb-2 outline-none" />
            <input value={kepalaBalai.nip} onChange={e => setKepalaBalai({...kepalaBalai, nip: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm outline-none" />
          </FormSection>
        </div>

        <footer className="p-6 border-t bg-white sticky bottom-0">
          <Button onClick={handleApprove} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold mb-3"><CheckCircle className="w-5 h-5 mr-2" /> Terbitkan & Cetak</Button>
          <Button variant="outline" onClick={handlePrint} className="w-full h-12 rounded-xl font-bold text-slate-600"><Printer className="w-5 h-5 mr-2" /> Preview Cetak</Button>
        </footer>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-200/50">
        <STBuilderPreview 
          stNumber={stNumber} stCode={stCode} currentMonth={currentMonth} currentYear={currentYear}
          menimbangItems={menimbangItems} dasarItems={dasarItems} selectedEmployees={selectedEmployees}
          buildUntukText={buildUntukText} buildBiayaText={buildBiayaText}
          kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} kepalaBalai={kepalaBalai}
        />
      </main>
    </div>
  );
}

function FormSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
