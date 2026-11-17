"use client";

import React, { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRightToLine,
  ClipboardPaste,
  FileCheck,
  Hash,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InlineTextFormat,
  handleInlineFormatShortcut,
  toggleInlineFormat,
} from "@/lib/letter-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  InlineFormatButtons,
  InlineFormatTarget,
  ParagrafTableBlock,
  getNormalizedTableColWidths,
  getTableRowCellsAndSpans,
  isNoColumnHeader,
  isTableSectionRow,
  normalizePdfCellText,
  startTableColumnDragResize,
} from "./SuratDinasDocument";

export interface TabelBlockEditorProps {
  block: ParagrafTableBlock;
  blockIdx: number;
  expanded?: boolean;
  onUpdateHeader: (colIdx: number, val: string) => void;
  onUpdateCell: (rowIdx: number, colIdx: number, val: string) => void;
  onUpdateSectionRow: (rowIdx: number, val: string) => void;
  onAddRow: () => void;
  onAddSectionRow: () => void;
  onMoveRow: (rowIdx: number, dir: -1 | 1) => void;
  onRemoveRow: (rowIdx: number) => void;
  onMergeRight: (rowIdx: number, colIdx: number) => void;
  onSplitCell: (rowIdx: number, colIdx: number) => void;
  onAddCol: () => void;
  onRemoveCol: (colIdx: number) => void;
  onToggleColumnNumbers: () => void;
  onChangeColWidths: (widths: number[]) => void;
  onResetColWidths: () => void;
  onApplyPaste: (raw: string, firstRowHeader: boolean) => boolean;
  onOpenExpand?: () => void;
  onRegisterFormatTarget?: (target: InlineFormatTarget) => void;
}

