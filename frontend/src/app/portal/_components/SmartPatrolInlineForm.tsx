import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  Search,
  ChevronsUpDown,
  Check,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SmartPatrolInlineFormProps {
  onBack: () => void;
}

interface MySuratTugasOption {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
}

export function SmartPatrolInlineForm({ onBack }: SmartPatrolInlineFormProps) {
  const [loadingST, setLoadingST] = useState(false);
  const [stOptions, setStOptions] = useState<MySuratTugasOption[]>([]);
  
  const [selectedSTId, setSelectedSTId] = useState<string>("");
  const [stSearch, setStSearch] = useState("");
  const [stPopoverOpen, setStPopoverOpen] = useState(false);

  // === Section I: Cover ===
  const [coverMode, setCoverMode] = useState<"standard" | "custom">("standard");
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string>("");

  // === Section II: Basic Info ===
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [sumberDana, setSumberDana] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [dinilaiOleh, setDinilaiOleh] = useState("");
  const [disusunOleh, setDisusunOleh] = useState("");

  // === Section III - V ===
  const [kataPengantar, setKataPengantar] = useState("");
  const [daftarIsi, setDaftarIsi] = useState("");
  const [daftarLampiran, setDaftarLampiran] = useState("");

  // === BAB I Pendahuluan ===
  const [latarBelakang, setLatarBelakang] = useState("");
  const [dasarHukum, setDasarHukum] = useState("");
  const [maksudTujuan, setMaksudTujuan] = useState("");
  const [penerimaManfaat, setPenerimaManfaat] = useState("");
  const [output, setOutput] = useState("");
  const [indikatorKinerja, setIndikatorKinerja] = useState("");
  const [satuanUkur, setSatuanUkur] = useState("");
  const [volume, setVolume] = useState("");
  const [ruangLingkup, setRuangLingkup] = useState("");

  // === BAB II Metodologi ===
  const [waktuTempat, setWaktuTempat] = useState("");
  const [pelaksanaKegiatan, setPelaksanaKegiatan] = useState("");
  const [alatBahan, setAlatBahan] = useState("");
  const [metodePelaksanaan, setMetodePelaksanaan] = useState("");
  const [tahapanPelaksanaan, setTahapanPelaksanaan] = useState("");

  // === BAB III, IV, V ===
  const [hasilPelaksanaan, setHasilPelaksanaan] = useState("");
  const [simpulanSaran, setSimpulanSaran] = useState("");
  const [penutup, setPenutup] = useState("");

  // === Lampiran ===
  const [tallySheetFile, setTallySheetFile] = useState<File | null>(null);
  const [sptFile, setSptFile] = useState<File | null>(null);
  const [dokumentasiFiles, setDokumentasiFiles] = useState<File[]>([]);

  // Fetch ST specifically filtered by "patrol"
  const fetchMySuratTugas = useCallback(async () => {
    setLoadingST(true);
    try {
      const resp = await api.get("/surat-tugas/my", { params: { per_page: 100 } });
      const dataArray = resp.data?.data || resp.data;
      if (Array.isArray(dataArray)) {
        const filtered = dataArray.filter((st: any) => 
          st.maksud_tujuan?.toLowerCase().includes("patrol") || 
          st.nomor_surat?.toLowerCase().includes("patrol")
        );
        setStOptions(filtered);
      }
    } catch (err) {
      console.error("Gagal mengambil Surat Tugas:", err);
    } finally {
      setLoadingST(false);
    }
  }, []);

  useEffect(() => {
    fetchMySuratTugas();
  }, [fetchMySuratTugas]);

  // Autofill Nama Kegiatan when ST changes
  useEffect(() => {
    if (selectedSTId) {
      const st = stOptions.find(o => o.id === selectedSTId);
      if (st) {
        setNamaKegiatan(st.maksud_tujuan);
      }
    }
  }, [selectedSTId, stOptions]);

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomCoverFile(file);
      setCustomCoverPreview(URL.createObjectURL(file));
      setCoverMode("custom");
    }
  };

  const handleDokumentasiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDokumentasiFiles((prev) => [...prev, ...newFiles]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Form Laporan SMART PATROL
              </h2>
              <p className="text-xs text-slate-500 font-medium">Isi data form patroli kawasan.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          
          {/* SECTION: SURAT TUGAS */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
              Pilih Surat Tugas (Hanya Patroli)
            </Label>
            
            {loadingST ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat Surat Tugas...
              </div>
            ) : (
              <Popover open={stPopoverOpen} onOpenChange={setStPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-white dark:bg-slate-900 h-auto py-3 px-4 border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex flex-col items-start gap-1 text-left truncate pr-4">
                      {selectedSTId ? (
                        <>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate w-full">
                            {stOptions.find((st) => st.id === selectedSTId)?.nomor_surat || "[ Tanpa Nomor ST ]"}
                          </span>
                          <span className="text-xs text-slate-500 font-normal truncate w-full">
                            {stOptions.find((st) => st.id === selectedSTId)?.maksud_tujuan}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-normal text-sm">Pilih Surat Tugas...</span>
                      )}
                    </div>
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[800px] p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
                    <Search className="w-4 h-4 absolute left-6 top-6 text-slate-400" />
                    <Input 
                      placeholder="Cari ST..." 
                      value={stSearch}
                      onChange={(e) => setStSearch(e.target.value)}
                      className="pl-9 bg-slate-50 dark:bg-slate-800/50"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {stOptions
                      .filter(st => 
                        st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || 
                        st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase())
                      )
                      .map((st) => (
                      <div
                        key={st.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1",
                          selectedSTId === st.id ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                        onClick={() => {
                          setSelectedSTId(st.id);
                          setStPopoverOpen(false);
                          setStSearch("");
                        }}
                      >
                        <Check className={cn("w-4 h-4 mt-0.5 shrink-0 text-blue-600", selectedSTId === st.id ? "opacity-100" : "opacity-0")} />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{st.nomor_surat}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{st.maksud_tujuan}</p>
                        </div>
                      </div>
                    ))}
                    {stOptions.filter(st => st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase())).length === 0 && (
                      <p className="p-4 text-center text-sm text-slate-500">Tidak ada ST yang cocok.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* SECTION I: UPLOAD COVER */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">i. Cover Laporan</h3>
            <div className="flex gap-4">
              <Button
                variant={coverMode === "standard" ? "default" : "outline"}
                className={cn("flex-1", coverMode === "standard" && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => setCoverMode("standard")}
              >
                Cover Standar BKSDA
              </Button>
              <Button
                variant={coverMode === "custom" ? "default" : "outline"}
                className={cn("flex-1", coverMode === "custom" && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = handleCustomCoverChange as any;
                  input.click();
                }}
              >
                Upload Cover Kustom
              </Button>
            </div>
            {coverMode === "custom" && customCoverPreview && (
              <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-200 inline-block">
                <img src={customCoverPreview} alt="Cover Preview" className="h-64 object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full"
                  onClick={() => { setCustomCoverFile(null); setCustomCoverPreview(""); setCoverMode("standard"); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* SECTION II: INFORMASI DASAR */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">ii. Informasi Dasar</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Kegiatan</Label>
                <Input value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} placeholder="Contoh: SMART PATROL..." />
              </div>

              <div className="space-y-1.5">
                <Label>Sumber Dana</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                  value={sumberDana}
                  onChange={(e) => setSumberDana(e.target.value)}
                >
                  <option value="">-- Pilih Sumber Dana --</option>
                  <option value="ANGGARAN PROYEK FOLU NET SINK 2030 RBC NORWEGIA TAHAP II DAN III (FOLU NC 2&3) PADA AWP KSDAE – TAHUN ANGGARAN 2026">
                    ANGGARAN PROYEK FOLU NET SINK 2030 RBC NORWEGIA TAHAP II DAN III (FOLU NC 2&3) PADA AWP KSDAE – TAHUN ANGGARAN 2026
                  </option>
                  <option value="Sumber Dana 2">[ Opsi Lain 1 ]</option>
                  <option value="Sumber Dana 3">[ Opsi Lain 2 ]</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Tanggal Laporan</Label>
                  <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Dinilai Oleh</Label>
                  <Input value={dinilaiOleh} onChange={(e) => setDinilaiOleh(e.target.value)} placeholder="Nama Penilai..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Disusun Oleh</Label>
                  <Input value={disusunOleh} onChange={(e) => setDisusunOleh(e.target.value)} placeholder="Nama Penyusun..." />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* SECTION III - V */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">iii. Kata Pengantar</h3>
              <Textarea value={kataPengantar} onChange={(e) => setKataPengantar(e.target.value)} placeholder="Teks Kata Pengantar..." className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">iv. Daftar Isi</h3>
              <Textarea value={daftarIsi} onChange={(e) => setDaftarIsi(e.target.value)} placeholder="Daftar Isi (opsional untuk versi draft)..." className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">v. Daftar Lampiran</h3>
              <Textarea value={daftarLampiran} onChange={(e) => setDaftarLampiran(e.target.value)} placeholder="Daftar Lampiran..." className="min-h-[100px]" />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB I */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB I PENDAHULUAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label>A. Latar Belakang</Label><Textarea value={latarBelakang} onChange={(e) => setLatarBelakang(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>B. Dasar Hukum</Label><Textarea value={dasarHukum} onChange={(e) => setDasarHukum(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>C. Maksud dan Tujuan</Label><Textarea value={maksudTujuan} onChange={(e) => setMaksudTujuan(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>D. Penerima Manfaat/Sasaran</Label><Textarea value={penerimaManfaat} onChange={(e) => setPenerimaManfaat(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>E. Output</Label><Textarea value={output} onChange={(e) => setOutput(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>F. Indikator Kinerja Kegiatan</Label><Textarea value={indikatorKinerja} onChange={(e) => setIndikatorKinerja(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>G. Satuan Ukur</Label><Input value={satuanUkur} onChange={(e) => setSatuanUkur(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>H. Volume</Label><Input value={volume} onChange={(e) => setVolume(e.target.value)} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>I. Ruang Lingkup</Label><Textarea value={ruangLingkup} onChange={(e) => setRuangLingkup(e.target.value)} /></div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB II */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB II METODOLOGI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label>A. Waktu dan Tempat</Label><Textarea value={waktuTempat} onChange={(e) => setWaktuTempat(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>B. Pelaksana Kegiatan</Label><Textarea value={pelaksanaKegiatan} onChange={(e) => setPelaksanaKegiatan(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>C. Alat dan Bahan</Label><Textarea value={alatBahan} onChange={(e) => setAlatBahan(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>D. Metode Pelaksanaan</Label><Textarea value={metodePelaksanaan} onChange={(e) => setMetodePelaksanaan(e.target.value)} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>E. Tahapan Pelaksanaan Kegiatan</Label><Textarea value={tahapanPelaksanaan} onChange={(e) => setTahapanPelaksanaan(e.target.value)} className="min-h-[120px]" /></div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB III, IV, V */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB III HASIL KEGIATAN</h3>
              <div className="space-y-1.5"><Label>A. Hasil Pelaksanaan</Label><Textarea value={hasilPelaksanaan} onChange={(e) => setHasilPelaksanaan(e.target.value)} className="min-h-[150px]" /></div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB IV SIMPULAN DAN SARAN</h3>
              <Textarea value={simpulanSaran} onChange={(e) => setSimpulanSaran(e.target.value)} className="min-h-[150px]" />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB V PENUTUP</h3>
              <Textarea value={penutup} onChange={(e) => setPenutup(e.target.value)} className="min-h-[100px]" />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* LAMPIRAN */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">LAMPIRAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>1. TALLY SHEET</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={(e) => { if (e.target.files) setTallySheetFile(e.target.files[0]) }} />
                  {tallySheetFile && <Button variant="destructive" size="icon" onClick={() => setTallySheetFile(null)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>2. SURAT PERINTAH TUGAS (SPT)</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={(e) => { if (e.target.files) setSptFile(e.target.files[0]) }} />
                  {sptFile && <Button variant="destructive" size="icon" onClick={() => setSptFile(null)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>3. Dokumentasi Kegiatan Patroli</Label>
                <div className="flex gap-2">
                  <Input type="file" multiple accept="image/*" onChange={handleDokumentasiChange} />
                </div>
                {dokumentasiFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dokumentasiFiles.map((file, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200">
                        <img src={URL.createObjectURL(file)} alt="Dok" className="w-20 h-20 object-cover" />
                        <Button 
                          variant="destructive" size="icon" 
                          className="absolute top-1 right-1 w-6 h-6 rounded-full"
                          onClick={() => setDokumentasiFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
