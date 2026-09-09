"use client";

import React from "react";
import { Eye, Download, Pencil, Trash2, Undo2, Users, MapPin, CheckSquare, Square } from "lucide-react";
import type { AssignmentLetter } from "../_lib/types";
import {
  getStatusStyle,
  getStatusLabel,
  getResolvedTempatTujuan,
  extractDalamRangka,
  formatAssignmentDateRange,
  formatShortSumberDana,
  formatFormalSumberDana,
} from "../_lib/status-helpers";

interface GmailRowItemProps {
  letter: AssignmentLetter;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (letter: AssignmentLetter) => void;
  onQuickDownload?: (letter: AssignmentLetter) => void;
  onQuickEdit?: (letter: AssignmentLetter) => void;
  onQuickDelete?: (id: string) => void;
  onQuickRestore?: (id: string) => void;
  isTrashView: boolean;
  isActive: boolean;
}

export function GmailRowItem({
  letter,
  isSelected,
  onToggleSelect,
  onClick,
  onQuickDownload,
  onQuickEdit,
  onQuickDelete,
  onQuickRestore,
  isTrashView,
  isActive,
}: GmailRowItemProps) {
  const isPending = letter.status === "pending" || letter.status === "draft";
  const employees = letter.employees || [];
  const primaryName = employees[0]?.nama_lengkap || "Tanpa Personel";
  const extraCount = employees.length > 1 ? employees.length - 1 : 0;
  const tujuan = getResolvedTempatTujuan(letter);
  const title = extractDalamRangka(letter.maksud_tujuan);
  const dateRange = formatAssignmentDateRange(
    letter.tanggal_mulai,
    letter.tanggal_selesai,
    letter.created_at
  );

  return (
    <div
      onClick={() => onClick(letter)}
      className={`group relative flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800/80 cursor-pointer transition-colors select-none text-xs ${
        isActive
          ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : isSelected
          ? "bg-blue-50/50 dark:bg-blue-900/10"
          : isPending
          ? "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
          : "bg-slate-50/30 dark:bg-zinc-900/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 text-slate-600 dark:text-zinc-400"
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-r" />
      )}

      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(letter.id);
        }}
        className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
      >
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </div>

      {/* Primary Personel */}
      <div className="w-36 md:w-44 shrink-0 truncate flex items-center gap-1.5 font-semibold">
        <span
          className={`truncate ${
            isPending
              ? "font-bold text-slate-900 dark:text-zinc-100"
              : "text-slate-700 dark:text-zinc-300 font-medium"
          }`}
          title={employees.map((e) => e.nama_lengkap).join(", ")}
        >
          {primaryName}
        </span>
        {extraCount > 0 && (
          <span className="shrink-0 text-[10px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-bold">
            +{extraCount}
          </span>
        )}
      </div>

      {/* Subject / Title & Snippet (Middle flex-1) */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
        {letter.template_type === "bmn-pemeriksaan" && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
            BMN
          </span>
        )}
        {letter.template_type === "plh" && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
            PLH
          </span>
        )}
        <span
          className={`truncate ${
            isPending
              ? "font-bold text-slate-900 dark:text-zinc-100"
              : "font-semibold text-slate-800 dark:text-zinc-200"
          }`}
          title={letter.maksud_tujuan || ""}
        >
          {title}
        </span>
      </div>

      {/* Dedicated Column: Tempat Tujuan (Aligned vertically down) */}
      <div className="w-36 md:w-44 lg:w-48 shrink-0 truncate hidden sm:flex items-center text-[11px]">
        {tujuan && tujuan !== "-" ? (
          <span className="text-slate-600 dark:text-zinc-400 font-medium truncate" title={tujuan}>
            {tujuan}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-zinc-600">-</span>
        )}
      </div>

      {/* Dedicated Column: Nomor Surat Tugas (Aligned vertically down) */}
      <div className="w-44 md:w-56 lg:w-64 shrink-0 font-mono text-[11px] truncate hidden sm:flex items-center">
        {letter.nomor_surat ? (
          <span
            className="text-slate-600 dark:text-zinc-300 font-semibold truncate hover:text-blue-600 transition-colors"
            title={letter.nomor_surat}
          >
            {letter.nomor_surat}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-zinc-600 italic">Belum ada nomor</span>
        )}
      </div>

      {/* Dedicated Column: Sumber Dana (DIPA / FOLU) */}
      <div className="w-14 shrink-0 hidden sm:flex items-center justify-start">
        {letter.sumber_dana ? (
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
            title={formatFormalSumberDana(letter.sumber_dana, letter.sumber_dana_other)}
          >
            {formatShortSumberDana(letter.sumber_dana)}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-zinc-600 text-[10px]">-</span>
        )}
      </div>

      {/* Dedicated Column: Status Badge (Left-aligned so DRAFT & DITERBITKAN align perfectly) */}
      <div className="w-28 shrink-0 hidden sm:flex items-center justify-start">
        <span
          className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getStatusStyle(
            letter.status
          )}`}
        >
          {getStatusLabel(letter.status)}
        </span>
      </div>

      {/* Dedicated Column: Rentang Tanggal Pelaksanaan Tugas OR Hover Action Buttons */}
      <div className="shrink-0 w-32 md:w-36 text-right flex items-center justify-end relative h-6">
        {/* Date range text (default visible, hidden on hover) */}
        <span
          className={`text-[11px] whitespace-nowrap transition-opacity group-hover:opacity-0 ${
            isPending
              ? "font-bold text-slate-800 dark:text-zinc-200"
              : "font-medium text-slate-500 dark:text-zinc-400"
          }`}
          title={
            letter.tanggal_mulai && letter.tanggal_selesai
              ? `${letter.tanggal_mulai} s/d ${letter.tanggal_selesai}`
              : undefined
          }
        >
          {dateRange}
        </span>

        {/* Hover action buttons (hidden by default, visible on hover) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 pl-2 rounded-lg shadow-sm transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(letter);
            }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
            title="Lihat naskah surat"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {onQuickDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickDownload(letter);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
              title="Unduh PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {onQuickEdit && letter.status !== "approved" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickEdit(letter);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors"
              title="Edit di Builder"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {isTrashView ? (
            onQuickRestore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickRestore(letter.id);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
                title="Pulihkan dokumen"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )
          ) : (
            onQuickDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickDelete(letter.id);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors"
                title="Pindahkan ke sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
