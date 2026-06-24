# Tasks: BMN Auction Srikandi Workflow Alignment

This task list is intentionally detailed so a future AI coding session can continue without re-discovering the workflow from chat history.

## Ground Rules

- Work from `develop/bmn-auction`, not `main`.
- Use a feature branch.
- Do not open a PR until requested.
- Keep schema version 1 locked batches readable.
- Add tests for backend workflow gates.
- Run frontend lint and typecheck before committing.
- Prefer reusing existing document components.

## Resolved Operator Decisions

- Existing support documents that are not in the Srikandi sequence are Manual TTD and are completed before Panitia Penaksir Harga unless they depend on valuation.
- `sp_tugas` is Surat Pernyataan Kelancaran Tugas Dinas, not Surat Tugas Pemeriksaan dan Penilaian BMN.
- Surat Tugas Pemeriksaan dan Penilaian BMN uses a dedicated workflow entry/template.
- SPTJ Nilai Limit, Nota Dinas KSDAE, and KPKNL submission are post-valuation documents after Tim Penilai completes valuation.

## Phase 0 - Confirm Current Baseline

1. Run `git status --short --branch` and confirm the branch is based on `develop/bmn-auction`.
2. Inspect current frontend workflow in:
   - `frontend/src/app/bmn/auction-batches/[id]/page.tsx`
   - `frontend/src/app/bmn/auction-batches/[id]/_components/SignatoriesDocumentsTab.tsx`
   - `frontend/src/app/bmn/auction-batches/[id]/_components/DocumentsCenterTab.tsx`
   - `frontend/src/app/bmn/auction-batches/[id]/_components/ValuationTab.tsx`
