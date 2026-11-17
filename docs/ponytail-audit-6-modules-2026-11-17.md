# Ponytail Audit Report — 6 Modul Utama (BE & FE)

- **Tanggal Audit**: 17 November 2026
- **Branch / Basis Commit**: `codex/portal-security-pentest` (atop `fc993464`)
- **Cakupan Modul**: `surat-tugas`, `portal`, `kepegawaian`, `drive`, `bmn`, `surat`, serta shared BE/FE (`app/Support`, `app/Services`, `lib/`, `components/`) & dependensi (`package.json`, `composer.json`).
- **Metodologi**: Skill `/ponytail-audit` (ranked terbesar lebih dulu; tag: `delete:`, `stdlib:`, `native:`, `yagni:`, `shrink:`) + `/ponytail` rule *Zero Guessing & Verify Reachability*.

---

## Ringkasan Estimasi Dampak

| Kelompok | Estimasi Pengurangan | Status |
|---|---:|---|
| Dead subgraphs & unreachable FE files (`bmn` 46 file, empty proxy dirs, shared dead components/libs) | **-5.800+ lines** | Done |
| Unused dependencies (`date-fns`, `react-leaflet`, `cmdk`, `google/apiclient`, `google/auth`, `GoogleSheetsService`) | **-7 pkg (`-5` FE deps / `-258` transitive pkgs, `-2` BE composer pkgs)** | Done |
| Print/Preview/Report/Disposisi/ST-template consolidation across modules | **Done (core print, preview A4, drawer, disposisi & report images; template CSS sengaja dipertahankan)** | Done (Scoped) |
| Date/Currency/Sanitizer/Location/BE controller dedup | **Done (Carbon months, Location slug, filename sanitizer, DeReporting folder, BMN traits/imports, ST mobile/download, non-admin stats skip)** | Done (Scoped) |
| **Status Akhir** | **Semua temuan berdampak tinggi selesai tanpa regresi build/E2E** | Executed & Verified |

---

## Temuan Terurut (Terbesar Lebih Dulu)

### P-01 — `delete:` 46 berkas pratinjau/wizard `auction-candidates/` & tab workflow `auction-batches/[id]/` yatim + modal/util BMN mati (`-5.770 lines`)
- [x] **Modul**: `bmn` (FE) & `shared` (`frontend/src/lib/bmn-utils.ts`) — *Selesai: 46 file mati BMN + `bmn-utils.ts` + `constants/bmn.ts` + `openSkPrintWindow`/`canShowScheduleTab` dihapus; docs `utility-functions.md` & `frontend/README.md` diperbarui; endpoint `POST /api/bmn/assets/{asset}/loans` dipertahankan untuk kompatibilitas API.*
- **Verifikasi Reachability**: Script traversal graf impor (`scan-dead-modules.cjs`) mengonfirmasi **0 pemanggil** dari route/halaman aktif atau berkas tes (`frontend/tests/*`) untuk ke-46 berkas di `bmn/` (5.429 baris) plus `bmn-utils.ts` + `constants/bmn.ts`:
  - `frontend/src/app/bmn/auction-candidates/_components/sections/*` (11 file, 1.012L)
  - `frontend/src/app/bmn/auction-candidates/_components/*` kecuali yang aktif dipakai renderer/page (15 file, 2.085L: `AssetTable`, `DocumentActions`, `DocumentNumberInputs`, `KepalaBalaiPicker`, `PageHeader`, `PanitiaEditor`, `PemeriksaEditor`, `ReorderPanel`, `SearchBar`, `SelectedAssetsBanner`, `SkBuilder`, `SkTimPenilaiBuilder`, `SummaryTile`, `TimPenilaiEditor`, `WorkflowSteps`)
  - `frontend/src/app/bmn/auction-candidates/_hooks/*` kecuali `useEmployeeOptions.ts` (10 file, 970L)
  - `frontend/src/app/bmn/auction-candidates/_lib/nota-kpknl-defaults.ts` (37L) & fungsi mati `openSkPrintWindow` (`sk-print.ts:336-359`, 24L)
  - `frontend/src/app/bmn/auction-batches/[id]/_components/{SignatoriesDocumentsTab,ScheduleTab,workflow/*}` (6 file dead + `workflow/types.ts` dipindah type `Employee` ke `_lib/api.ts`: 1.032L)
  - `frontend/src/app/bmn/_components/BmnDashboardComponents.tsx` (96L), `components/modals/{BorrowAssetModal,MaintenanceModal}.tsx` (173L)
  - `frontend/src/lib/bmn-utils.ts` (60L) & `frontend/src/lib/constants/bmn.ts` (15L) — 0 pemanggil di `frontend/src` & `frontend/tests`.
