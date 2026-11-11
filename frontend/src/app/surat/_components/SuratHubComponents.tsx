"use client";

import React from "react";
import Link from "next/link";
import {
  Inbox,
  Send,
  Plus,
  FileCheck,
  CheckCircle2,
  Mail,
  ChevronRight,
  Calendar,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuratMasuk, SuratKeluar } from "../_lib/surat-types";

export interface SuratMasukItem extends Partial<SuratMasuk> {
  perihal?: string;
  tanggal_terima?: string;
  sifat?: string;
}
export type SuratKeluarItem = Partial<SuratKeluar>;

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const [y, m, d] = String(dateStr).split(/[T ]/)[0].split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(dateStr);
}

export function HeaderBanner({ canCreate = true }: { canCreate?: boolean }) {
  return (
    <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="kpg-support-icon w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
            Dashboard Persuratan
          </h1>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
            Pusat penatausahaan surat masuk, surat keluar, lembar disposisi, dan tata naskah dinas BKSDA Kalimantan Timur.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {canCreate && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            asChild
            variant="outline"
            className="kpg-secondary h-9 px-4 text-xs font-bold rounded-xl gap-1.5"
          >
            <Link href="/surat/keluar/create">
              <Plus className="h-4 w-4 text-[var(--ds-accent-fg)]" />
              Input Surat Keluar
            </Link>
          </Button>
          <Button asChild className="h-9 px-4 text-xs font-bold rounded-xl gap-1.5">
            <Link href="/surat/masuk/create">
              <Plus className="h-4 w-4" />
              Input Surat Masuk
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function BentoStatCards({
  totalSuratMasuk,
  totalSuratKeluar,
}: {
  totalSuratMasuk: number;
  totalSuratKeluar: number;
}) {
  const stats = [
    {
      label: "Surat Masuk",
      subLabel: "Agenda Aktif",
      desc: "Disposisi & Teragendakan",
      value: totalSuratMasuk,
      href: "/surat/masuk",
      icon: Inbox,
      toneClass: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Surat Keluar",
      subLabel: "Terarsip",
      desc: "Penomoran Naskah Resmi",
      value: totalSuratKeluar,
      href: "/surat/keluar",
      icon: Send,
      toneClass: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Disposisi Cetak",
      subLabel: "Standar",
      desc: "2 Lembar Disposisi per Halaman",
      value: "2-Up Letter",
      valueClass: "text-lg md:text-xl",
      href: "/surat/masuk",
      icon: FileCheck,
      toneClass: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Tata Kelola",
      subLabel: "Terdata",
      desc: "Penatausahaan Naskah Resmi",
      value: "100%",
      href: "/surat/keluar/dinas",
      icon: CheckCircle2,
      toneClass: "text-[var(--ds-accent-fg)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-soft-border)] p-3.5 rounded-2xl transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`kpg-support-icon w-9 h-9 rounded-xl border flex items-center justify-center ${card.toneClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`kpg-support-badge text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${card.toneClass}`}>
                {card.label}
              </span>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={`font-bold text-[var(--ds-fg)] tracking-tight tabular-nums ${card.valueClass || "text-xl md:text-2xl"}`}>
                  {card.value}
                </p>
                <span className={`kpg-support-badge text-xs font-semibold px-1.5 py-0.5 rounded ${card.toneClass}`}>
                  {card.subLabel}
                </span>
              </div>
              <p className="text-xs text-[var(--ds-fg-muted)] font-medium mt-0.5">
                {card.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function RecentSuratWidget({
  suratMasukList,
  suratKeluarList,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  suratMasukList: SuratMasukItem[];
  suratKeluarList: SuratKeluarItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--ds-status-danger-fg)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat ringkasan surat terbaru dari server.</span>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="kpg-secondary h-8 px-3 text-xs font-bold rounded-xl gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Kolom Kiri: Tabel Mini Surat Masuk Terbaru */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3.5 md:px-4 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="kpg-support-icon w-8 h-8 rounded-xl border text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs md:text-sm text-[var(--ds-fg)]">
                Surat Masuk Terbaru
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                5 naskah dinas masuk &amp; disposisi terakhir
              </p>
            </div>
          </div>
          <Link
            href="/surat/masuk"
            className="text-xs font-bold text-[var(--ds-accent-fg)] hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="p-3.5 space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-10 w-full animate-pulse rounded-xl bg-[var(--ds-surface-muted)]" />
              ))}
            </div>
          ) : suratMasukList.length === 0 ? (
            <div className="p-8 text-center text-[var(--ds-fg-muted)] text-xs font-medium">
              Belum ada data Surat Masuk terbaru.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--ds-border-subtle)] text-xs uppercase font-bold text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)]">
                <tr>
                  <th className="py-2 px-3">No Agenda</th>
                  <th className="py-2 px-3">No &amp; Tgl Surat</th>
                  <th className="py-2 px-3">Pengirim &amp; Perihal</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {suratMasukList.map((item) => {
                  const perihalText = item.isi_ringkas || item.perihal || "-";
                  const sifatText = (item.sifat_json && item.sifat_json[0]) || item.sifat || "Biasa";
                  return (
                    <tr
                      key={item.id || item.no_agenda}
                      className="transition-colors"
                    >
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <span className="font-semibold text-[var(--ds-accent-fg)] block tabular-nums">
                          {item.no_agenda || "-"}
                        </span>
                        <span className="text-xs text-[var(--ds-fg-muted)] block mt-0.5 tabular-nums">
                          {formatDisplayDate(item.tanggal_agenda || item.tanggal_terima)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-top max-w-[160px]">
                        <span className="font-semibold text-[var(--ds-fg)] block truncate">
                          {item.no_surat || "-"}
                        </span>
                        <span className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-1 mt-0.5 tabular-nums">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {formatDisplayDate(item.tanggal_surat)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-top max-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--ds-fg)] truncate max-w-[130px]">
                            {item.asal_surat || "Instansi Luar"}
                          </span>
                          <span data-status="neutral" className="text-xs px-1.5 py-0 rounded font-medium shrink-0">
                            {sifatText}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-1 mt-0.5 leading-tight">
                          {perihalText}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 align-top text-right shrink-0">
                        <Link
                          href={`/surat/masuk/create?id=${item.id}`}
                          aria-label={`Lihat atau edit disposisi surat agenda ${item.no_agenda || item.id}`}
                          title="Lihat / Edit Disposisi"
                          className="inline-flex items-center justify-center p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Tabel Mini Surat Keluar Terbaru */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3.5 md:px-4 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="kpg-support-icon w-8 h-8 rounded-xl border text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs md:text-sm text-[var(--ds-fg)]">
                Surat Keluar Terbaru
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                5 penomoran naskah dinas keluar terakhir
              </p>
            </div>
          </div>
          <Link
            href="/surat/keluar"
            className="text-xs font-bold text-[var(--ds-accent-fg)] hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="p-3.5 space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-10 w-full animate-pulse rounded-xl bg-[var(--ds-surface-muted)]" />
              ))}
            </div>
          ) : suratKeluarList.length === 0 ? (
            <div className="p-8 text-center text-[var(--ds-fg-muted)] text-xs font-medium">
              Belum ada data Surat Keluar terbaru.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--ds-border-subtle)] text-xs uppercase font-bold text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)]">
                <tr>
                  <th className="py-2 px-3">No Surat</th>
                  <th className="py-2 px-3">Tanggal</th>
                  <th className="py-2 px-3">Tujuan &amp; Perihal</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {suratKeluarList.map((item) => {
                  const isDraft = (item.status || "").toLowerCase() === "draft";
                  return (
                    <tr
                      key={item.id || item.no_surat}
                      className="transition-colors"
                    >
                      <td className="py-2.5 px-3 align-top max-w-[160px]">
                        <span className="font-semibold text-[var(--ds-fg)] block truncate">
                          {item.no_surat || "-"}
                        </span>
                        <span
                          data-status={isDraft ? "warning" : "success"}
                          className="text-xs px-1.5 py-0 rounded font-medium inline-block mt-0.5 capitalize"
                        >
                          {isDraft ? "Draft" : item.status || "Terdaftar"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-top text-[var(--ds-fg-muted)] whitespace-nowrap tabular-nums">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{formatDisplayDate(item.tanggal_surat)}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-top max-w-[200px]">
                        <span className="font-semibold text-[var(--ds-fg)] block truncate">
                          {item.tujuan_surat || "Tujuan Resmi"}
                        </span>
                        <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-1 mt-0.5 leading-tight">
                          {item.perihal || "-"}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 align-top text-right shrink-0">
                        <Link
                          href={
                            item.template_type || item.document_payload
                              ? `/surat/keluar/dinas?id=${item.id}&template=${item.template_type || "surat_dinas"}`
                              : `/surat/keluar/create?id=${item.id}`
                          }
                          aria-label={`Lihat detail surat keluar ${item.no_surat || item.id}`}
                          title="Lihat Detail Surat Keluar"
                          className="inline-flex items-center justify-center p-2 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-accent-soft)] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
