"use client";

import React from "react";
import { Eye, Download, Pencil, Trash2, Undo2, Users, MapPin, CheckCircle2 } from "lucide-react";
import type { AssignmentLetter } from "../_lib/types";
import {
  getStatusStyle,
  getStatusLabel,
  needsBuilderCompletion,
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
  onQuickApprove?: (letter: AssignmentLetter) => void;
  onQuickEdit?: (letter: AssignmentLetter) => void;
  onQuickDelete?: (id: string) => void;
  onQuickRestore?: (id: string) => void;
  onQuickForceDelete?: (id: string) => void;
  isTrashView: boolean;
  isActive: boolean;
}

export function GmailRowItem({
  letter,
  isSelected,
  onToggleSelect,
  onClick,
  onQuickDownload,
  onQuickApprove,
  onQuickEdit,
  onQuickDelete,
  onQuickRestore,
  onQuickForceDelete,
  isTrashView,
  isActive,
}: GmailRowItemProps) {
  const isPending = letter.status === "pending" || letter.status === "draft";
  const needsCompletion = needsBuilderCompletion(letter);
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
      className={`st-letter-row group relative flex items-center gap-3 px-4 py-2.5 border-b border-[var(--ds-border-subtle)] cursor-pointer transition-colors select-none text-xs ${
        isActive
          ? "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)]"
          : isSelected
          ? "bg-[var(--ds-accent-soft)]"
          : isPending
          ? "bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)]"
          : "bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ds-accent-fg)] rounded-r" />
      )}

      <input
        type="checkbox"
        checked={isSelected}
        aria-label={`Pilih surat ${letter.nomor_surat || title}`}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggleSelect(letter.id)}
        className="size-4 shrink-0"
      />

      {/* Primary Personel */}
      <div className="st-row-person w-36 shrink-0 truncate flex items-center gap-1.5 font-semibold">
        <span
          className={`truncate ${
            isPending
              ? "font-bold text-[var(--ds-fg)]"
              : "text-[var(--ds-fg-muted)] font-medium"
          }`}
          title={employees.map((e) => e.nama_lengkap).join(", ")}
        >
          {primaryName}
        </span>
        {extraCount > 0 && (
          <span className="shrink-0 text-xs text-[var(--ds-fg-muted)] bg-[var(--ds-surface-muted)] px-1.5 py-0.2 rounded font-bold">
            +{extraCount}
          </span>
        )}
      </div>

      {/* Subject / Title & Snippet (Middle flex-1) */}
      <div className="st-row-subject flex-1 min-w-0 flex items-center gap-2">
        {letter.template_type === "bmn-pemeriksaan" && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]">
            BMN
          </span>
        )}
        {letter.template_type === "plh" && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
            PLH
          </span>
        )}
        <button
          type="button"
          aria-current={isActive ? "true" : undefined}
          className="min-w-0 truncate rounded px-1 text-left font-semibold text-[var(--ds-fg)] hover:text-[var(--ds-accent-fg)]"
          title={letter.maksud_tujuan || ""}
          onClick={(event) => { event.stopPropagation(); onClick(letter); }}
        >
          {title}
        </button>
      </div>

      {/* Dedicated Column: Tempat Tujuan (Aligned vertically down) */}
      <div className="st-row-meta w-28 xl:w-36 shrink-0 truncate hidden sm:flex items-center text-xs">
        {tujuan && tujuan !== "-" ? (
          <span className="text-[var(--ds-fg-muted)] font-medium truncate" title={tujuan}>
            {tujuan}
          </span>
        ) : (
          <span className="text-[var(--ds-fg-muted)]">-</span>
        )}
      </div>

      {/* Dedicated Column: Nomor Surat Tugas (Aligned vertically down) */}
      <div className="st-row-meta w-40 xl:w-48 shrink-0 font-mono text-xs truncate hidden sm:flex items-center">
        {letter.nomor_surat ? (
          <span
            className="text-[var(--ds-fg-muted)] font-semibold truncate hover:text-[var(--ds-accent-fg)] transition-colors"
            title={letter.nomor_surat}
          >
            {letter.nomor_surat}
          </span>
        ) : (
          <span className="text-[var(--ds-fg-muted)] italic">Belum ada nomor</span>
        )}
      </div>

      {/* Dedicated Column: Sumber Dana (DIPA / FOLU) */}
      <div className="st-row-meta w-14 shrink-0 hidden sm:flex items-center justify-start">
        {letter.sumber_dana ? (
          <span
            className="px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]"
            title={formatFormalSumberDana(letter.sumber_dana, letter.sumber_dana_other)}
          >
            {formatShortSumberDana(letter.sumber_dana)}
          </span>
        ) : (
          <span className="text-[var(--ds-fg-muted)] text-xs">-</span>
        )}
      </div>

      {/* Dedicated Column: Status Badge (Left-aligned so DRAFT & DITERBITKAN align perfectly) */}
      <div className="st-row-status max-w-36 shrink-0 flex items-center justify-start">
        <span
          className={`px-2 py-0.5 rounded-full border text-xs font-black uppercase tracking-wider ${getStatusStyle(
            letter.status
          )}`}
        >
          {getStatusLabel(letter.status)}
        </span>
      </div>

      {/* Dedicated Column: Rentang Tanggal Pelaksanaan Tugas OR Hover Action Buttons */}
      <div className="st-row-actions shrink-0 flex flex-wrap items-center justify-end gap-1 text-right">
        {/* Date range text (default visible, hidden on hover) */}
        <span
          className={`text-xs whitespace-nowrap  ${
            isPending
              ? "font-bold text-[var(--ds-fg)]"
              : "font-medium text-[var(--ds-fg-muted)]"
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
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(letter);
            }}
            className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors"
            title="Lihat naskah surat"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {onQuickApprove && !isTrashView && letter.status === "pending" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickApprove(letter);
              }}
              className="p-1 hover:bg-[var(--ds-status-success-bg)] rounded text-[var(--ds-status-success-fg)] transition-colors"
              title={needsCompletion ? "Lengkapi di Builder" : "Setujui & Terbitkan Surat Tugas"}
              aria-label={needsCompletion ? "Lengkapi di Builder" : "Setujui & Terbitkan Surat Tugas"}
            >
              {needsCompletion ? <Pencil className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {onQuickDownload && Boolean(letter.file_surat_path) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickDownload(letter);
              }}
              className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] transition-colors"
              title="Unduh Dokumen Dasar"
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
              className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-warning-fg)] transition-colors"
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
                className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] transition-colors"
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
                  onQuickDelete?.(letter.id);
                }}
                className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] transition-colors"
                title="Pindahkan ke sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
          {isTrashView && onQuickForceDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickForceDelete(letter.id);
              }}
              className="p-1 hover:bg-[var(--ds-status-danger-bg)] rounded text-[var(--ds-status-danger-fg)] transition-colors cursor-pointer"
              title="Hapus permanen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {false && onQuickDelete && ((
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickDelete?.(letter.id);
                }}
                className="p-1 hover:bg-[var(--ds-surface-muted)] rounded text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] transition-colors"
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