- **Aksi**: Hapus seluruh berkas yatim di atas (pindahkan tipe `Employee` di `workflow/types.ts` ke `auction-batches/[id]/_lib/api.ts`), plus bersihkan endpoint BE usang `POST /api/bmn/assets/{asset}/loans` jika `BorrowAssetModal` adalah satu-satunya caller (cek BE test terlebih dahulu!).

### P-02 — `delete:` Dead dependencies & dead shared FE/BE files (`-580 lines, -5 deps`)
- [x] **Modul**: `shared` (`frontend/package.json`, `backend/composer.json`, `surat`, `drive`, `kepegawaian`) — *Selesai: 7 komponen UI mati + `EmployeePicker.tsx` + `rich-text-editor.tsx` + 12 folder kosong + `GoogleSheetsService.php` dihapus; 5 paket npm & 2 paket composer (`google/apiclient`, `google/auth`) dihapus.*
- **Bukti**:
  1. `frontend/package.json:23` (`"date-fns": "^4.1.0"`) & `frontend/next.config.ts:32`: **0 import** di `frontend/src/**`.
  2. `frontend/package.json:28,39` (`"react-leaflet": "^5.0.0"`, `"@types/leaflet"` di prod deps): `react-leaflet` **0 import** di `frontend/src/**` (peta memakai `leaflet` imperatif).
  3. Dead shared UI files (0 pemanggil di `frontend/src/**` & `frontend/tests/**`):
     - `frontend/src/components/custom/EmployeePicker.tsx` (141L) -> digantikan `ui/employee-select.tsx`
     - `frontend/src/components/ui/rich-text-editor.tsx` (94L) -> 0 import; CMS langsung memakai `react-quill-new` (dan file ini menyisipkan `@import cdn.jsdelivr.net` yang melanggar CSP)
     - Unused UI primitives: `ui/command.tsx` (+ dep `cmdk` jika 0 import lain!), `ui/alert-dialog.tsx`, `ui/card.tsx`, `ui/sheet.tsx`, `ui/table.tsx` (verifikasi ulang nol referensi sebelum hapus!).
  4. **12 direktori kosong** sisa migrasi proxy: `frontend/src/app/internal-download/**` & `frontend/src/app/api/**` (0 file di dalamnya).
  5. `backend/app/Services/GoogleSheetsService.php` (196L) + config dummy/hardcoded `services.php:43-46` + paket `google/apiclient` & `google/auth` (`composer.json:10-11`): **0 caller** di `backend/{app,config,routes,database,tests}`. *(Cek cepat `composer.json` & `.gitignore`/deploy script dulu agar aman menghapus paket Google.)*

### P-03 — `shrink:` Ekstraksi inline CSS duplikat pada 12 template cetak BMN & Surat Dinas + konsolidasi 4 print opener (`~-1.600 lines`)
- [x] **Modul**: `bmn`, `surat`, `kepegawaian`, `surat-tugas` (FE) — *Selesai (terfokus): helper tunggal `openPrintWindow()` (`frontend/src/lib/print-window.ts`) dipakai bersama di 5 modul/cetak + fix `PowerOfAttorneyTab`, `<PhotoLampiranPages>` + `collectPrintPhotoUrls()`, dan hapus fallback mati `!onSetEditingDocument`. CSS per-template & `bmn-ui.css`/`assets.css` sengaja dipertahankan untuk menjaga tata letak cetak A4 & kontrak CJS.*
- **Bukti**:
  - 12 komponen dokumen BMN mengulang CSS layout/print verbatim baik di literal template print (`print-helpers.ts:16-633`, `print-pernyataan.ts`, `report-utils.ts`, `*Document.tsx`) maupun `<style jsx global>` di JSX (`CoveringLetterDocument` 337L, `SkPenghentianDocument` 271L, `SkPanitiaDocument` 197L, `SkTimPenilaiDocument` 133L, `HandoverAgreementDocument` 124L, `UsageAgreementDocument` 116L, `BaKoreksiDocument` 114L, `PermohonanKpknlDocument` 60L, `KertasKerjaAssetSection` 59L, `NotaDinasDocument` 58L, `BaPemeriksaanDocument` 42L, `PernyataanDocument` 24L).
  - 4 implementasi `window.open` + `document.write` + image-wait duplikat across modules (`bmn` `printDocumentWindow`, `printReportDocumentWindow`, `DocumentsCenterTab:343-362`, `surat-tugas` `printSuratTugas`, `SuratTugasLetterPreview:127-166`, `SuratDinasDocument:1335-1410`).
  - `UsageAgreementDocument` & `HandoverAgreementDocument` menduplikasi `<PhotoLampiranPages>` + extractor foto (~130L).
  - Unreachable `!onSetEditingDocument` fallback di `UsageAgreementTab.tsx:266-341` & `PowerOfAttorneyTab.tsx:318-381` (~145L).
  - CSS redundant antara `bmn/bmn-ui.css` vs `bmn/assets/assets.css` vs `globals.css` (~100L).
