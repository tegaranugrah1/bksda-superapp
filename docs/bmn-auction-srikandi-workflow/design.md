# Design: BMN Auction Srikandi Workflow Alignment

## Current State Summary

Current frontend flow in `frontend/src/app/bmn/auction-batches/[id]/page.tsx`:

1. Aset & Lot
2. Nilai Taksiran
3. Dokumen & Tanda Tangan
4. Pusat Dokumen
5. Jadwal Lelang, when not DRAFT
6. Realisasi & Hasil, when advanced enough
7. Riwayat Audit

Current backend lock checklist in `backend/app/Modules/Bmn/Services/AuctionBatchCompletenessChecker.php` requires all valuations before lock. This is technically correct for final lock, but the UI currently presents valuation too early in the operator workflow.

Current document list in `DocumentsCenterTab.tsx` is flat and mixes Srikandi, manual TTD, pre-valuation, and post-valuation documents.

Current signatory UI in `SignatoriesDocumentsTab.tsx` mixes signatory selection, committee selection, document numbers, checklist, and the final lock button.

## Desired Information Architecture

Replace the flat mental model with ordered stages:

1. Aset & Lot
2. Dokumen Awal
3. Panitia & Surat Tugas
4. Nilai Taksiran
5. Dokumen Setelah Taksiran
6. Kunci & Ajukan
7. Jadwal Lelang
8. Realisasi & Hasil
9. Riwayat Audit

The exact tab labels can be shortened in UI, but the order must communicate that valuation happens after Panitia Penaksir Harga is formed.

## Document Registry

Add a shared document registry used by frontend and backend. At minimum each document needs:

- `key`
- `title`
- `channel`: `srikandi` or `manual_ttd`
- `phase`: `pre_valuation`, `valuation`, `post_valuation`, `auction`
- `order`
- `requires_completion_before`: optional gate key
- `requires_valuation`: boolean
- `rootId`: frontend print root id when printable
- `numberKey`: optional metadata document number key
- `dateKey`: optional metadata document date key

Proposed initial registry mapping:

| Key | Current component/key | Channel | Phase | Notes |
| --- | --- | --- | --- | --- |
| `sk_penghentian` | `sk_penghentian` | Srikandi | pre_valuation | Penghentian Penggunaan BMN |
| `ba_koreksi` | `ba_koreksi` | Srikandi | pre_valuation | Koreksi Perubahan Kondisi BMN |
| `sk_panitia_penghapusan` | `sk_panitia` | Srikandi | pre_valuation | Panitia Penghapusan BMN kendaraan bermotor |
| `surat_tugas_pemeriksaan_penilaian` | `SuratTugasPemeriksaanPenilaianDocument` | Srikandi | pre_valuation | Dedicated Surat Tugas Pemeriksaan dan Penilaian BMN template |
| `sk_panitia_penaksir_harga` | `sk_tim_penilai` | Srikandi | pre_valuation | Pembentukan Panitia Penaksir Harga |
| `sk_kebenaran` | `sk_kebenaran` | Manual TTD | pre_valuation | Existing manual supporting doc |
| `sptjm` | `sptjm` | Manual TTD | pre_valuation | Existing manual supporting doc |
| `sp_kelancaran_tugas` | `sp_tugas` | Manual TTD | pre_valuation | Current title suggests statement, not Srikandi surat tugas |
| `ba_pemeriksaan` | `ba_pemeriksaan` | Manual TTD | pre_valuation | Existing manual supporting doc before Panitia Penaksir Harga |
| `nilai_taksiran` | `ValuationTab` | App workflow | valuation | Enabled only after pre-valuation gate |
| `sptj_limit` | `sptj_limit` | Manual TTD | post_valuation | Depends on nilai limit |
| `nota_dinas_ksdae` | `nota_dinas` | Srikandi | post_valuation | Must appear after Tim Penilai valuation |
| `permohonan_kpknl` | `permohonan_kpknl` | External/KPKNL | post_valuation | Must appear after Tim Penilai valuation |

The registry should be the source of truth for document ordering, grouping, and checklist labels.

## Frontend Design

### Workflow navigation

`BmnAuctionBatchDetailPage` should derive tabs from workflow stage definitions instead of a hard-coded simple list.

Suggested tabs:

- `assets`: Aset & Lot
- `pre-docs`: Dokumen Awal
- `valuation`: Nilai Taksiran
- `post-docs`: Setelah Taksiran
- `submit`: Kunci & Ajukan
- `schedule`: Jadwal Lelang, available after DIAJUKAN
- `realization`: Realisasi & Hasil, available after JADWAL_DITETAPKAN or lelang ulang path
- `audit`: Riwayat Audit

