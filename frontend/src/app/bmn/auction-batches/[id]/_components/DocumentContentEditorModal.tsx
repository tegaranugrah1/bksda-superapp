"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  RotateCcw,
  Printer,
  Save,
  Plus,
  Trash2,
  FileText,
  Loader2,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { AuctionBatch } from "../../_lib/api";
import type { AuctionAsset } from "../../../auction-candidates/_lib/auction-helpers";
import type { SkKepalaBalai, SkBuilderItem, SkMemutuskan } from "../../../auction-candidates/_lib/sk-defaults";
import { newSkBuilderItem } from "../../../auction-candidates/_lib/sk-defaults";
import type { PanitiaAnggota } from "../../../auction-candidates/_lib/sk-panitia-defaults";
import type { PemeriksaAnggota } from "../../../auction-candidates/_lib/pemeriksa-defaults";
import { DEFAULT_TIM_PENILAI_MEMUTUSKAN } from "../../../auction-candidates/_lib/sk-tim-penilai-defaults";

import {
  getDefaultDocumentContent,
  newPernyataanItem,
  type SkDocumentContent,
  type LetterDocumentContent,
  type BaPemeriksaanContent,
  type BaKoreksiContent,
  type SuratTugasContent,
  type PernyataanDocumentContent,
} from "../../_lib/document-content-defaults";

import { AuctionDocumentRenderer } from "./AuctionDocumentRenderer";

export interface DocumentItemInfo {
  key: string;
  title: string;
  category: "internal" | "sk" | "pernyataan" | "eksternal";
  description: string;
  rootId: string;
}

interface DocumentContentEditorModalProps {
  open: boolean;
  onClose: () => void;
  doc: DocumentItemInfo;
  batch: AuctionBatch;
  mappedAssets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
  panitiaList: PanitiaAnggota[];
  timPenilaiList: any[];
  pemeriksaList: PemeriksaAnggota[];
  stNumber: string;
  stTanggal?: string;
  getDocumentNumber: (key: string, fallback?: string) => string;
  getDocumentKap: (key: string) => string;
  getDocumentDate: (key: string) => string | undefined;
  onSaveContent: (docKey: string, newContent: any) => Promise<void>;
  onPrintDoc: (doc: DocumentItemInfo) => void;
}