- **Aksi**: Satu helper `openPrintWindow()` di shared FE lib, share satu string CSS per template (`<style>{CSS}</style>`), gabungkan `<PhotoLampiranPages>`, hapus fallback `!onSetEditingDocument`, dan rapikan duplikasi `bmn-ui.css`/`assets.css`.

### P-04 — `shrink:` Penyatuan Pratinjau A4 Surat Tugas, Drawer Dokumen Dasar, Form Report Portal, & Export Word (`~-1.250 lines`)
- [x] **Modul**: `surat-tugas`, `portal`, `kepegawaian`, `surat` (FE) — *Selesai (terfokus): `SuratTugasA4Parts.tsx` menyatukan `SuratTugasLetterPreview` & `STBuilderPreview`; `DokumenDasarDrawer` diganti `ScanViewerModal`; `ReportFormShared.tsx` menyatukan validasi foto laporan (dengan kontrak UI cover & ST combobox dipertahankan sesuai `portal_security_check.php`); `LembarDisposisiCardFields`, `<Disposisi2UpSheetGrid>`, `saveSuratMasukQuickPatch()`, `<NotificationRowItem>`, & `<SuratDinasDownloadDropdown>` terekstrak. `export-surat-dinas.ts` vs `export-st.ts` & `PortalSkeleton()` dipertahankan (YAGNI / aman print).*
- **Bukti**:
  1. `SuratTugasLetterPreview.tsx` (591L) vs `STBuilderPreview.tsx` (624L) me-render badan surat A4, `headerTitle`, kop, tabel Kepada/Untuk, TTD, & tembusan yang identik (`~-360L`).
  2. `DokumenDasarDrawer.tsx` (285L) menduplikasi `ScanViewerModal.tsx` (`base64ToBlobUrl`, fetch `/download?preview=1`, PDF/image renderer) (`~-265L`).
  3. `GeneralReportInlineForm.tsx` vs `SmartPatrolInlineForm.tsx` di `portal/_components/` menduplikasi ST combobox popover, upload/validasi cover & max-30 foto, header print-preview bar (`~-320L`), plus unused state (`daftarIsi`, `daftarLampiran`, `sptFile`, `customCoverTitle`/`Author`). *(Catatan: pertahankan urutan hook `KalkulatorDinasTab` sesuai kebutuhan tes `portal-review-check.cjs`.)*
  4. `export-surat-dinas.ts` vs `export-st.ts` menduplikasi `sanitizeFilenamePart`, `resolveAbsoluteUrl`, `inlineImagesAsBase64`, dan pembungkus MHTML `.doc` (`~-180L`).
  5. `LembarDisposisiForm.tsx:443-836` menduplikasi seluruh field Form 1 & Form 2 (`~-220L`); `BatchPrintDisposisiModal.tsx` menduplikasi `LembarDisposisi2UpPrint.tsx` (`~-80L`); `DiteruskanCellPopover` & `SifatCellPopover` menduplikasi `PUT /surat-masuk` full payload + dead `localStorage` `bksda_saved_surat_masuk` (`~-125L`); `NotificationBell.tsx` menduplikasi tab filter & row rendering Popover vs History Modal (`~-200L`).
  6. `PortalSkeleton()` (`portal/page.tsx:111-198`) menduplikasi navbar (`~-90L`). `surat-api.ts` (8 dari 9 ekspor 0 caller, `-48L`); `dinas/page.tsx` duplicate download menu & hardcoded `SAMPLE_SIMATA_BKN_TEXT` (`-78L`).

