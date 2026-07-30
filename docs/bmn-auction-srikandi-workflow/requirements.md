# Requirements: BMN Auction Srikandi Workflow Alignment

## Background

BMN Auction currently lets operators work on lot numbers, valuation, signatories, and document printing in a mostly parallel order. Based on the current Srikandi workflow used by the operator, the application must guide users through a stricter document order before valuation and before external submission.

This document defines the required business flow. It is intentionally written before implementation so the next coding pass can align UI, backend validation, metadata, and document generation without guessing the intended process.

## Scope

In scope:

- Align BMN Auction batch detail workflow with the real Srikandi sequence.
- Separate Srikandi documents from manual signature documents.
- Move valuation and vehicle worksheet entry after the Panitia Penaksir Harga stage.
- Move Nota Dinas KSDAE and KPKNL submission documents after valuation by Tim Penilai.
- Update checklist/gating so users cannot accidentally skip required stages.
- Preserve the existing BMN Auction status model unless implementation proves a new status is required.

Out of scope for this specification:

- Changing non-auction BMN modules.
- Replacing all document templates.
- Integrating directly with Srikandi APIs. The current target is workflow guidance, metadata, print/sign tracking, and gating inside this app.

## Definitions

- Srikandi document: A document whose official process/order follows the Srikandi workflow.
- Manual TTD document: A document printed/generated from the app but manually signed outside Srikandi.
- Pre-valuation document: A document that must be completed before nilai taksiran/kertas kerja can be entered.
- Post-valuation document: A document that depends on nilai taksiran or must happen after Tim Penilai finishes valuation.
- Valuation: Nilai taksiran per asset, including kertas kerja kendaraan bermotor where applicable.
- Lock/submit: The app action that freezes assets and moves a batch out of DRAFT into the next official auction status.

## Required Workflow Order

The expected high-level order is:

1. Aset & Lot
2. Penghentian Penggunaan BMN
3. Koreksi Perubahan Kondisi BMN
4. Panitia Penghapusan Barang Milik Negara Berupa Alat Angkutan Bermotor Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur
5. Manual TTD supporting documents that are not Srikandi and are required before Panitia Penaksir Harga
6. Surat Tugas Pemeriksaan dan Penilaian BMN
7. Pembentukan Panitia Penaksir Harga Barang Milik Negara Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur
8. Nilai taksiran / kertas kerja by Tim Penilai
9. Nota Dinas KSDAE after valuation is complete
10. KPKNL submission/permohonan after valuation is complete
11. Lock/submit package, scheduling, auction result, and realization

Manual TTD supporting documents are not part of Srikandi, but they remain required before the Panitia Penaksir Harga/valuation stage. Valuation must not be available before the Panitia Penaksir Harga stage is complete.

## Document Channel Requirements

### Srikandi sequence

The app must treat these as the official Srikandi sequence:

1. Penghentian Penggunaan BMN
2. Koreksi Perubahan Kondisi BMN
3. Panitia Penghapusan Barang Milik Negara Berupa Alat Angkutan Bermotor Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur
4. Surat Tugas Pemeriksaan dan Penilaian BMN
5. Pembentukan Panitia Penaksir Harga Barang Milik Negara Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur

Each Srikandi item must have:

- A clear title matching operator wording.
- A phase/order number.
- A document key.
- A completion marker.
- A channel badge or label: `Srikandi`.

### Manual TTD documents

Existing documents that are not part of the official Srikandi sequence must not be hidden. They must be treated as manual TTD documents.

Default rule:

- Manual TTD documents that do not depend on valuation should appear before the Panitia Penaksir Harga/valuation step.
- Manual TTD documents that depend on valuation must appear after valuation.

Known post-valuation exceptions:

- Nota Dinas KSDAE must be after goods/assets are valued by Tim Penilai.
- KPKNL request/submission must be after goods/assets are valued by Tim Penilai.
- SPTJ Nilai Limit must be after goods/assets are valued because it depends on the resulting nilai limit/nilai taksiran.
- Any future document whose content includes nilai limit/nilai taksiran must be placed after valuation unless the operator explicitly confirms otherwise.

## Valuation Requirements

- Nilai taksiran must no longer be the second workflow tab immediately after Aset & Lot.
- Nilai taksiran must be gated until the pre-valuation Srikandi and manual TTD requirements are complete.
- For vehicle assets, the valuation input must use the full kertas kerja kendaraan format, not the simple three-comparable modal.
- For non-vehicle assets, the existing simple comparison worksheet may remain until a domain-specific template is provided.
- The app must keep per-asset `nilai_taksiran` and `kertas_kerja_data`.
- Existing saved kertas kerja data must remain readable.

## Lock/Submit Requirements

The package must not be locked/submitted until:

- At least one asset exists.
- All assets have lot numbers.
- Pre-valuation documents are complete.
- Valuation is complete for all assets.
- Post-valuation documents required for submission are complete.
- Required signatories/committees are selected.
- Required document numbers/dates are present.
- Metadata and asset/freeze snapshots remain valid.

The checklist must explain what is missing in the user-facing order, not in a technical order.

## Metadata Requirements

The implementation must persist enough data to support:

- Document order.
- Document channel: Srikandi or Manual TTD.
- Document phase: pre-valuation or post-valuation.
- Document completion status.
- Document number/date fields where applicable.
- Selected signatories and committee members.
- Valuation readiness.
- Backward compatibility with metadata schema version 1.

Existing locked packages with `metadata_schema_version = 1` must remain printable/readable.

## UX Requirements

- Users must see why valuation is locked before the required documents are done.
- Users must see which documents are Srikandi and which are manual TTD.
- Users must be able to complete or mark document progress in order.
- Next/previous navigation must follow the new workflow.
- Document cards must be grouped by stage to avoid a flat, confusing list.
- The UI must avoid forcing users to scroll through a long unrelated list before reaching the active stage.

## Non-Functional Requirements

- The workflow must be understandable to operators who follow Srikandi.
- The implementation must not touch `main`; work targets `develop/bmn-auction`.
- Existing document print components should be reused where possible.
- Backend gates must enforce the same rules as frontend gates.
- Tests must cover the new gating order.
- The implementation should minimize migration risk by adding metadata-compatible fields rather than rewriting existing locked metadata.

## Resolved Operator Decisions

- Existing support documents that are not in the Srikandi sequence remain Manual TTD and must be completed before Panitia Penaksir Harga unless they depend on valuation.
- `sp_tugas` is treated as Surat Pernyataan Kelancaran Tugas Dinas, not Surat Tugas Pemeriksaan dan Penilaian BMN.
- Surat Tugas Pemeriksaan dan Penilaian BMN has its own Srikandi workflow entry/template.
- SPTJ Nilai Limit, Nota Dinas KSDAE, and KPKNL request/submission are post-valuation documents.
- The current `nota_dinas` component maps to the Nota Dinas KSDAE workflow entry for this iteration.
- The current `permohonan_kpknl` component maps to the KPKNL request/submission workflow entry for this iteration.