export function DocumentContentEditorModal({
  open,
  onClose,
  doc,
  batch,
  mappedAssets,
  kepalaBalai,
  panitiaList,
  timPenilaiList,
  pemeriksaList,
  stNumber,
  stTanggal,
  getDocumentNumber,
  getDocumentKap,
  getDocumentDate,
  onSaveContent,
  onPrintDoc,
}: DocumentContentEditorModalProps) {
  const meta = (batch.metadata as Record<string, any>) || {};
  const savedContents = meta.document_contents || {};

  // Initialize content state from saved content or default template
  const [content, setContent] = useState<any>(() => {
    if (savedContents[doc.key]) {
      return JSON.parse(JSON.stringify(savedContents[doc.key]));
    }
    // SK backward-compatibility fallback
    if (doc.key === "sk_penghentian" && meta.sk_details?.penghentian) {
      return JSON.parse(JSON.stringify(meta.sk_details.penghentian));
    }
    if (doc.key === "sk_panitia" && meta.sk_details?.panitia) {
      return JSON.parse(JSON.stringify(meta.sk_details.panitia));
    }
    if (doc.key === "sk_tim_penilai" && meta.sk_details?.tim_penilai) {
      return JSON.parse(JSON.stringify(meta.sk_details.tim_penilai));
    }
    return getDefaultDocumentContent(doc.key);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"menimbang" | "mengingat" | "memutuskan" | "tembusan">("menimbang");

  // Reset content when document key changes
  useEffect(() => {
    if (savedContents[doc.key]) {
      setContent(JSON.parse(JSON.stringify(savedContents[doc.key])));
    } else if (doc.key === "sk_penghentian" && meta.sk_details?.penghentian) {
      setContent(JSON.parse(JSON.stringify(meta.sk_details.penghentian)));
    } else if (doc.key === "sk_panitia" && meta.sk_details?.panitia) {
      setContent(JSON.parse(JSON.stringify(meta.sk_details.panitia)));
    } else if (doc.key === "sk_tim_penilai" && meta.sk_details?.tim_penilai) {
      setContent(JSON.parse(JSON.stringify(meta.sk_details.tim_penilai)));
    } else {
      setContent(getDefaultDocumentContent(doc.key));
    }
    setActiveTab("menimbang");
  }, [doc.key, batch.metadata]);

  if (!open) return null;

  const handleResetToDefault = () => {
    const defaults = getDefaultDocumentContent(doc.key);
    setContent(JSON.parse(JSON.stringify(defaults)));
    toast.info("Isi dokumen telah direset ke format standar instansi.");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveContent(doc.key, content);
      toast.success(`Perubahan isi ${doc.title} berhasil disimpan!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan perubahan isi dokumen.");
    } finally {
      setIsSaving(false);
    }
  };

  const isSk = ["sk_penghentian", "sk_panitia", "sk_tim_penilai"].includes(doc.key);
  const isLetter = ["nota_dinas", "permohonan_kpknl"].includes(doc.key);
  const isBa = ["ba_pemeriksaan", "ba_koreksi"].includes(doc.key);
  const isSuratTugas = doc.key === "surat_tugas_pemeriksaan_penilaian";
  const isPernyataan = ["sptjm", "sptj_limit", "sp_tugas", "sk_kebenaran"].includes(doc.key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-hidden">
      <div className="flex flex-col w-full h-full max-w-[96vw] max-h-[96vh] rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Modal Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Edit Isi & Pratinjau
                </h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {doc.title} &bull; Sesuaikan narasi, konsiderans, atau butir pernyataan sebelum dicetak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              title="Kembalikan narasi dokumen ini ke format template standar instansi"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset ke Default
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrintDoc(doc)}
              className="h-9 gap-1.5 rounded-xl border-emerald-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Dokumen
            </Button>

            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="h-9 gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] flex-1 overflow-hidden">
          
          {/* LEFT: Structured Form Editor */}
          <div className="flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Formulir Kustomisasi Isi
              </span>
              <span className="text-[11px] text-zinc-400">
                Akan tersimpan ke draft lelang
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* === SK EDITOR === */}
              {isSk && (
                <div className="space-y-4">
                  {/* Category Sub-tabs */}
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1">
                    {(["menimbang", "mengingat", "memutuskan", "tembusan"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-lg py-1.5 text-xs font-bold capitalize transition-colors ${
                          activeTab === tab
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Menimbang */}
                  {activeTab === "menimbang" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Butir Konsiderans Menimbang
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            const current = (content as SkDocumentContent).menimbang || [];
                            setContent({
                              ...content,
                              menimbang: [...current, newSkBuilderItem("")],
                            });
                          }}
                          className="h-7 gap-1 rounded-lg text-[11px]"
                        >
                          <Plus className="h-3 w-3" /> Tambah Poin
                        </Button>
                      </div>
                      <div className="space-y-2.5">
                        {((content as SkDocumentContent).menimbang || []).map((item, idx) => (
                          <div key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-zinc-500">
                                Huruf ({String.fromCharCode(97 + idx)})
                              </span>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={((content as SkDocumentContent).menimbang || []).length <= 1}
                                onClick={() => {
                                  const filtered = ((content as SkDocumentContent).menimbang || []).filter((m) => m.id !== item.id);
                                  setContent({ ...content, menimbang: filtered });
                                }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Textarea
                              rows={3}
                              value={item.text}
                              onChange={(e) => {
                                const updated = ((content as SkDocumentContent).menimbang || []).map((m) =>
                                  m.id === item.id ? { ...m, text: e.target.value } : m
                                );
                                setContent({ ...content, menimbang: updated });
                              }}
                              placeholder="Tulis butir menimbang..."
                              className="text-xs leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mengingat */}
                  {activeTab === "mengingat" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Dasar Hukum Mengingat
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            const current = (content as SkDocumentContent).mengingat || [];
                            setContent({
                              ...content,
                              mengingat: [...current, newSkBuilderItem("")],
                            });
                          }}
                          className="h-7 gap-1 rounded-lg text-[11px]"
                        >
                          <Plus className="h-3 w-3" /> Tambah Dasar Hukum
                        </Button>
                      </div>
                      <div className="space-y-2.5">
                        {((content as SkDocumentContent).mengingat || []).map((item, idx) => (
                          <div key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-zinc-500">
                                Angka ({idx + 1})
                              </span>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={((content as SkDocumentContent).mengingat || []).length <= 1}
                                onClick={() => {
                                  const filtered = ((content as SkDocumentContent).mengingat || []).filter((m) => m.id !== item.id);
                                  setContent({ ...content, mengingat: filtered });
                                }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Textarea
                              rows={3}
                              value={item.text}
                              onChange={(e) => {
                                const updated = ((content as SkDocumentContent).mengingat || []).map((m) =>
                                  m.id === item.id ? { ...m, text: e.target.value } : m
                                );
                                setContent({ ...content, mengingat: updated });
                              }}
                              placeholder="Tulis undang-undang / peraturan..."
                              className="text-xs leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memutuskan */}
                  {activeTab === "memutuskan" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-zinc-500">Menetapkan</label>
                        <Textarea
                          rows={2}
                          value={(content as SkDocumentContent).memutuskan?.menetapkan || ""}
                          onChange={(e) =>
                            setContent({
                              ...content,
                              memutuskan: {
                                ...(content as SkDocumentContent).memutuskan,
                                menetapkan: e.target.value,
                              },
                            })
                          }
                          className="text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-zinc-500">KESATU</label>
                        <Textarea
                          rows={4}
                          value={(content as SkDocumentContent).memutuskan?.kesatu || ""}
                          onChange={(e) =>
                            setContent({
                              ...content,
                              memutuskan: {
                                ...(content as SkDocumentContent).memutuskan,
                                kesatu: e.target.value,
                              },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-zinc-500">KEDUA</label>
                        <Textarea
                          rows={4}
                          value={(content as SkDocumentContent).memutuskan?.kedua || ""}
                          onChange={(e) =>
                            setContent({
                              ...content,
                              memutuskan: {
                                ...(content as SkDocumentContent).memutuskan,
                                kedua: e.target.value,
                              },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-zinc-500">KETIGA</label>
                        <Textarea
                          rows={2}
                          value={(content as SkDocumentContent).memutuskan?.ketiga || ""}
                          onChange={(e) =>
                            setContent({
                              ...content,
                              memutuskan: {
                                ...(content as SkDocumentContent).memutuskan,
                                ketiga: e.target.value,
                              },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      {doc.key === "sk_tim_penilai" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-zinc-500">KEEMPAT</label>
                          <Textarea
                            rows={2}
                            value={(content as any).memutuskan?.keempat || DEFAULT_TIM_PENILAI_MEMUTUSKAN.keempat}
                            onChange={(e) =>
                              setContent({
                                ...content,
                                memutuskan: {
                                  ...(content as any).memutuskan,
                                  keempat: e.target.value,
                                },
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tembusan */}
                  {activeTab === "tembusan" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Daftar Tembusan Surat
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            const current = (content as SkDocumentContent).tembusan || [];
                            setContent({
                              ...content,
                              tembusan: [...current, newSkBuilderItem("")],
                            });
                          }}
                          className="h-7 gap-1 rounded-lg text-[11px]"
                        >
                          <Plus className="h-3 w-3" /> Tambah Tembusan
                        </Button>
                      </div>
                      <div className="space-y-2.5">
                        {((content as SkDocumentContent).tembusan || []).length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">Tidak ada tembusan pada SK ini.</p>
                        ) : (
                          ((content as SkDocumentContent).tembusan || []).map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-400 w-5">{idx + 1}.</span>
                              <Input
                                value={item.text}
                                onChange={(e) => {
                                  const updated = ((content as SkDocumentContent).tembusan || []).map((t) =>
                                    t.id === item.id ? { ...t, text: e.target.value } : t
                                  );
                                  setContent({ ...content, tembusan: updated });
                                }}
                                placeholder="Nama instansi/pejabat tembusan..."
                                className="h-8 text-xs flex-1"
                              />
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  const filtered = ((content as SkDocumentContent).tembusan || []).filter((t) => t.id !== item.id);
                                  setContent({ ...content, tembusan: filtered });
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === LETTER EDITOR (Nota Dinas / Permohonan KPKNL) === */}
              {isLetter && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Perihal</label>
                    <Input
                      value={(content as LetterDocumentContent).perihal || ""}
                      onChange={(e) => setContent({ ...content, perihal: e.target.value })}
                      className="text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase text-zinc-500">Lampiran</label>
                      <Input
                        value={(content as LetterDocumentContent).lampiran || ""}
                        onChange={(e) => setContent({ ...content, lampiran: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase text-zinc-500">Kota Lokasi</label>
                      <Input
                        value={(content as LetterDocumentContent).lokasi || ""}
                        onChange={(e) => setContent({ ...content, lokasi: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Tujuan Surat / Pejabat Penerima</label>
                    <Input
                      value={(content as LetterDocumentContent).tujuan || ""}
                      onChange={(e) => setContent({ ...content, tujuan: e.target.value })}
                      placeholder="Contoh: Sekretaris Direktorat Jenderal KSDAE"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Narasi Isi & Kesimpulan Pokok</label>
                    <Textarea
                      rows={5}
                      value={(content as LetterDocumentContent).kesimpulan || ""}
                      onChange={(e) => setContent({ ...content, kesimpulan: e.target.value })}
                      placeholder="Tulis uraian pokok surat..."
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* === BERITA ACARA EDITOR === */}
              {isBa && doc.key === "ba_koreksi" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Tempat Pelaksanaan</label>
                    <Input
                      value={(content as BaKoreksiContent).tempat || ""}
                      onChange={(e) => setContent({ ...content, tempat: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Alasan & Rincian Koreksi</label>
                    <Textarea
                      rows={4}
                      value={(content as BaKoreksiContent).alasan || ""}
                      onChange={(e) => setContent({ ...content, alasan: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Kalimat Penutup</label>
                    <Textarea
                      rows={3}
                      value={(content as BaKoreksiContent).penutup || ""}
                      onChange={(e) => setContent({ ...content, penutup: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {isBa && doc.key === "ba_pemeriksaan" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Teks Hari (Opsional / Manual)</label>
                    <Input
                      value={(content as BaPemeriksaanContent).hari || ""}
                      onChange={(e) => setContent({ ...content, hari: e.target.value })}
                      placeholder="Biarkan kosong untuk otomatis sesuai tanggal dokumen"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Dasar Pelaksanaan Tugas & Pemeriksaan</label>
                    <Textarea
                      rows={5}
                      value={(content as BaPemeriksaanContent).dasarTugas || ""}
                      onChange={(e) => setContent({ ...content, dasarTugas: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Kalimat Penutup</label>
                    <Textarea
                      rows={3}
                      value={(content as BaPemeriksaanContent).penutup || ""}
                      onChange={(e) => setContent({ ...content, penutup: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* === SURAT TUGAS EDITOR === */}
              {isSuratTugas && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Dasar Surat Tugas</label>
                    <Textarea
                      rows={4}
                      value={(content as SuratTugasContent).dasar || ""}
                      onChange={(e) => setContent({ ...content, dasar: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Maksud / Uraian Tugas</label>
                    <Textarea
                      rows={4}
                      value={(content as SuratTugasContent).maksud || ""}
                      onChange={(e) => setContent({ ...content, maksud: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Masa Berlaku & Penutup</label>
                    <Textarea
                      rows={3}
                      value={(content as SuratTugasContent).penutup || ""}
                      onChange={(e) => setContent({ ...content, penutup: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* === SURAT PERNYATAAN EDITOR (SPTJM, SPTJ Limit, SP Tugas, SK Kebenaran) === */}
              {isPernyataan && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Kalimat Pembuka</label>
                    <Textarea
                      rows={3}
                      value={(content as PernyataanDocumentContent).pembuka || ""}
                      onChange={(e) => setContent({ ...content, pembuka: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Butir-butir Pernyataan
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          const current = (content as PernyataanDocumentContent).poin || [];
                          setContent({
                            ...content,
                            poin: [...current, newPernyataanItem("")],
                          });
                        }}
                        className="h-7 gap-1 rounded-lg text-[11px]"
                      >
                        <Plus className="h-3 w-3" /> Tambah Poin
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {((content as PernyataanDocumentContent).poin || []).map((item, idx) => (
                        <div key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-zinc-500">
                              Pernyataan #{idx + 1}
                            </span>
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={((content as PernyataanDocumentContent).poin || []).length <= 1}
                              onClick={() => {
                                const filtered = ((content as PernyataanDocumentContent).poin || []).filter((p) => p.id !== item.id);
                                setContent({ ...content, poin: filtered });
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Textarea
                            rows={3}
                            value={item.text}
                            onChange={(e) => {
                              const updated = ((content as PernyataanDocumentContent).poin || []).map((p) =>
                                p.id === item.id ? { ...p, text: e.target.value } : p
                              );
                              setContent({ ...content, poin: updated });
                            }}
                            placeholder="Tulis kalimat pernyataan..."
                            className="text-xs leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500">Kalimat Penutup</label>
                    <Textarea
                      rows={3}
                      value={(content as PernyataanDocumentContent).penutup || ""}
                      onChange={(e) => setContent({ ...content, penutup: e.target.value })}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Document Preview */}
          <div className="flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Pratinjau Langsung (A4 Paper)
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Format Tata Naskah Dinas Resmi
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
              <div className="w-full max-w-[210mm] transition-all duration-150">
                <AuctionDocumentRenderer
                  docKey={doc.key}
                  assets={mappedAssets}
                  getDocumentNumber={getDocumentNumber}
                  getDocumentKap={getDocumentKap}
                  getDocumentDate={getDocumentDate}
                  kepalaBalai={kepalaBalai}
                  content={content}
                  panitiaList={panitiaList}
                  timPenilaiList={timPenilaiList}
                  pemeriksaList={pemeriksaList}
                  stNumber={stNumber}
                  stTanggal={stTanggal || ""}
                  nilaiTaksiranTotal={batch.nilai_taksiran_total || 0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