3. Inspect current backend gates in:
   - `backend/app/Modules/Bmn/Services/AuctionBatchCompletenessChecker.php`
   - `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
   - `backend/app/Modules/Bmn/Services/AuctionBatchMetadataBuilder.php`
   - `backend/app/Modules/Bmn/Requests/TransitionAuctionBatchRequest.php`
4. Run existing validation before changes:
   - frontend: `npm run lint -- --max-warnings=0`
   - frontend: `npx tsc --noEmit`
   - backend: run the BMN auction feature tests if available.

## Phase 1 - Create Document Workflow Registry

1. Add a shared backend document workflow registry.
   - Suggested file: `backend/app/Modules/Bmn/Services/AuctionBatchDocumentWorkflow.php`
   - It should expose ordered definitions for all BMN Auction documents.
2. Each document definition must include:
   - `key`
   - `title`
   - `channel`: `srikandi`, `manual_ttd`, `external`
   - `phase`: `pre_valuation`, `valuation`, `post_valuation`, `auction`
   - `order`
   - `requires_valuation`
   - `number_key`
   - `date_key`
   - `required_for_valuation`
   - `required_for_submit`
3. Add matching frontend registry.
   - Suggested file: `frontend/src/app/bmn/auction-batches/[id]/_lib/document-workflow.ts`
   - Keep labels and order in sync with backend.
4. Initial registry mapping:
   - `sk_penghentian`
     - Title: `Penghentian Penggunaan BMN`
     - Current component: `SkPenghentianDocument`
     - Channel: `srikandi`
     - Phase: `pre_valuation`
   - `ba_koreksi`
     - Title: `Koreksi Perubahan Kondisi BMN`
     - Current component: `CorrectionDocument as BaKoreksiDocument`
     - Channel: `srikandi`
     - Phase: `pre_valuation`
   - `sk_panitia_penghapusan`
     - Current key/component: `sk_panitia` / `SkPanitiaDocument`
     - Title: `Panitia Penghapusan Barang Milik Negara Berupa Alat Angkutan Bermotor Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur`
     - Channel: `srikandi`
     - Phase: `pre_valuation`
   - `surat_tugas_pemeriksaan_penilaian`
     - Current component: verify. Do not assume current `sp_tugas` is this.
     - Title: `Surat Tugas Pemeriksaan dan Penilaian BMN`
     - Channel: `srikandi`
     - Phase: `pre_valuation`
   - `sk_panitia_penaksir_harga`
     - Current key/component: likely `sk_tim_penilai` / `SkTimPenilaiDocument`
     - Title: `Pembentukan Panitia Penaksir Harga Barang Milik Negara Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur`
     - Channel: `srikandi`
     - Phase: `pre_valuation`
   - `nilai_taksiran`
     - Current component: `ValuationTab`
     - Channel: `app`
     - Phase: `valuation`
   - `nota_dinas_ksdae`
     - Current component: verify whether current `NotaDinasDocument` is KSDAE nota dinas.
     - Phase: `post_valuation`
     - Requires valuation: true
   - `permohonan_kpknl`
     - Current component: `PermohonanKpknlDocument`
     - Phase: `post_valuation`
     - Requires valuation: true
5. Manual TTD documents to map:
   - `sk_kebenaran`
   - `sptjm`
   - `sp_tugas` as Surat Pernyataan Kelancaran Tugas Dinas, not the Srikandi Surat Tugas Pemeriksaan dan Penilaian BMN
   - `ba_pemeriksaan`
   - `sptj_limit` as post-valuation because it depends on nilai limit.
6. Add unit tests for backend registry order if test style supports it.

## Phase 2 - Add Draft Workflow Metadata Persistence

1. Do not keep using `transition(status=DRAFT)` for autosave.
   - `TransitionAuctionBatchRequest` currently does not allow `DRAFT`.
   - Existing frontend `handleFieldChange` in `SignatoriesDocumentsTab.tsx` posts `status: DRAFT`; replace this.
2. Add backend request class:
   - `UpdateAuctionBatchDraftMetadataRequest`
3. Add backend service method:
   - `AuctionBatchService::updateDraftMetadata(string $batchId, array $payload, ?string $actorId = null)`
4. Add route:
   - `PATCH /bmn/auction-batches/{id}/draft-metadata`
   - Permission: `bmn.auction.update`
   - Only allowed while status is `DRAFT`
5. Supported payload fields:
   - `kepala_balai_id`
   - `signatories.panitia`
   - `signatories.tim_penilai`
   - `signatories.pemeriksa`
   - `document_numbers`
   - `document_dates`
   - `workflow.documents`
6. Store draft metadata in `bmn_auction_batches.metadata`.
7. If existing `metadata.schema_version` is missing, initialize a draft-compatible metadata object.
8. Preserve existing keys:
   - `signatories_raw`
   - `document_numbers`
   - `document_dates`
   - Any locked schema version 1 fields
9. Add audit event when draft metadata is updated.
   - If no enum exists, add a safe event action such as `DRAFT_METADATA_UPDATED`.
10. Backend tests:
   - Can update draft metadata on DRAFT.
   - Cannot update draft metadata after DIAJUKAN.
   - Existing metadata keys are not dropped.
   - Invalid document key is rejected.

## Phase 3 - Refactor Backend Checklist And Gates

1. Refactor `AuctionBatchCompletenessChecker`.
2. Keep existing response shape:
   - `complete`
   - `items`
3. Add grouped response:
   - `sections`
   - Each section has `key`, `label`, `complete`, `items`.
4. New sections:
   - `assets_lot`
   - `pre_valuation_documents`
   - `valuation`
   - `post_valuation_documents`
   - `final_submission`
   - `contracts`
5. Move valuation check:
   - Still required for final submit.
   - Not required for pre-valuation document stages.
6. Add `can_enter_valuation` boolean.
   - True only when required pre-valuation documents are complete.
7. Add `can_complete_post_valuation_documents` boolean.
   - True only when all assets have valid valuation.
8. Add `can_lock_submit` boolean.
   - True only when all required sections are complete.
9. Update `AuctionBatchService::updateValuation`.
   - Before saving valuation, check pre-valuation document gate.
   - If incomplete, throw validation error explaining the missing pre-valuation docs.
10. Update `AuctionBatchService::lockAndSubmit`.
   - It must require all sections, including post-valuation documents.
11. Backend tests:
   - Cannot enter valuation before Panitia Penaksir Harga stage is complete.
   - Can enter valuation after pre-valuation docs complete.
   - Cannot lock submit when valuation missing.
   - Cannot lock submit when Nota Dinas KSDAE/KPKNL post-valuation docs missing.
   - Can lock submit when all required sections complete.

## Phase 4 - Update Metadata Builder

1. Update `AuctionBatchMetadataBuilder`.
2. Build schema version 2 metadata for new locks.
3. Include:
   - `workflow.documents`
   - `workflow.pre_valuation_complete`
   - `workflow.valuation_complete`
   - `workflow.post_valuation_complete`
   - `signatories`
   - `committees`
   - `document_numbers`
   - `document_dates`
   - `print_config`
4. Preserve ability to print old schema version 1 batches.
5. Update `AuctionBatchResource`.
   - Expose checklist flags if useful:
     - `workflow_readiness`
     - Or rely on `/checklist` endpoint only.
6. Tests:
   - Schema version 2 contains workflow document progress.
   - Schema version 1 document context still works.

## Phase 5 - Rework Frontend Workflow Tabs

1. Update `frontend/src/app/bmn/auction-batches/[id]/page.tsx`.
2. Replace hard-coded tabs:
   - Current order: `assets`, `valuation`, `signatories`, `docs-center`, ...
3. New suggested order:
   - `assets`: Aset & Lot
   - `pre-docs`: Dokumen Awal
   - `valuation`: Nilai Taksiran
   - `post-docs`: Setelah Taksiran
   - `submit`: Kunci & Ajukan
   - `schedule`: Jadwal Lelang
   - `realization`: Realisasi & Hasil
   - `audit`: Riwayat Audit
4. If product wants fewer tabs:
   - Keep `docs-center`, but it must render stage groups and tab navigation must still gate valuation correctly.
5. Update `Lanjut ke ...` button logic.
   - It should follow new workflow order.
   - It should show disabled state with explanation when next stage is blocked.
6. Add helper functions:
   - `getWorkflowTabs(batch, checklist)`
   - `getBlockedReason(tab, checklist)`
7. Frontend acceptance:
   - Nilai Taksiran no longer appears immediately after Aset & Lot as an active editable step.
   - User sees document stages before valuation.

## Phase 6 - Replace SignatoriesDocumentsTab Responsibilities

Current `SignatoriesDocumentsTab` does too much:

- signatory picking
- committee picking
- document numbers
- checklist
- lock action

Refactor into smaller components:

1. `SignatoryPickerSection`
   - Kepala Balai searchable picker.
   - Panitia Penghapusan multi-select.
   - Tim Penilai/Penaksir multi-select.
   - Pemeriksa multi-select.
2. `DocumentNumberDateSection`
   - Number/date fields by document key.
   - Uses document registry.
3. `DocumentWorkflowSection`
   - Ordered document cards.
   - Status controls.
4. `FinalSubmitPanel`
   - Grouped checklist.
   - Lock submit action.

Replace autosave:

- Use the new draft metadata endpoint.
- Debounce autosave where appropriate.
- Show save status if useful.

## Phase 7 - Rework Documents Center

1. Update `DocumentsCenterTab.tsx`.
2. Stop using a flat `documents` array as the only source of display order.
3. Render documents from frontend registry grouped by:
   - Srikandi pre-valuation
   - Manual TTD pre-valuation
   - Valuation
   - Post-valuation: Nota Dinas KSDAE and KPKNL
   - Auction/schedule/final
4. Keep existing print component rendering.
5. Verify current component mapping:
   - `NotaDinasDocument` title and content. If it is not Nota Dinas KSDAE, add/rename template.
   - `SpTugasDocument`. If it is not Surat Tugas Pemeriksaan dan Penilaian BMN, add a new component for that document.
6. Add badges:
   - `Srikandi`
   - `Manual TTD`
   - `Setelah Taksiran`
   - `Menunggu Nilai Taksiran`
7. Disable post-valuation document print buttons until valuation complete.
8. Disable valuation-dependent document fields until valuation complete.
9. Ensure print event logging still calls `recordPrintEvent`.

## Phase 8 - Gate Valuation UI

1. Update `ValuationTab.tsx`.
2. If `checklist.can_enter_valuation` is false:
   - Render blocked state.
   - List missing pre-valuation documents.
   - Provide navigation/action to Dokumen Awal.
3. If allowed:
   - Keep current valuation table.
   - Keep vehicle worksheet integration.
4. Backend must also enforce the same rule.
5. Ensure direct API calls to update valuation before gate fail.
6. Frontend tests/manual checks:
   - Open valuation before docs complete: blocked state.
   - Complete docs: valuation table becomes editable.

## Phase 9 - Post-Valuation Documents

1. Add/adjust a post-valuation tab/section.
2. Required documents after Tim Penilai finishes valuation:
   - Nota Dinas KSDAE.
   - KPKNL submission/permohonan.
3. `sptj_limit` is post-valuation because it depends on nilai limit.
4. Add gating:
   - If any asset valuation missing, show blocked state.
   - If complete, allow document print/status completion.
5. Include valuation total in post-valuation document context.

## Phase 10 - Tests

Backend feature tests:

1. Draft metadata update endpoint:
   - stores document workflow status
   - rejects invalid document keys
   - rejects updates when not DRAFT
2. Checklist:
   - pre-valuation docs incomplete blocks `can_enter_valuation`
   - pre-valuation docs complete allows valuation
   - valuation incomplete blocks post-valuation docs and lock
   - post-valuation docs incomplete blocks lock
3. Valuation endpoint:
   - rejects before pre-valuation gate
   - succeeds after gate
4. Lock:
   - rejects incomplete document workflow
   - succeeds with complete workflow and valid assets
5. Metadata:
   - lock writes schema version 2
   - old schema version 1 document context remains readable

Frontend validation:

1. `npm run lint -- --max-warnings=0`
2. `npx tsc --noEmit`
3. Manual browser checks:
   - Open a DRAFT auction batch.
   - Verify tab order.
   - Verify valuation is blocked before pre-valuation docs.
   - Mark pre-valuation docs complete.
   - Verify valuation opens.
   - Save vehicle worksheet.
   - Verify post-valuation docs unlock.
   - Verify final submit checklist groups are readable.

## Phase 11 - Migration And Backward Compatibility

1. No DB migration is required if metadata JSON is enough.
2. If adding columns, create migration with nullable columns only.
3. Existing locked schema 1 packages:
   - Must still show read-only signatories.
   - Must still print documents.
   - Must not be forced through the new draft workflow.
4. Existing draft packages:
   - Missing workflow metadata should show incomplete new gates.
   - Existing lot and valuation data should remain.
   - Existing `kertas_kerja_data` fallback must remain.

## Phase 12 - Cleanup

1. Remove or stop using old `transition(status=DRAFT)` autosave calls.
2. Remove duplicated document arrays after registry is adopted.
3. Rename labels that confuse Srikandi sequence:
   - `SK Penunjukan Tim Penilai / Penaksir` should become the wording approved by operator if it maps to `Pembentukan Panitia Penaksir Harga...`.
   - `Surat Pernyataan Kelancaran Tugas Dinas` must not be confused with `Surat Tugas Pemeriksaan dan Penilaian BMN`.
4. Keep UI copy short and operational.
5. Update this docs folder if operator confirms the open questions.

## Done Criteria

The implementation is done when:

- New workflow order is visible in the UI.
- Valuation is not editable before required pre-valuation documents.
- Nota Dinas KSDAE and KPKNL are after valuation.
- Manual TTD documents are distinct from Srikandi documents.
- Backend rejects invalid out-of-order actions.
- Existing locked packages remain readable/printable.
- Tests and validation commands pass.