If the team wants fewer tabs, combine `pre-docs` and `submit`, but keep the stage cards visibly separated.

### Gating behavior

When a tab is not ready:

- It can remain visible but disabled, or open to a read-only blocked state.
- The blocked state must list missing prerequisites.
- The `Lanjut ke ...` button must skip impossible states only when there is a clear reason, otherwise show disabled with explanation.

Example:

- `Nilai Taksiran` shows locked card: "Selesaikan SK Panitia Penaksir Harga terlebih dahulu."
- `Dokumen Setelah Taksiran` shows locked card: "Isi nilai taksiran seluruh aset terlebih dahulu."
- `Kunci & Ajukan` shows checklist grouped by stage.

### Dokumen Awal tab

Use grouped document cards:

- Srikandi sequence
- Manual TTD sebelum penaksiran

Each card should show:

- Document title.
- Channel badge.
- Order number.
- Status: belum disiapkan, dicetak, ditandatangani, selesai.
- Number/date fields when required.
- Print button if a template exists.
- Manual completion checkbox or action.

### Nilai Taksiran tab

Keep the recently integrated vehicle worksheet.

Add a gate:

- If pre-valuation stage incomplete, show blocked state and do not allow editing.
- If complete, allow per-asset valuation and worksheet editing.

For vehicle assets:

- Use `KertasKerjaAssetSection`.
- Save `nilai_taksiran` and `kertas_kerja_data`.

For non-vehicle assets:

- Keep current simple worksheet until another template is specified.

### Dokumen Setelah Taksiran tab

Show post-valuation documents only after all asset valuations are valid:

- SPTJ Nilai Limit.
- Nota Dinas KSDAE.
- Permohonan/Nota KPKNL.

If valuation is incomplete, show blocked state with missing assets.

### Kunci & Ajukan tab

Move final lock action out of the old `Dokumen & Tanda Tangan` form and into a dedicated final submission stage.

Checklist groups:

- Aset & lot
- Dokumen awal
- Nilai taksiran
- Dokumen setelah taksiran
- Metadata/signatories
- Snapshot/contracts

## Backend Design

### Metadata schema

Keep schema version 1 readable. Introduce schema version 2 for new workflow metadata.

Suggested structure:

```json
{
  "schema_version": 2,
  "workflow": {
    "documents": {
      "sk_penghentian": {
        "status": "completed",
        "channel": "srikandi",
        "completed_at": "2026-06-24T00:00:00Z",
        "number": "...",
        "date": "2026-06-24"
      }
    },
    "pre_valuation_complete": true,
    "valuation_complete": true,
    "post_valuation_complete": true
  },
  "signatories": {},
  "committees": {},
  "document_numbers": {},
  "document_dates": {}
}
```

Store draft workflow metadata before lock. Do not depend on `transition(status=DRAFT)` because `TransitionAuctionBatchRequest` currently does not allow `DRAFT`.

### Draft metadata endpoint

Add a dedicated endpoint such as:

- `PATCH /bmn/auction-batches/{id}/draft-metadata`
- Or `PUT /bmn/auction-batches/{id}/workflow`

It should update:

- selected signatories
- committee IDs
- document progress
- document numbers/dates
- workflow status flags

It must only work while batch status is `DRAFT`.

### Checklist service

Refactor `AuctionBatchCompletenessChecker` to compute grouped checklist sections:

- assets
- pre_valuation_documents
- valuation
- post_valuation_documents
- final_submission
- contracts

The old flat `items` array can remain for compatibility, but the frontend should use grouped data if available.

### Valuation guard

`AuctionBatchService::updateValuation` should reject valuation edits if pre-valuation prerequisites are incomplete.

Exception:

- Existing data repair/admin override can be added later if needed.

### Lock guard

`lockAndSubmit` should require:

- pre-valuation complete
- all valuations positive
- post-valuation complete
- final metadata valid

## Compatibility

- Existing locked schema version 1 batches must keep printing.
- Existing draft batches without workflow metadata should be treated as incomplete for new gates but should not crash.
- Existing `kertas_kerja_data` must continue loading because vehicle worksheet integration already supports fallback data.

## Risks

- Misclassifying a manual TTD document as Srikandi may confuse operators.
- Some current component names do not match real document titles.
- Existing frontend silently posts `status: DRAFT` to transition endpoint; this likely does not persist reliably and should be replaced.
- If backend and frontend gates diverge, users may see available actions that fail on submit.