export function TabelBlockEditor({
  block,
  blockIdx,
  expanded = false,
  onUpdateHeader,
  onUpdateCell,
  onUpdateSectionRow,
  onAddRow,
  onAddSectionRow,
  onMoveRow,
  onRemoveRow,
  onMergeRight,
  onSplitCell,
  onAddCol,
  onRemoveCol,
  onToggleColumnNumbers,
  onChangeColWidths,
  onResetColWidths,
  onApplyPaste,
  onOpenExpand,
  onRegisterFormatTarget,
}: TabelBlockEditorProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const actionThRef = useRef<HTMLTableCellElement | null>(null);
  const activeTargetRef = useRef<InlineFormatTarget | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaderFirst, setPasteHeaderFirst] = useState(true);
  const [draggingCol, setDraggingCol] = useState<number | null>(null);

  const colWidths = getNormalizedTableColWidths(block);
  const actionColPct = expanded ? 8 : 15;
  const hasCustomWidths = Array.isArray(block.colWidths) && block.colWidths.length === block.headers.length;
  const focusCol = block.headers.length > 1 && isNoColumnHeader(block.headers[0] || "") ? 1 : 0;

  const bindFormatField = (onApply: (nextVal: string) => void) => ({
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target: InlineFormatTarget = { el: e.currentTarget, apply: onApply };
      activeTargetRef.current = target;
      onRegisterFormatTarget?.(target);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleInlineFormatShortcut(e, e.currentTarget.value, onApply);
    },
  });

  const triggerTableFormat = (format: InlineTextFormat) => {
    const target = activeTargetRef.current;
    if (target && target.el.isConnected) {
      toggleInlineFormat(target.el, target.el.value, format, target.apply);
      return;
    }
    const firstTextarea = tableRef.current?.querySelector<HTMLTextAreaElement>(
      `tbody textarea`
    );
    if (firstTextarea) {
      firstTextarea.focus();
      const firstCellTarget = activeTargetRef.current;
      if (firstCellTarget) {
        toggleInlineFormat(
          firstCellTarget.el,
          firstCellTarget.el.value,
          format,
          firstCellTarget.apply
        );
      }
    }
  };

  const handleNormalizedPaste = <T extends HTMLInputElement | HTMLTextAreaElement>(
    e: React.ClipboardEvent<T>,
    currentVal: string,
    singleLine: boolean,
    onApply: (nextVal: string) => void
  ) => {
    const raw = e.clipboardData.getData("text/plain");
    if (!raw || raw.includes("\t")) return;
    const normalized = normalizePdfCellText(raw);
    const cleaned = singleLine ? normalized.replace(/\n+/g, " ").trim() : normalized;
    if (cleaned === raw) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? currentVal.length;
    const end = el.selectionEnd ?? currentVal.length;
    const nextVal = currentVal.slice(0, start) + cleaned + currentVal.slice(end);
    onApply(nextVal);
    const caret = start + cleaned.length;
    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
  };

  const startHeaderDrag = (e: React.PointerEvent<HTMLDivElement>, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const actionPx = actionThRef.current?.getBoundingClientRect().width ?? 64;
    setDraggingCol(colIdx);
    startTableColumnDragResize({
      clientX: e.clientX,
      tableEl: tableRef.current,
      colIndex: colIdx,
      startWidths: colWidths,
      headers: block.headers,
      onWidthsChange: onChangeColWidths,
      subtractWidthPx: actionPx,
      onDragEnd: () => setDraggingCol(null),
    });
  };

  return (
    <div className="space-y-2">
      {/* Spreadsheet Grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800 bg-[var(--ds-surface)]">
        <table
          ref={tableRef}
          className={cn(
            "w-full border-collapse table-fixed text-xs",
            !expanded && block.headers.length > 4 && "min-w-[540px]"
          )}
        >
          <colgroup>
            {colWidths.map((w, cIdx) => (
              <col
                key={cIdx}
                style={{ width: `${((w * (100 - actionColPct)) / 100).toFixed(3)}%` }}
              />
            ))}
            <col style={{ width: `${actionColPct}%` }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100/90 dark:bg-zinc-800/80">
              {block.headers.map((hdr, cIdx) => {
                const narrowNo = cIdx === 0 && isNoColumnHeader(hdr);
                const canDragRight = cIdx < block.headers.length - 1;
                return (
                  <th
                    key={cIdx}
                    className="group/th border-b border-r border-slate-200 dark:border-zinc-700 p-0 text-left font-bold align-middle"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        data-plain=""
                        value={hdr}
                        onChange={(e) => onUpdateHeader(cIdx, e.target.value)}
                        onPaste={(e) =>
                          handleNormalizedPaste(e, hdr, true, (nextVal) =>
                            onUpdateHeader(cIdx, nextVal)
                          )
                        }
                        {...bindFormatField((v) => onUpdateHeader(cIdx, v))}
                        placeholder={`Kolom ${cIdx + 1}`}
                        aria-label={`Judul kolom ${cIdx + 1} tabel butir ${blockIdx + 1}`}
                        className={cn(
                          "h-8 w-full min-w-0 bg-transparent px-2 text-xs font-bold text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:bg-white dark:focus:bg-zinc-900",
                          narrowNo && "text-center px-1"
                        )}
                      />
                      {block.headers.length > 1 && (
                        <button
                          type="button"
                          data-plain-icon=""
                          onClick={() => onRemoveCol(cIdx)}
                          className="opacity-0 pointer-events-none group-hover/th:opacity-100 group-hover/th:pointer-events-auto group-focus-within/th:opacity-100 group-focus-within/th:pointer-events-auto focus:opacity-100 focus:pointer-events-auto absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 flex items-center justify-center rounded border border-slate-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:border-red-300 transition-opacity shadow-xs"
                          title={`Hapus kolom ${hdr || cIdx + 1}`}
                          aria-label={`Hapus kolom ${cIdx + 1} tabel butir ${blockIdx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {canDragRight && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Geser lebar kolom ${hdr || cIdx + 1} (${colWidths[cIdx]}%)`}
                          title={`Geser untuk atur lebar kolom (${colWidths[cIdx]}%)`}
                          onPointerDown={(e) => startHeaderDrag(e, cIdx)}
                          className={cn(
                            "absolute top-0 right-0 bottom-0 w-2 -mr-1 cursor-col-resize z-20 flex items-center justify-center touch-none select-none group/resize",
                            draggingCol === cIdx && "bg-sky-500/20"
                          )}
                        >
                          <span
                            className={cn(
                              "h-4 w-[2px] rounded-full transition-colors",
                              draggingCol === cIdx
                                ? "bg-sky-600 dark:bg-sky-400"
                                : "bg-transparent group-hover/th:bg-slate-300 dark:group-hover/th:bg-zinc-600 group-hover/resize:bg-sky-600"
                            )}
                          />
                          {draggingCol === cIdx && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 py-0 rounded bg-slate-900 text-white text-xs tabular-nums whitespace-nowrap pointer-events-none shadow-xs">
                              {colWidths[cIdx]}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              <th
                ref={actionThRef}
                className="border-b border-slate-200 dark:border-zinc-700 px-1 text-center text-xs font-medium text-[var(--ds-fg-muted)]"
                aria-label="Aksi baris"
              >
                Aksi
              </th>
            </tr>
            {block.showColumnNumbers && (
              <tr className="bg-white dark:bg-zinc-950">
                {block.headers.map((_, cIdx) => (
                  <th
                    key={cIdx}
                    className="border-b border-r border-slate-200 dark:border-zinc-800 py-1 px-2 text-center text-xs font-normal text-[var(--ds-fg-muted)] tabular-nums"
                  >
                    {cIdx + 1}
                  </th>
                ))}
                <th className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" />
              </tr>
            )}
          </thead>
          <tbody>
            {block.rows.map((row, rIdx) => {
              const isSection = isTableSectionRow(row);
              const { cells, spans } = isSection
                ? { cells: [] as string[], spans: [] as number[] }
                : getTableRowCellsAndSpans(row, block.headers.length);

              return (
                <tr key={rIdx} className="group/row last:[&>td]:border-b-0">
                  {isSection ? (
                    <td
                      colSpan={block.headers.length}
                      className="border-b border-r border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/70 p-0"
                    >
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-xs font-medium text-[var(--ds-fg-muted)] shrink-0">
                          Judul
                        </span>
                        <input
                          type="text"
                          data-plain=""
                          value={row.text}
                          onChange={(e) => onUpdateSectionRow(rIdx, e.target.value)}
                          onPaste={(e) =>
                            handleNormalizedPaste(e, row.text, true, (nextVal) =>
                              onUpdateSectionRow(rIdx, nextVal)
                            )
                          }
                          {...bindFormatField((v) => onUpdateSectionRow(rIdx, v))}
                          placeholder="Contoh: Senin, 23 November 2026"
                          aria-label={`Judul pembatas baris ${rIdx + 1} tabel butir ${blockIdx + 1}`}
                          className="h-8 w-full min-w-0 bg-transparent text-xs font-medium text-center text-[var(--ds-fg)] placeholder:text-[var(--ds-fg-muted)] focus:outline-none focus:bg-white dark:focus:bg-zinc-900 rounded px-2"
                        />
                      </div>
                    </td>
                  ) : (
                    block.headers.map((hdr, cIdx) => {
                      const span = spans[cIdx] ?? 1;
                      if (span <= 0) return null;
                      const cellVal = cells[cIdx] ?? "";
                      const isNo = cIdx === 0 && isNoColumnHeader(hdr) && span === 1;
                      const canMergeRight = cIdx + span < block.headers.length;
                      const canSplit = span > 1;
                      return (
                        <td
                          key={cIdx}
                          colSpan={span > 1 ? span : undefined}
                          className={cn(
                            "relative group/cell border-b border-r border-slate-200 dark:border-zinc-800 p-0 align-top transition-colors focus-within:bg-sky-50/40 dark:focus-within:bg-sky-950/20 focus-within:ring-1 focus-within:ring-inset focus-within:ring-[var(--ds-accent-solid)]",
                            canSplit && "bg-sky-50/30 dark:bg-sky-950/15"
                          )}
                        >
                          <textarea
                            data-plain=""
                            data-paragraf-focus={!expanded && rIdx === 0 && cIdx === focusCol ? blockIdx : undefined}
                            value={cellVal}
                            onChange={(e) => onUpdateCell(rIdx, cIdx, e.target.value)}
                            onPaste={(e) =>
                              handleNormalizedPaste(e, cellVal, false, (nextVal) =>
                                onUpdateCell(rIdx, cIdx, nextVal)
                              )
                            }
                            {...bindFormatField((v) => onUpdateCell(rIdx, cIdx, v))}
                            rows={Math.min(5, Math.max(1, cellVal.split("\n").length))}
                            placeholder={hdr || "Isi"}
                            aria-label={`${hdr || `Kolom ${cIdx + 1}`} baris ${rIdx + 1}`}
                            className={cn(
                              "block w-full min-h-8 resize-none border-0 bg-transparent px-2 py-1 text-xs leading-relaxed font-sans text-[var(--ds-fg)] placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none field-sizing-content",
                              isNo && "text-center tabular-nums px-1",
                              (canMergeRight || canSplit) && "pr-8"
                            )}
                          />
                          {(canMergeRight || canSplit) && (
                            <div
                              className={cn(
                                "absolute top-1 right-1 flex items-center gap-1 transition-opacity duration-150",
                                canSplit
                                  ? "opacity-100"
                                  : "opacity-0 pointer-events-none group-hover/cell:opacity-100 group-hover/cell:pointer-events-auto group-focus-within/cell:opacity-100 group-focus-within/cell:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
                              )}
                            >
                              {canSplit && (
                                <button
                                  type="button"
                                  data-plain-icon=""
                                  onClick={() => onSplitCell(rIdx, cIdx)}
                                  className="inline-flex items-center gap-1 px-1 py-0 h-5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs shadow-xs"
                                  title={`Pisahkan ${span} kolom`}
                                  aria-label={`Pisah sel kolom ${cIdx + 1} baris ${rIdx + 1} tabel butir ${blockIdx + 1}`}
                                >
                                  <Minimize2 className="w-3 h-3" />
                                  {expanded && <span>Pisah ({span})</span>}
                                </button>
                              )}
                              {canMergeRight && (
                                <button
                                  type="button"
                                  data-plain-icon=""
                                  onClick={() => onMergeRight(rIdx, cIdx)}
                                  className="inline-flex items-center gap-1 px-1 py-0 h-5 rounded border border-slate-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 text-[var(--ds-fg-muted)] hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300 text-xs shadow-xs"
                                  title="Gabung sel dengan kolom sebelah kanan"
                                  aria-label={`Gabung kolom ${cIdx + 1} ke kanan baris ${rIdx + 1} tabel butir ${blockIdx + 1}`}
                                >
                                  <ArrowRightToLine className="w-3 h-3" />
                                  {expanded && <span>Gabung</span>}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}
                  <td className="border-b border-slate-200 dark:border-zinc-800 p-1 align-middle text-center bg-slate-50/40 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-center gap-0">
                      <button
                        type="button"
                        data-plain-icon=""
                        onClick={() => onMoveRow(rIdx, 1)}
                        disabled={rIdx === block.rows.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded bg-transparent text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-slate-200/70 dark:hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        title="Geser baris ke bawah"
                        aria-label={`Geser baris ${rIdx + 1} tabel butir ${blockIdx + 1} ke bawah`}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        data-plain-icon=""
                        onClick={() => onRemoveRow(rIdx)}
                        disabled={block.rows.length <= 1}
                        className="w-6 h-6 flex items-center justify-center rounded bg-transparent text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        title={`Hapus baris ${rIdx + 1}`}
                        aria-label={`Hapus baris ${rIdx + 1} tabel butir ${blockIdx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Compact Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddRow}
            className="h-7 text-xs px-2 py-1 gap-1 rounded-lg border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 bg-white dark:bg-zinc-900 hover:bg-sky-50 dark:hover:bg-sky-950/60"
          >
            <Plus className="w-3 h-3" />
            Baris
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSectionRow}
            className="h-7 text-xs px-2 py-1 gap-1 rounded-lg border-slate-300 dark:border-zinc-700 text-[var(--ds-fg-secondary)] bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700"
            title="Tambah baris judul / pemisah selebar tabel (misal: Senin, 23 November 2026)"
          >
            <Plus className="w-3 h-3" />
            Judul / Pemisah
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddCol}
            className="h-7 text-xs px-2 py-1 gap-1 rounded-lg border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 bg-white dark:bg-zinc-900 hover:bg-sky-50 dark:hover:bg-sky-950/60"
          >
            <Plus className="w-3 h-3" />
            Kolom
          </Button>
          <button
            type="button"
            onClick={onToggleColumnNumbers}
            aria-pressed={Boolean(block.showColumnNumbers)}
            className={cn(
              "inline-flex items-center gap-1 h-7 text-xs px-2 py-1 rounded-lg border font-medium transition-colors",
              block.showColumnNumbers
                ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-300 font-semibold"
                : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
            )}
            title="Tampilkan atau sembunyikan baris angka penghitung kolom (1, 2, 3...) di bawah header"
          >
            <Hash className="w-3 h-3" />
            Nomor Kolom
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-1">
          <InlineFormatButtons
            compact
            labelContext={expanded ? `Tabel Dialog Butir ${blockIdx + 1}` : `Tabel Butir ${blockIdx + 1}`}
            onTrigger={triggerTableFormat}
          />
          {hasCustomWidths && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetColWidths}
              className="h-7 text-xs px-2 py-1 gap-1 rounded-lg bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)]"
              title="Kembalikan lebar kolom ke ukuran otomatis awal"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Lebar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPasteOpen((prev) => !prev);
              setPasteText("");
              setPasteHeaderFirst(true);
            }}
            className="h-7 text-xs px-2 py-1 gap-1 rounded-lg bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)]"
            title="Salin data langsung dari Excel / Google Sheets / Word ke tabel ini"
          >
            <ClipboardPaste className="w-3 h-3" />
            Tempel Excel/Word
          </Button>
          {!expanded && onOpenExpand && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenExpand}
              className="h-7 text-xs px-2 py-1 gap-1 rounded-lg bg-white dark:bg-zinc-900 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60"
              title="Buka editor tabel dalam layar lebar agar nyaman mengedit 4+ kolom & mengatur lebar"
            >
              <Maximize2 className="w-3 h-3" />
              Perluas
            </Button>
          )}
        </div>
      </div>

      {pasteOpen && (
        <div className="p-2 bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-800 rounded-lg space-y-2">
          <p className="text-xs text-[var(--ds-fg-muted)]">
            Salin sel langsung dari Excel, Google Sheets, atau tabel Word (otomatis dipisah Tab), lalu klik Terapkan:
          </p>
          <Textarea
            aria-label="Tempel data tabel dari Excel atau Word"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            placeholder={"No\tNama\tKeterangan\n1\tBudi Santoso\tPeserta\n2\tSiti Aminah\tNarasumber"}
            className="text-xs font-mono bg-slate-50 dark:bg-zinc-950 leading-relaxed rounded-lg"
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--ds-fg-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pasteHeaderFirst}
                onChange={(e) => setPasteHeaderFirst(e.target.checked)}
                className="rounded border-slate-300"
              />
              Baris pertama adalah judul kolom
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPasteOpen(false)}
                className="h-7 text-xs px-2 rounded-lg"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (onApplyPaste(pasteText, pasteHeaderFirst)) {
                    setPasteOpen(false);
                    setPasteText("");
                  }
                }}
                className="h-7 text-xs px-2 gap-1 rounded-lg bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[color:var(--ds-accent-on-solid)] font-semibold"
              >
                <FileCheck className="w-3 h-3" />
                Terapkan Tabel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