### P-05 — `yagni:` / `shrink:` Sumber Kebenaran Tunggal Konfigurasi Sumber Dana ST & Template Persuratan (`~-600 lines`)
- [x] **Modul**: `surat-tugas`, `kepegawaian`, `surat` (FE & BE) — *Selesai (terfokus): trait `ResolvesDocumentStatus` menyatukan 4 controller BMN; `AssetStagingImport` mendelegasikan `AssetImport::mapExcelRow()` (sekaligus menutup validasi URL `http/https`); `formatFormalSumberDana()` memakai tabel pemetaan. Katalog `SUMBER_DANA_OPTIONS`/fallback DB, layering `StExpenseTemplate`, dan `sanitizeRow()` per-export (`portal_security_check.php:1346`) sengaja dipertahankan.*
- **Bukti**:
  - 5 katalog `sumber_dana` statis (`constants.ts:33-117`, `SuratTugasDetailStep.tsx:157-169`, `status-helpers.ts:184-260`, `sumber-dana.ts:30-53`, `HermesSuratTugasCommand.php:423-466`) menduplikasi DB `st_expense_templates`.
  - `surat/settings/page.tsx` + `SuratTemplateController` mengelola tabel `surat_templates` sementara generator surat dinas memakai hardcoded `ALL_TEMPLATES` & `getDefaultDataForTemplate()` — pilih salah satu atau konsolidasikan sumbernya agar tidak mengambang dua jalur.
  - Collapse over-layered `StExpenseTemplate` (`StExpenseTemplateService`/`Resource`/`UpdateRequest`) & `StTemplateResource`/`UpdateRequest` bila cukup dengan pola langsung `StTaskTypeController` (`-180L`), dan satukan 4 BE `*Controller` BMN (`determineStatus()` + store/update boilerplate, `-125L`), `AssetStagingImport` vs `AssetImport` (`-165L`), dan 3x `sanitizeRow` di BMN Excel Exports (`-20L`).

### P-06 — `stdlib:` / `shrink:` Konsolidasi Helper Tanggal, Rupiah/Ribuan, Terbilang, NIP, Unit/Lokasi Drive, & Nama File Aman (`~-650 lines`)
- [x] **Modul**: Seluruh 6 modul (BE & FE) — *Selesai: 3× bulan Carbon `id` (`MealAllowanceController`/`ExcelExport`), `Location::resolveUnitSlug()` + `Employee::canonicalLocationSlug()`, `UploadValidationRules::sanitizeFilename()`, `FormBuilderController::resolveDriveFormFolder()`, hapus `exists()` pra-`delete()` di `cleanupFailedUpload` + key `available_units`, serta konsolidasi FE `formatRupiah`/`parseLocalDate`/`calculateLeaveDays` (`employee-helpers.ts`), `parseDocDate` (`auction-helpers.ts`), dan `formatDisplayDate` (`SuratHubComponents.tsx`).*
- **Bukti**:
  - FE date formatters tersebar di 8+ tempat (`letter-utils.ts`, `utils.ts`, `PortalHeaderBanner.tsx`, `status-helpers.ts`, `STLampiranBedaHari.tsx`, `SuratHubComponents.tsx`, `surat/masuk/page.tsx`, `SuratDinasDocument.tsx`, `LembarDisposisiSheet.tsx`, `dinas/page.tsx`, `NotificationBell.tsx:formatRelativeTime` -> native `Intl.RelativeTimeFormat`).
  - BE month arrays 3x (`MealAllowanceController.php` ×2, `MealAllowanceExcelExport.php`) -> PHP Carbon `locale('id')->translatedFormat('F')`.
  - Terbilang duplikat di `EmployeeLeaveRequestController`, `SpjDipaExcelService`, `auction-helpers.ts`, `report-utils.ts`.
  - `formatRupiah` / `formatRibuan` / `parseRibuan` duplikat di `KalkulatorDinasTab`, `kepegawaian` (`employees/[id]`, `EmployeeMealAllowanceTab`, `uang-makan`), `bmn` (`asset-utils`, `RealizationTab`, `ValuationTab`, `KertasKerjaAssetSection`, `disposal`, `assets/[id]`).
  - `isPppk` & `calculateLeaveDays` duplikat 3x (`EmployeeLeaveTab`, `CatatSuratIzinModal`, `LeaveRequestDialog`); `hasPejabatStruktural` duplikat 3x (`surat-tugas/page.tsx`, `GmailReaderView.tsx`, `SuratTugasForm.tsx`).
  - **BE Drive & Employee placement resolution**: `DriveAccess::resolveEmployeeDriveUnitId`/`resolveEmployeeUnitSlug` (`DriveAccess.php:451-475`), `Employee.php` (×3), `EmployeeController.php:1001`, `EmployeeLeaveRequestController.php:1079` -> konsolidasikan menjadi metode `Employee::canonicalUnitSlug()` & `Employee::effectiveDriveUnitId()` yang mendelegasikan ke `Location` (`-52L`).
  - **BE Filename Sanitizer**: 4× duplikasi regex (`DriveController`, `DriveShareController`, `ArchiveOfficialDocument`, + `FormBuilderController`) -> helper tunggal `sanitizeFilesystemName()` (`-35L`).
  - **BE DeReporting**: 3× duplikasi folder provisioning di `FormBuilderController.php` (`-48L`).
  - **BE Drive S3 calls**: `AwsS3V3Adapter::temporaryUrl()` menggantikan manual `getCommand('GetObject')` di `DriveController:807-817` (`-11L`); hapus 5× redundan `Storage::disk('drive')->exists()` sebelum `delete()` (`-5L`); konsolidasikan 4× abort block di `completeUpload` (`-18L`); hapus unused key `available_units` di `DriveController::index` (`-1L`).

### P-07 — `shrink:` / `delete:` Duplikasi Controller ST, Global Scope Redundan KPG, & Dead Exports KPG/ST/Portal (`~-430 lines`)
- [x] **Modul**: `surat-tugas`, `kepegawaian`, `portal` (BE & FE) — *Selesai (terfokus): `EmployeeController::dashboardStats()` melewati 7 SQL query untuk non-admin; `AssignmentLetterController` mengekstrak `baseMobileItem()`, `buildDownloadFilename()`, & `storedPreviewJson()` (tetap patuh string invariant `portal_security_check.php`); hapus dead UI/exports (`DeleteLeaveModal`, `{false && ...}`, `handleRemoveEmployee`, `SATUAN_KERJA_OPTIONS`/`PANGKAT_OPTIONS`/`POPULAR_BANKS`/`hasMultipleDepartures`, duplikat `getBankTheme`).*
- **Bukti**:
  - `AssignmentLetterController.php`: 11× UUID strip/check (`findLetterOrFail`), 8× status official literal (`AssignmentLetter::OFFICIAL_STATUSES`), `toMobileListItem` vs `toMobileDetailItem`, `myDownload` vs `downloadPdf`, 6× broadcast `try/catch` (`~-160L`).
  - `EmployeeController`: hapus global scope `excludeAdminPusat` yang diulang manual (`L34-41, 958-965`), & lewati 7 SQL query dashboardStats ketika bukan admin (`L977-987, 1071-1079`).
  - `AuthController::dashboard` & `myAssets` & `UserResource`: gunakan `$user->employee` relation + satu serializer aset bersama (dan hilangkan pengembalian ganda `...$dashboardData` & `'data' => $dashboardData`, cek kompatibilitas test FE/BE dulu!).
  - Dead UI/exports: `DeleteLeaveModal` (`CutiModals.tsx:350-399`, `-50L`), `{false && ...}` delete buttons (`GmailReaderView:246-256`, `GmailRowItem:289-301`, `-24L`), `RemoveEmployee` prop mati di `SuratTugasDetailStep`, `enableLampiran` prop mati di `STBuilderPreview`, unused `SATUAN_KERJA_OPTIONS` / `PANGKAT_OPTIONS` / `POPULAR_BANKS` / `hasMultipleDepartures`, duplicate `getBankTheme` di `MealAllowanceHolidaysTab.tsx:47-127` (`-81L`), dialog `SuratTugasDialog` vs `KepegawaianDialog`.
  - `User::roleFor` / `CheckModuleAccess` & `CheckPermission`: ekstrak helper BMN self/loan check tunggal agar tidak copy-paste di dua middleware (`-35L`).
  - `backend/app/Modules/Surat/SuratServiceProvider.php`: evaluasi mount ganda `/api/surat/*` vs `/api/*`.

---

## Baseline Test Failures Sebelum Refactoring (Teramati Saat Audit Awal)

1. `Tests\Unit\UserPermissionFallbackTest::test_legacy_bmn_regular_user_can_only_read_auction` (`line 47`) — `User::hasPermission('bmn.auction.view')` mengembalikan `false` pada `role='pegawai'` karena `User.php:227` hanya mengizinkan `bmn.view`.
2. `Tests\Feature\EmployeeBankAllocationSecurityTest` (`11` kasus gagal HTTP `403` vs `200`/`404`/`422`) — setup tes menggunakan `role='admin'`, sedangkan `/kepegawaian/settings/*` dipindahkan ke `role:super_admin` pada migrasi RBAC (`SEC-04`).
3. `Tests\Feature\Wave3SikadirNativeParserTest` (`8` error `ZipArchive::close(): Renaming temporary file failed: Permission denied`) — Windows file lock pada `tmpfile()` yang masih terbuka saat `ZipArchive` me-rename arsip.
4. `Tests\Feature\DriveZipDownloadTest` (`Fatal error 128M memory_limit`) — saat dijalankan di rangkaian penuh via `php artisan test` (subproses 128M), `ZipStream\File->readStream` mengalokasikan 16 MiB melewati batas 128 MiB PHP CLI default (lulus `4/4` bila dijalankan langsung).
