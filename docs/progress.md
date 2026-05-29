# Progress - Phase 70: Refactor Modul Kepegawaian (DRY Shared Components) — MERGED

> Document updated: 2026-05-29
> Status: **MERGED** (PR #393 merged ke `main` commit `f326ed3`; deploy SSH ditunda)

---

## Issue #392: Refactor kepegawaian — hilangkan duplikasi builder↔create (DRY)

### Status: MERGED
- PR #393 merged ke `main` (merge commit `f326ed3`). Remote branch deleted.
- User sudah test manual semua flow (4 template × create + edit, inbox) — aman.
- Belum deploy SSH.


### Filosofi
Tujuan utama **DRY (Don't Repeat Yourself)**, bukan sekadar menurunkan line count. Masalah inti modul ini adalah `builder/[id]/page.tsx` dan `create/page.tsx` ~80% kembar — bug fix harus dilakukan di dua tempat (terbukti di issue #384, #388, #390). Refactor ini membuat satu sumber kebenaran (single source of truth).

### Completed (di branch, belum commit):
- [x] **Issue Created**: Issue #392.
- [x] **Branch**: `issue/392-refactor-kepegawaian` (lokal, belum push).
- [x] **Shared `surat-tugas/_lib/` (8 file)**:
  - `types.ts` — Employee, DasarItem, SumberDanaOption, KepalaBalaiInfo, EmployeeDates, TemplateType
  - `constants.ts` — DEFAULT_KEPALA_BALAI, PLH placeholders, SUMBER_DANA_OPTIONS (11 opsi)
  - `sumber-dana.ts` — normalizeSumberDana
  - `plh-helpers.ts` — extractPlhWilayahFromPosition, cleanPlhKegiatanKasi, normalizeEmployeeForSelection
  - `untuk-helpers.ts` — getDefaultUntukItem(s), splitStoredUntukItems, isGeneratedBiayaItem, toDasarItems
  - `activity-helpers.ts` — isSingleDayActivityPrefix, shouldRenderAsSingleDayActivity, buildBiayaTextFor
  - `print-st.ts` — printSuratTugas (print handler + CSS, sebelumnya duplikat ~50 baris di 2 file)
  - `index.ts` — barrel export
- [x] **Shared `surat-tugas/_components/` (4 file)**:
  - `FormSection.tsx` — section wrapper (sebelumnya duplikat di builder + create)
  - `EditableItemListSection.tsx` — list editor add/remove untuk Menimbang (marker huruf) + Dasar (marker angka)
  - `TembusanSection.tsx` — daftar tembusan string list
  - `PenandatanganSection.tsx` — searchable employee picker untuk Kepala Balai (state search dikelola lokal)
- [x] **`inbox/_lib/` (2 file)**:
  - `types.ts` — AssignmentLetter, InboxEmployee, LetterItem, LetterStatus
  - `status-helpers.ts` — getStatusStyle, getStatusLabel
- [x] **Eliminasi duplikasi**: builder + create sekarang import dari `_lib` + `_components` yang sama.

### Hasil Pengurangan Baris:
| File | Awal | Sekarang | Berkurang |
|------|------|----------|-----------|
| `builder/[id]/page.tsx` | 1500 | 1195 | −305 (−20%) |
| `create/page.tsx` | 1119 | 882 | −237 (−21%) |
| `inbox/page.tsx` | 704 | 654 | −50 |

### Pending (belum dikerjakan):
- [ ] User test browser semua flow (4 template × create + edit, inbox).
- [ ] (Opsional) Extract Detail Kegiatan + Kepada (Personil) sections — lebih kompleks karena banyak interdependensi state (employeeDates, PLH fields, single-day toggle).
- [ ] Commit + push + PR + merge setelah user OK.
- [ ] Deploy SSH (tunggu user siap).

### Validation (sudah lulus):
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 pages)
- [x] Zero behavior change — semua fitur (BMN, Beda Hari, PLH, FOLU, one-day) tetap utuh

### Key Files Baru (14):
- `surat-tugas/_lib/`: types, constants, sumber-dana, plh-helpers, untuk-helpers, activity-helpers, print-st, index (8)
- `surat-tugas/_components/`: FormSection, EditableItemListSection, TembusanSection, PenandatanganSection (4)
- `surat-tugas/inbox/_lib/`: types, status-helpers (2)

### Catatan Pendekatan:
- **Extraction bertahap, reversible, validate tiap langkah** — bukan big-bang rewrite.
- Yang sudah diextract = "low-risk, high-value": konstanta, types, helper murni, print handler, dan section UI yang struktur-nya identik.
- Belum extract Detail Kegiatan & Kepada (Personil) section karena punya banyak state interdependent (PLH placeholder, FOLU auto-fill, Beda Hari date, one-day detection) — perlu hati-hati supaya tidak regresi.

---

# Progress - Phase 69: ST Builder Untuk Items Editable + One-Day Activity (MERGED + DEPLOYED)

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #391 merged ke `main`; production app commit `de9da95`)

---

## Issue #390: Make ST Builder Untuk items editable + one-day activity task type

### Completed:
- [x] **Issue Created**: Issue #390.
- [x] **Branch Created/Pushed**: `issue/390-st-builder-untuk-items`.
- [x] **PR Created/Merged**: PR #391 merged ke `main` (merge commit `de9da95`).
- [x] **Branch Cleanup**: remote branch `issue/390-st-builder-untuk-items` deleted after merge.
- [x] **Editable Untuk items**: dynamic list dengan add/remove, mirror behavior dari Menimbang/Dasar.
- [x] **Editor placement**: dipindah ke bawah input tanggal di sidebar.
- [x] **One-day activity task type**: task type baru untuk kegiatan 1 hari (skip auto biaya, render single-day format).
- [x] **Auto-detect same-date tasks**: kalau `tanggal_mulai === tanggal_selesai`, auto-render sebagai one-day di builder.
- [x] **Journey fields editable**: untuk same-date tasks tetap bisa edit asal/tujuan/kegiatan.
- [x] **Biaya line editable**: biaya sekarang masuk ke untuk items list dan bisa di-edit, bukan auto-generated tersembunyi lagi.
- [x] **Persist via `maksud_tujuan`**: custom Untuk items disimpan di field `maksud_tujuan` dan diparse saat re-open ST.
- [x] **Production deploy**: included in 2026-05-29 batch deploy (`7d5212b` -> `de9da95`), backend + frontend rebuilt/recreated, no new migrations, production health checks passed.

### Implementation Notes (9 commits di branch sebelum merged):
1. `70bd40c feat: make ST builder untuk items editable`
2. `769ec7a fix: move ST builder untuk editor below dates`
3. `1488bcf feat: add one-day activity task type`
4. `57869ed fix: skip auto biaya for one-day ST builder tasks`
5. `6d51def fix: auto-detect one-day submitted ST tasks`
6. `367d1ed fix: render same-date ST builder tasks as one-day`
7. `4e86599 fix: keep journey fields editable for same-date tasks`
8. `24f807a fix: keep ST builder biaya out of editable untuk preview`
9. `0c3f3bf feat: make ST builder biaya editable in untuk items`

### Files Modified (2):
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx` (+296/-46)
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx` (+19/-3)
- Total: +293 / -55 lines

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

### Production Deploy:
- [x] Server: `ssh -i bksda-superapp.pem ec2-user@15.135.114.1`
- [x] App path: `/home/ec2-user/bksda-superapp`
- [x] `git pull origin main` (`7d5212b -> de9da95`, includes #388 + #390 + docs)
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build backend frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d backend frontend`
- [x] `php artisan migrate --force` → `Nothing to migrate`
- [x] Container status: `bksda-backend` Up, `bksda-frontend` Up, all 9 containers running
- [x] `https://bksdakaltim.net/login` → HTTP 200

### Note:
- Implementation oleh AI Codex (di branch `issue/390-st-builder-untuk-items`).
- Merge + deploy oleh Claude Sonnet 4.5.
- Issue #388 (PLH template) yang sebelumnya merged tapi belum deploy ikut ter-deploy di batch ini.

---

# Progress - Phase 68: PLH Template + Buat ST PLH Button (MERGED + DEPLOYED)

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #389 merged ke `main`; production app commit `de9da95`)

---

## Issue #388: Add PLH template for ST Builder + "Buat ST PLH" button in Inbox

### Completed:
- [x] **Issue Created**: Issue #388.
- [x] **Branch Created/Pushed**: `issue/388-st-plh-template`.
- [x] **PR Created/Merged**: PR #389 merged ke `main` (merge commit `ad179a9`); remote branch deleted.
- [x] **Inbox tombol "Buat ST PLH"**: di card "Nama PLH" redirect ke `/kepegawaian/surat-tugas/create?template=plh&parent_st_id={selectedLetter.id}`.
- [x] **Existing PLH draft reuse**: tombol Inbox membuka draft PLH existing bila sudah pernah dibuat, bukan membuat draft baru terus.
- [x] **Template PLH baru** di create + builder edit: klasifikasi `PEG.09.01`, sumber dana `dl1`, Menimbang/Dasar/Untuk/Tembusan default PLH.
- [x] **Auto-fetch ST Induk**: prefill nomor/tanggal dasar, tanggal mulai/selesai, wilayah dari pegawai utama ST induk, kegiatan Kepala Seksi, dan nama PLH.
- [x] **Auto-select pegawai PLH stabil** walaupun data pegawai lambat load.
- [x] **Draft PLH persist nomor surat**: `nomor_surat`, `kode_surat`, dan `tanggal_surat` ikut tersimpan saat Simpan Draft.
- [x] **STBuilderPreview update**: item kedua di "Untuk" jadi `"Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai."` saat PLH.
- [x] **`buildBiayaText`**: skip biaya line saat PLH.
- [x] **`buildUntukText`**: format durasi PLH memakai `selama X (kata) hari terhitung...`.
- [x] **Tembusan section** di create page: input dinamis dengan add/remove, terisi default saat PLH aktif.

### Pending:
- [ ] Deploy ke SSH production belum dilakukan sesuai instruksi user.
- [ ] Issue baru: item "Untuk" di ST Builder harus bisa ditambah/dikurangi seperti Menimbang dan Dasar.

### Key Files Modified:
- `frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php`
- `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php`

### Validation:
- [x] `npm run lint -- --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `php -l` SuratTugas controller/request clean

---
# Progress - Phase 67: Searchable ST Penandatangan Picker (MERGED + DEPLOYED)

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (PR #387 merged ke `main`; production app commit `7d5212b`)

---

## Issue #386: Make ST penandatangan editable/searchable

### Completed:
- [x] **Issue Created**: Issue #386.
- [x] **Branch Created/Pushed**: `issue/386-editable-st-penandatangan`.
- [x] **PR Created/Merged**: PR #387 merged ke `main` (merge commit `ac6f5d9`).
- [x] **Branch Cleanup**: remote branch deleted after merge.
- [x] **Frontend**: ST Create dan ST Builder edit sekarang punya searchable employee picker di section Penandatangan.
- [x] **Default signer**: `M. Ari Wibawanto, S.Hut., M.Sc.` dengan NIP `19740514 199903 1 001`.
- [x] **Manual override**: Nama dan NIP tetap editable setelah user pilih pegawai dari search.
- [x] **Backend persist**: tambah kolom `penandatangan_nama` dan `penandatangan_nip`; direct create dan builder approve/save mengirim dan membaca ulang field ini.
- [x] **Production deploy**: EC2 pulled `main` dari `550944f` ke `7d5212b`, backend + frontend rebuilt/recreated.
- [x] **Migration production**: `2026_05_28_161500_add_penandatangan_to_st_assignment_letters_table.php` applied.
- [x] **Production health**: `/login` HTTP 200; `/bmn/auction-candidates` HTTP 307 redirect ke `/login` (protected, expected).

### Pending:
- [ ] **Manual browser check**: user akan cek langsung di browser.

### Validation:
- [x] `php -l` SuratTugas controller/model/request/migration clean
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `backend/app/Modules/SuratTugas/Migrations/2026_05_28_161500_add_penandatangan_to_st_assignment_letters_table.php`
- `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php`
- `backend/app/Modules/SuratTugas/Models/AssignmentLetter.php`
- `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`

---

# Progress - Phase 66: ST "Beda Hari" Template (MERGED + DEPLOYED)

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (PR #385 merged ke `main`; production app commit `7d5212b`)

---

## Issue #384: Add "Beda Hari" template for ST Builder + Create page

### Completed:
- [x] **Issue Created**: Issue #384.
- [x] **Branch Created/Pushed**: `issue/384-st-template-beda-hari`.
- [x] **PR Created/Merged**: PR #385 merged ke `main` (merge commit `f8b6d56`).
- [x] **Branch Cleanup**: remote branch `issue/384-st-template-beda-hari` deleted after merge.
- [x] **New Component**: `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STLampiranBedaHari.tsx`.
- [x] **STBuilderPreview update**: Beda Hari renders `Kepada: Daftar nama terlampir.` and adds page 2 lampiran.
- [x] **ST Create + Builder page update**: dropdown template, per-employee dates, lampiran title input, hide global dates in Beda Hari mode, and MIN/MAX date calculation for `Untuk`.
- [x] **Print layout lampiran final**: content moved up, custom print page added, meta block shifted left, TTD follows page 1 position, table uses fixed layout, Nama/NIP widened, date column nowrap for long month names.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), frontend rebuilt/recreated, production health checks passed.

### Pending:
- [ ] **Backend persist (opsional)**: `employeeDates` masih state frontend; persist backend bisa jadi issue terpisah kalau dibutuhkan.

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STLampiranBedaHari.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`

### Next:
- [x] Buat issue baru untuk editable ST Penandatangan/Kepala Balai di create + builder edit (selesai sebagai #386).

---
# Progress - Phase 65: Global Kepala Balai Picker

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (production app commit `7d5212b`)

---

## Issue #382: Add global Kepala Balai picker for all auction documents

### Completed:
- [x] **Issue Created**: Issue #382.
- [x] **PR Created/Merged**: PR #383 merged ke `main` (merge commit `94f9a19`).
- [x] **Branch Cleanup**: remote branch `issue/382-kepala-balai-picker` deleted after merge.
- [x] **New Component**: `_components/KepalaBalaiPicker.tsx`
  - Card baru dengan icon `UserCheck` dan judul "Penandatangan Kepala Balai".
  - Dropdown dari API `/kepegawaian/employees/select`, sorted alfabetis.
  - `useQuery` dengan `staleTime: 5 menit` untuk caching.
  - Saat user pilih pegawai: nama auto-UPPERCASE, NIP auto-format spasi via `formatNip`.
  - Preview Nama (UPPERCASE) + NIP (mono font) di card.
- [x] **Default Updated**: `DEFAULT_KEPALA_BALAI` di `sk-defaults.ts` ubah ke mixed case `M. ARI WIBAWANTO, S.Hut., M.Sc.` (sebelumnya UPPERCASE penuh `M. ARI WIBAWANTO, S.HUT., M.SC.`).
- [x] **BA Koreksi (was hardcoded)**:
  - 3 lokasi hardcoded sebelumnya: tabel identitas Nama+NIP, TTD halaman 1, `AttachmentSignature` lampiran.
  - Sekarang `BaKoreksiDocument` import `SkKepalaBalai` type dan terima prop `kepalaBalai`.
  - `AttachmentSignature` jadi typed `({ kepalaBalai }: { kepalaBalai: SkKepalaBalai })`.
  - `BaLampiranPageContent` ditambah prop `kepalaBalai` untuk forward ke `AttachmentSignature`.
  - Tetap editable inline lewat `contentEditable`.
- [x] **Page integration**:
  - Render picker di antara `<DocumentNumberInputs>` dan `<SelectedAssetsBanner>`.
  - Pakai existing state `sk.kepalaBalai` (dari `useSkBuilderState`), share state dengan picker di `SkBuilder` dan dengan semua 11 dokumen.
  - `BaKoreksiSection` ditambah prop `kepalaBalai={sk.kepalaBalai}`.
- [x] **10 dokumen lain reflect otomatis**: SK Penghentian, SK Panitia, SK Tim Penilai, BA Pemeriksaan, SK Kebenaran, SPTJ Limit, SPTJM, SP Tugas, Nota Dinas, Permohonan KPKNL — sudah pakai state `sk.kepalaBalai` dari awal, jadi tidak perlu perubahan tambahan.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), backend + frontend rebuilt/recreated, production health checks passed.

### Pending:
- [ ] Manual browser check by user.

### Key Files:
- New (1): `_components/KepalaBalaiPicker.tsx`
- Modified (4): `_lib/sk-defaults.ts`, `_components/BaKoreksiDocument.tsx`, `_components/sections/BaKoreksiSection.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 64: KOP Unification + Editable KAP for All Documents

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (production app commit `7d5212b`)

---

## Issue #380: Change KOP and make all document numbers fully editable

### Completed:
- [x] **Issue Created**: Issue #380.
- [x] **PR Created/Merged**: PR #381 merged ke `main` (merge commit `79a4278`).
- [x] **Branch Cleanup**: remote branch `issue/380-kop-header-terbaru` deleted after merge.
- [x] **KOP Change**: 4 dokumen ganti KOP dari `/header-new.png` ke `/header-terbaru.png` agar konsisten dengan BA Koreksi:
  - BA Pemeriksaan BMN
  - SK Kebenaran Fotokopi Dokumen
  - Surat Permohonan KPKNL
  - Nota Dinas KSDAE
- [x] **Format Nomor Unified**: Semua 11 dokumen sekarang format `{prefix}.{nomor}/K.18/TU/{KAP}/B/{MM}/{YYYY}`.
  - SK Penghentian dan SK Panitia sebelumnya tidak punya `/B/`, sekarang ditambahkan.
  - SK Tim Penilai sebelumnya pakai `getTimPenilaiNumberSuffix` helper (KAP.06.01 hardcoded), sekarang inline dengan `kap` parameter editable.
- [x] **Editable KAP**: Sebelumnya hanya BA Koreksi yang KAP-nya editable. Sekarang semua 11 dokumen punya 2 input editable di panel "Pengaturan Nomor Surat":
  - Nomor (placeholder `____`)
  - KAP (text editable)
- [x] **Default KAP**:
  - 9 dokumen → `KAP.06.01` (BA Koreksi, SK Tim Penilai, SPTJ Limit, SPTJM, SP Tugas, SK Kebenaran, BA Pemeriksaan, Nota Dinas, Permohonan KPKNL)
  - 2 dokumen → `KAP.05.01` (SK Penghentian, SK Panitia)
- [x] **Default Nomor Cleared**: Semua state nomor default kosong (placeholder `____`). User wajib isi sendiri.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), backend + frontend rebuilt/recreated, production health checks passed.

### Implementation:
- [x] `useDocumentNumbers` ditambah 11 pasang state KAP: `baKap`, `skKap`, `skPanitiaKap`, `skTimPenilaiKap`, `sptjLimitKap`, `sptjmKap`, `spTugasKap`, `skKebenaranKap`, `baPemeriksaanKap`, `notaDinasKap`, `permohonanKpknlKap`.
- [x] `DocumentNumberInputs` UI: 2 input editable per dokumen, prefix dan suffix tetap fixed.
- [x] 11 Document components: interface props menerima `kap: string` dan fungsi `buildNomor`/`buildNomorText` membaca KAP dari prop.
- [x] 9 Section wrappers: forward `kap` prop dari `page.tsx` ke document.
- [x] `getSkNumberSuffix` masih ada di `auction-helpers.ts` tapi tidak dipakai SK Penghentian/Panitia lagi. `getTimPenilaiNumberSuffix` dihapus dari SkTimPenilaiDocument.

### Pending:
- [ ] Manual browser check by user.

### Key Files (23):
- Hook: `_hooks/useDocumentNumbers.ts`
- Panel UI: `_components/DocumentNumberInputs.tsx`
- Document components (11): `BaPemeriksaanDocument`, `SkKebenaranDokumenDocument`, `PermohonanKpknlDocument`, `NotaDinasDocument`, `SkPenghentianDocument`, `SkPanitiaDocument`, `SkTimPenilaiDocument`, `SpTugasDocument`, `SptjmDocument`, `SptjLimitDocument` (BaKoreksiDocument unchanged)
- Section wrappers (9): `BaPemeriksaanSection`, `NotaDinasSection`, `PermohonanKpknlSection`, `SkKebenaranSection`, `SkPanitiaSection`, `SkPenghentianSection`, `SkTimPenilaiSection`, `SpTugasSection`, `SptjLimitSection`, `SptjmSection`
- `page.tsx` (forward 11 kap props)

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 63: BA Pemeriksaan Lampiran Landscape + Deploy

> Document updated: 2026-05-27
> Status: **MERGED + DEPLOYED** ✅ (PR #379 merged; frontend production at `550944f`)

---

## Issue #378: Make BA Pemeriksaan lampiran landscape

### Completed So Far:
- [x] **Issue Created**: Issue #378 `fix(bmn): make BA Pemeriksaan lampiran landscape`.
- [x] **Branch Created**: local branch `issue/378-ba-pemeriksaan-lampiran-landscape`.
- [x] **PR Created/Merged**: PR #379 `fix(bmn): align BA pemeriksaan lampiran pagination (#378)` merged ke `main` (merge commit `550944f`).
- [x] **Branch Cleanup**: remote branch `issue/378-ba-pemeriksaan-lampiran-landscape` deleted after merge.
- [x] **Landscape lampiran**: BA Pemeriksaan lampiran now uses named A4 landscape pages instead of portrait `.doc-page`.
- [x] **Manual pagination**: selected assets are chunked manually, following the Nota Dinas/KPKNL pattern instead of relying on browser table splitting.
- [x] **Final page rule**: final lampiran page includes the TTD block and carries selected assets; for many assets the final page is capped at 6 assets, with a minimum of 1 asset kept together with TTD.
- [x] **Seven asset edge case**: BA Pemeriksaan lampiran with 7+ assets now forces at least 1 asset onto the final TTD page, so the signature block does not fall alone.
- [x] **Tall row handling**: final-page pagination estimates row height from long asset names/brand/type text; if 6 assets are too tall, fewer assets are kept on the TTD page.
- [x] **Continuation page safety**: continuation page capacity reduced to 12 assets so browser print does not push a single overflow row onto its own page.
- [x] **No `${ttd_pengirim}` placeholder**: BA Pemeriksaan lampiran signature block only renders Pelaksana Kegiatan/pemeriksa and Kepala Balai text.
- [x] **Landscape TTD layout**: final page uses a wider landscape grid with pemeriksa names in two columns and Kepala Balai on the right.
- [x] **Lampiran details**: `Lampiran` meta text is editable, stays on one full-width line, and defaults to `PEMERIKSAAN BARANG MILIK NEGARA BERUPA ALAT ANGKUTAN BERMOTOR`.
- [x] **Table details**: column-number row `1` through `11` appears only on continuation pages; `Nilai Buku` always renders centered `-`.
- [x] **Nota/KPKNL shared lampiran**: first landscape lampiran page no longer shows the `1` through `11` column-number row; continuation pages still show it.
- [x] **Nota/KPKNL overflow safety**: shared continuation page capacity reduced to 10 assets and paginator avoids leaving a single asset alone on a middle page.
- [x] **Production deploy**: EC2 pulled `main` from `e2dee79` to `550944f`, rebuilt/recreated frontend, and production route checks passed.

### Pending:
- [ ] User re-test BA Pemeriksaan, Nota Dinas, and KPKNL lampiran on production.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetLampiranLandscapeTable.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx" --max-warnings=0` clean
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/{AssetLampiranLandscapeTable,BaPemeriksaanDocument}.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Production:
- [x] Server: `ssh -i bksda-superapp.pem ec2-user@15.135.114.1`
- [x] App path: `/home/ec2-user/bksda-superapp`
- [x] `git pull origin main` (`e2dee79 -> 550944f`)
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d frontend`
- [x] `bksda-frontend` Up
- [x] `https://bksdakaltim.net/login` HTTP 200
- [x] `https://bksdakaltim.net/bmn/auction-candidates` HTTP 307 (protected, expected)

### Git Status Notes:
- Current branch: `main`
- PR #379 is merged and remote branch deleted.
- Production server is at commit `550944f`.
- There are unrelated untracked local files already present; do not add them accidentally.

---

# Progress - Phase 62: Kertas Kerja Analisis Nilai Taksiran BMN

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (PR #377 merged ke `main`; deploy SSH ditunda)

---

## Issue #376: Add asset worksheet form for auction candidates

### Completed So Far:
- [x] **Issue Created**: Issue #376 `feat(bmn): add asset worksheet form for auction candidates`.
- [x] **Branch Created**: local branch `issue/376-asset-worksheet-form`.
- [x] **PR Created/Merged**: PR #377 `feat(bmn): add asset worksheet form (#376)` merged ke `main` (merge commit `878a311`).
- [x] **Branch Cleanup**: remote branch `issue/376-asset-worksheet-form` deleted after merge.
- [x] **Open worksheet action**: selected assets now show a Kertas Kerja button in `AssetTable` and `ReorderPanel`.
- [x] **Auto numbering**: `Nomor Kertas Kerja` follows the selected asset order.
- [x] **New worksheet component**: added `KertasKerjaAssetSection.tsx` with editor panel + print preview.
- [x] **Header logo**: worksheet header uses `frontend/public/logo_kemenhut.png`.
- [x] **Asset identity auto-fill**: name, location, brand/type, police number, NUP, and acquisition year are derived from selected `AuctionAsset`.
- [x] **Checkboxes**: vehicle type, ownership documents, validity, and condition render as checkbox boxes and keep checked state in print.
- [x] **Editable side panel**: supports editing object identity, owner document, vehicle usage, physical fields, date, and committee names.
- [x] **Auction result rows**: default 3 rows; `Tambah Baris` adds a paired row for `DATA HASIL LELANG` and `PENYESUAIAN`; rows can be removed down to minimum 3.
- [x] **Committee selector**: Panitia Penaksir can be selected from employee data (`/kepegawaian/employees/select`) and still edited manually.
- [x] **Print compaction pass**: table fonts, cell heights, header, and signature spacing were reduced to target 1-page output.
- [x] **Latest layout pass**: kategori lokasi editable from side panel; condition is single-choice radio and updates limit factor; print checkbox spacing increased; document ownership row forced into one line; summary values use compact grid; date and Panitia Penaksir label aligned with signature columns.
- [x] **Adjustment calculation**: main colon column aligned with document ownership row; `Total` adjustment is auto-summed from Tipe/Merek/Waktu/Lokasi/Tahun Pembuatan percentages; row `Nilai taksiran` is auto-calculated from `Harga Lelang * (1 + Total%/100)`; total/rata-rata/limit use the calculated values.
- [x] **Summary/date alignment**: total/rata-rata/limit/pembulatan values moved to the right like the reference; limit row separates `x`, factor (`0,7`), and result; default location/date now uses today's date.
- [x] **Final visual tweaks**: asset list shows direct police-number badge (example `KT 1989 BZ`) only for motor vehicles with `no_polisi`; header logo is larger with no right divider; print hides table input borders; long table text wraps and expands row height.

### Pending:
- [ ] Deploy to SSH production when user is ready.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetTable.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/ReorderPanel.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/KertasKerjaAssetSection.tsx`
- `frontend/public/logo_kemenhut.png`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Git Status Notes:
- Current branch: `main`
- PR #377 is merged and remote branch deleted; not deployed yet.
- There are unrelated untracked local files already present; do not add them accidentally.

---

# Progress - Phase 61: Permohonan KPKNL Print Content Alignment

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #374: Align Surat Permohonan KPKNL page 1 print content

### Completed:
- [x] **Issue Created**: Issue #374.
- [x] **PR Created/Merged**: PR #375 merged ke `main` (merge commit `776722a`).
- [x] **Branch Cleanup**: remote branch `issue/374-kpknl-print-content` deleted after merge.
- [x] **Recipient block**: changed to `Kepada Yth, / Kantor KPKNL Samarinda / di / Samarinda`.
- [x] **Body paragraph**: changed to reference wording and removed Kabupaten Berau, nilai perolehan, and nilai taksiran wording from page 1.
- [x] **Default location**: Permohonan KPKNL now defaults to `Samarinda`; Nota Dinas keeps `Kota Samarinda dan Kabupaten Berau`.
- [x] **Signature label**: added `Kepala Balai,` above `${ttd_pengirim}` on KPKNL page 1.
- [x] **Builder cleanup**: removed unused total nilai taksiran control/state from the Permohonan KPKNL builder panel.
- [x] **Lampiran pagination**: Nota Dinas and Permohonan KPKNL now use shared manual landscape pagination with explicit page breaks.
- [x] **Column numbering**: lampiran table now has column-number row `1` through `11` above the regular header.
- [x] **Continuation pages**: table header repeats on continuation pages; continuation pages are packed more densely.
- [x] **Final page safety**: total row and TTD are only rendered on the final page; final page carries selected asset rows with safe bottom margin for BSrE/BSSN.
- [x] **TTD layout**: KPKNL page 1 and both landscape lampiran TTD blocks follow the SK Penghentian spacing pattern.

### Pending:
- [ ] Deploy to SSH production after merge when user is ready.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/PermohonanKpknlDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/NotaDinasDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetLampiranLandscapeTable.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/sections/PermohonanKpknlSection.tsx`
- `frontend/src/app/bmn/auction-candidates/_hooks/useNotaKpknlBuilderState.ts`
- `frontend/src/app/bmn/auction-candidates/_lib/nota-kpknl-defaults.ts`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 60: Nota Dinas KSDAE & Surat Permohonan KPKNL

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #372: Add Nota Dinas KSDAE and Surat Permohonan KPKNL documents

### Completed:
- [x] **Issue Created**: Issue #372.
- [x] **PR Created/Merged**: PR #373 merged ke `main` (merge commit `abecc91`).
- [x] **Branch Cleanup**: remote branch `issue/372-nota-dinas-kpknl` deleted after merge.
- [x] **Nota Dinas KSDAE** (`ND.270/K.18/TU/KAP.06.01/B/MM/YYYY`):
  - Halaman 1 portrait: KOP + title "NOTA DINAS" + Nomor (tanpa underline) + meta grid (Yth/Dari/Perihal/Lampiran/Tanggal, tanpa garis horizontal di bawah Tanggal) + 2 body paragraphs (indent 2.5em) + TTD (tanpa label "Kepala Balai,", hanya `${ttd_pengirim}` + nama tidak bold + NIP) + Tembusan (conditional numbering: 1 item tanpa nomor, 2+ dengan nomor)
  - Halaman 2 landscape: lampiran tabel 10 kolom (No, Kode Barang, NUP, Nama Barang, Merk/Type, No Polisi, Tahun Perolehan, Nilai Perolehan, Nilai Taksiran, Kondisi, Keterangan)
- [x] **Surat Permohonan KPKNL** (`S.331/K.18/TU/KAP.06.01/B/MM/YYYY`):
  - Halaman 1 portrait: KOP + meta grid (Nomor/Sifat/Lampiran/Perihal + Tanggal) + Yth block (Kepala KPKNL Samarinda) + 2 body paragraphs (indent 2.5em) + TTD + Tembusan
  - Halaman 2 landscape: lampiran tabel 10 kolom (sama dengan Nota Dinas)
- [x] **Shared component**: `AssetLampiranLandscapeTable.tsx` — reusable landscape table dengan prefix-aware CSS (nd- atau pkpknl-), 10 kolom, auto-fill dari assets, jumlah row, TTD Kepala Balai.
- [x] **State hook**: `useNotaKpknlBuilderState.ts` — perihal, lampiran, lokasi, tembusan (SkBuilderItem[]), kesimpulan, nilaiTaksiran.
- [x] **Section editors**: `NotaDinasSection.tsx` + `PermohonanKpknlSection.tsx` — builder panels dengan textarea + tembusan list editor + input nilai taksiran.
- [x] **Body paragraph formatting**:
  - Indent 2.5em untuk "Dalam rangka..." dan "Demikian..." paragraphs (preview + print window CSS)
  - Nilai perolehan + nilai taksiran dengan terbilang lowercase + suffix `,-`
  - Lokasi inline editable di dalam paragraph pertama
- [x] **Tembusan conditional numbering**: jika 1 item → tanpa nomor, jika 2+ → numbered list `1.`, `2.`, dst.
- [x] **TTD format**: tanpa label "Kepala Balai,", hanya `${ttd_pengirim}` placeholder + nama (tidak bold) + NIP.
- [x] **Lampiran landscape**:
  - Tabel 10 kolom dengan column widths optimized (Kode Barang 10%, Keterangan 13%)
  - `whiteSpace: nowrap` untuk Kode Barang, Tahun Perolehan, Nilai Perolehan/Taksiran cells agar tidak pecah baris
  - Jumlah row dengan background gray
  - TTD Kepala Balai di kanan bawah
- [x] **numberToWords() fix**: Handle Juta/Miliar/Triliun correctly di `auction-helpers.ts` (sebelumnya hanya sampai Ribu, causing 246 million → "dua ratus empat puluh enam ribu..." instead of "dua ratus empat puluh enam juta...").
- [x] **Wire-up**: `useDocumentToggles` (showNotaDinas + showPermohonanKpknl), `useDocumentNumbers` (notaDinasNumber default "270" + permohonanKpknlNumber default "331"), `DocumentActions` (tombol lime + violet, grid 3×4), `DocumentNumberInputs` (2 panel input baru, label "12 dokumen"), `SelectedAssetsBanner` (2 tombol Cetak baru), `page.tsx` (render sections).
- [x] **Print window CSS**: Both documents have full print CSS with `@page` A4 portrait/landscape, margin BSrE safe area, body paragraph `text-indent: 2.5em`.
- [x] **Default numbers**: Nota Dinas `ND.270/...`, Permohonan KPKNL `S.331/...`.

### Pending:
- [ ] **Deploy ke SSH production**: Ditunda sesuai permintaan user.

### Key Files:
- New (8): `_lib/nota-kpknl-defaults.ts`, `_hooks/useNotaKpknlBuilderState.ts`, `_components/AssetLampiranLandscapeTable.tsx`, `_components/NotaDinasDocument.tsx`, `_components/PermohonanKpknlDocument.tsx`, `_components/sections/NotaDinasSection.tsx`, `_components/sections/PermohonanKpknlSection.tsx`
- Modified (7): `_lib/auction-helpers.ts`, `_hooks/useDocumentToggles.ts`, `_hooks/useDocumentNumbers.ts`, `_components/DocumentActions.tsx`, `_components/DocumentNumberInputs.tsx`, `_components/SelectedAssetsBanner.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### User Corrections Applied:
1. ✅ Judul "NOTA DINAS" dan "Nomor : ..." TIDAK pakai garis bawah
2. ✅ TIDAK ada garis horizontal di bawah baris Tanggal
3. ✅ Tembusan: jika hanya 1 item → tampil tanpa nomor, jika 2+ → pakai numbered list
4. ✅ TTD: TIDAK ada label "Kepala Balai,", hanya `${ttd_pengirim}` placeholder + nama (tidak bold) + NIP
5. ✅ Tembusan title "Tembusan :" tidak bold
6. ✅ Body paragraph indent 2.5em (masuk ke dalam) untuk "Dalam rangka..." dan "Demikian..."
7. ✅ Lampiran landscape: Kode Barang tidak boleh pecah baris (nowrap), Keterangan harus cukup lebar (13%)
8. ✅ Nilai terbilang pakai lowercase + suffix `,-` (contoh: "dua ratus empat puluh enam juta empat ratus sepuluh ribu rupiah")
9. ✅ Fixed numberToWords() untuk handle Juta/Miliar/Triliun (was only handling up to Ribu)

---

# Progress - Phase 59: SK Tim Penilai (Panitia Penaksir Harga BMN)

> Document updated: 2026-05-23
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #370: Add SK Tim Penilai document with print pagination

### Completed:
- [x] **Issue Created**: Issue #370.
- [x] **PR Created/Merged**: PR #371 merged ke `main` (merge commit `5a9a9de`).
- [x] **Branch Cleanup**: remote branch `issue/370-sk-tim-penilai` deleted after merge.
- [x] **Defaults**: `_lib/sk-tim-penilai-defaults.ts` — `TimPenilaiAnggota` interface (4 fields), `SkTimPenilaiMemutuskan` (5 fields incl. keempat), 13 peraturan default, 3 anggota default.
- [x] **Builder hook**: `useSkTimPenilaiBuilderState` — state Menimbang/Mengingat/Memutuskan/Tembusan.
- [x] **List hook**: `useTimPenilaiList` — CRUD + select pegawai.
- [x] **Builder UI**: `SkTimPenilaiBuilder` — varian SkBuilder dengan KEEMPAT textarea + ring emerald.
- [x] **Document**: `SkTimPenilaiDocument` — judul beda, 4 keputusan + KEEMPAT row, lampiran tabel 4 kolom, JS print pagination dengan continuation words.
- [x] **Editor**: `TimPenilaiEditor` — list editor + field Keterangan.
- [x] **Section**: `SkTimPenilaiSection` — preview wrapper.
- [x] **Wire-up**: `useDocumentToggles` (showSkTimPenilai), `useDocumentNumbers` (skTimPenilaiNumber default "107"), `DocumentActions` (tombol emerald, grid 3×3), `DocumentNumberInputs` (panel SK Tim Penilai), `SelectedAssetsBanner` (Cetak SK Tim Penilai), `page.tsx` (render section).
- [x] **Print pagination**: mirror SK Panitia mechanism — sambungan kata pojok kanan bawah, margin BSrE 28mm bawah halaman utama, 18mm atas halaman lanjutan, blok-blok dipaginate (Menimbang → Mengingat → MEMUTUSKAN+Menetapkan → KESATU → KEDUA → KETIGA → KEEMPAT+TTD+Tembusan).

### Pending:
- [ ] Deploy ke SSH production (ditunda sesuai permintaan user).

### Key Files:
- New: `_lib/sk-tim-penilai-defaults.ts`, `_hooks/useSkTimPenilaiBuilderState.ts`, `_hooks/useTimPenilaiList.ts`, `_components/SkTimPenilaiBuilder.tsx`, `_components/SkTimPenilaiDocument.tsx`, `_components/TimPenilaiEditor.tsx`, `_components/sections/SkTimPenilaiSection.tsx`
- Modified: `_hooks/useDocumentToggles.ts`, `_hooks/useDocumentNumbers.ts`, `_components/DocumentActions.tsx`, `_components/DocumentNumberInputs.tsx`, `_components/SelectedAssetsBanner.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 58: Auction Layout Cleanup + Production Deploy

> Document updated: 2026-05-23
> Status: **MERGED + DEPLOYED** ✅

---

## Issue #368: Cleanup auction-candidates layout + fix Total Rusak Berat

### Completed:
- [x] **Issue Created**: Issue #368.
- [x] **PR Created/Merged**: PR #369 merged ke `main` (merge commit `e2dee79`).
- [x] **Branch Cleanup**: remote branch `issue/368-cleanup-auction-layout` deleted after merge.
- [x] **Bug fix Total Rusak Berat**: dedicated count query `bmn-auction-candidates-count` (per_page=1) di `useAuctionAssets`. Total stabil regardless dari pagination.
- [x] **PageHeader simplified**: title + subtitle + Reset Pilihan saja.
- [x] **DocumentActions (NEW)**: card grid 4-kolom × 2-baris untuk 8 Generate buttons.
- [x] **DocumentNumberInputs collapsible**: default tertutup, grid 3-kolom + sub-card Referensi ST.
- [x] **SelectedAssetsBanner Cetak-only**: hapus 8 Generate duplikat. Pesan kontekstual.
- [x] **Spacing**: `space-y-8` → `space-y-6` untuk tighter layout.
- [x] **Production deployed**: server pulled main, backend + frontend rebuilt, migrations applied.

### Key Files:
- `_hooks/useAuctionAssets.ts` (count query baru + `totalRusakBerat`)
- `_components/PageHeader.tsx` (simplified)
- `_components/DocumentActions.tsx` (NEW)
- `_components/DocumentNumberInputs.tsx` (collapsible)
- `_components/SelectedAssetsBanner.tsx` (Cetak-only)
- `page.tsx` (wire up baru)

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

## Production Deploy Batch (2026-05-23)

### Scope:
39 commit batch dari `60151b2` → `e2dee79`. Mencakup issue #346, #348, #350, #352, #354, #356, #358, #360, #361, #364, #365, #368.

### Steps:
- [x] SSH to `ec2-user@15.135.114.1` dengan `bksda-superapp.pem`
- [x] `git pull origin main` di server (39 commit fast-forward)
- [x] `docker-compose ... build backend frontend`
- [x] `docker-compose ... up -d backend frontend` (recreate)
- [x] `php artisan migrate --force` — 2 migrations applied:
  - `add_no_mesin_to_bmn_assets_table` (34.46ms)
  - `add_template_type_to_st_assignment_letters_table` (16.41ms)

### Verification:
- [x] Container `bksda-backend` Up
- [x] Container `bksda-frontend` Up
- [x] `https://bksdakaltim.net/login` → HTTP 200
- [x] `https://bksdakaltim.net/bmn/auction-candidates` → HTTP 307 (protected, expected)
- [x] `migrate:status` confirm 2 migrations `Ran` (batch 4)

---

# Progress - Phase 57: BMN Penghapusan Template Finalize

> Document updated: 2026-05-23
> Status: **MERGED** ✅

---

## Issue #364: Finalize BMN Penghapusan Template State

### Completed:
- [x] **Issue Created**: Issue #364.
- [x] **PR Created/Merged**: PR #367 merged ke `main` (merge commit `560f752`).
- [x] **Branch Cleanup**: remote branch `issue/364-st-template-bmn` deleted after merge.
- [x] **Backend migration**: `add_template_type_to_st_assignment_letters_table.php` — kolom `template_type` (nullable string max:50) `after('kode_surat')`.
- [x] **Backend Model**: `AssignmentLetter` `$fillable` ditambah `template_type`.
- [x] **Backend Request**: validation rule `template_type` nullable|string|max:50.
- [x] **Backend Controller**: `store()` dan `update()` simpan `template_type`.
- [x] **Frontend templateType state** independent dari sumberDana (builder + create).
- [x] **buildBiayaText**: return `''` saat templateType BMN (skip baris biaya).
- [x] **buildUntukText**: paksa freeform tanpa date suffix saat templateType BMN.
- [x] **STBuilderPreview**: item ke-3 Untuk pakai "7 (tujuh) hari" (tanpa "kerja") saat templateType BMN.
- [x] **Tombol Apply/Reset di paling atas sidebar** (builder + create) — card orange dengan toggle state.
- [x] **applyBmnTemplate**: defaults `klasifikasi=KAP.05`, `sumberDana=dl1`, `tanggalMulai=tanggalSelesai=today`.
- [x] **resetBmnTemplate**: clear templateType only (state lain dibiarkan).
- [x] **handlePrint create page** disync dengan builder full CSS rules (KOP, surat-content, untuk-entry break-inside, @page margin).
- [x] **Rule global `.penutup-ttd-group`**: bungkus `Demikian + TTD + Tembusan` dengan `pageBreakInside: avoid` (semua ST, bukan hanya BMN).
- [x] **Badge "Template BMN" di Inbox**: list cards + detail panel pill.
- [x] **Badge "Template BMN" di History**: table cell di samping `nomor_surat`.
- [x] **API payloads** include `template_type` (3 di builder + 1 di create).
- [x] **fetchAndParse** load `template_type` dari API saat edit existing ST.
- [x] **Hapus opsi `bmn`** dari `SUMBER_DANA_OPTIONS` (tidak diperlukan lagi).
- [x] **Local migration applied** — kolom `template_type` ada di local DB.

### Pending / TODO:
- [ ] **Production migrate**: Wajib `php artisan migrate` di backend container saat deploy ke SSH production.

### Key Files:
- Backend: `Migrations/2026_05_23_100000_*.php` (new), `Models/AssignmentLetter.php`, `Requests/AssignmentLetterRequest.php`, `Controllers/AssignmentLetterController.php`
- Frontend builder: `surat-tugas/builder/[id]/page.tsx`, `STBuilderPreview.tsx`
- Frontend create: `surat-tugas/create/page.tsx`
- Frontend list: `surat-tugas/inbox/page.tsx`, `_components/AssignmentHistoryTab.tsx`

### Validation:
- [x] `php -l` clean (4 PHP files)
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Out of Scope (sesuai konfirmasi user):
- ❌ TIDAK ada tombol "Generate ST Pemeriksaan" di /bmn/auction-candidates.
- ❌ TIDAK ada redirect dari modul BMN.

---

# Progress - Phase 56: Refactor Auction Candidates Page

> Document updated: 2026-05-23
> Status: **MERGED** ✅

---

## Issue #365: Refactor auction-candidates page.tsx into hooks and section components

### Completed:
- [x] **Issue Created**: Issue #365.
- [x] **PR Created/Merged**: PR #366 merged ke `main` (merge commit `d90a519`).
- [x] **Branch Cleanup**: remote branch `issue/365-refactor-auction-candidates-page` deleted after merge.
- [x] **page.tsx**: 1184 → 288 baris (~75% reduction).
- [x] **8 custom hooks** baru di `_hooks/`:
  - `useAuctionAssets` — query + selection + ordering + drag-drop
  - `useDocumentToggles` — 8 show flags + handleProcess* + resetAllShows + scroll
  - `useDocumentNumbers` — 11 number/date states
  - `useEmployeeOptions` — sorted employees
  - `usePemeriksaList` / `usePanitiaList` — CRUD + select pegawai
  - `useSkBuilderState` / `useSkPanitiaBuilderState` — SK state
- [x] **7 UI components** baru di `_components/`:
  - `PageHeader`, `SearchBar`, `DocumentNumberInputs`, `SelectedAssetsBanner`, `AssetTable`, `PemeriksaEditor`, `PanitiaEditor`
- [x] **8 section wrappers** baru di `_components/sections/`:
  - BaKoreksi, SkPenghentian, SkPanitia, SptjLimit, Sptjm, SpTugas, SkKebenaran, BaPemeriksaan
- [x] **Zero behavior change**: className, IDs, layouts, side-effects, validation toasts, disable rules — semua identical.
- [x] **Existing files untouched**: Document components, SkBuilder, ReorderPanel, SummaryTile, `_lib/`.
- [x] **Print handlers preserved**: `handlePrintBa`, `handlePrintSk`, dll tetap di page.tsx.
- [x] **`kepalaBalai` shared**: SK Penghentian & SK Panitia pakai single source dari `useSkBuilderState`.

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx` (refactored)
- `frontend/src/app/bmn/auction-candidates/_hooks/*.ts` (8 new files)
- `frontend/src/app/bmn/auction-candidates/_components/*.tsx` (7 new files)
- `frontend/src/app/bmn/auction-candidates/_components/sections/*.tsx` (8 new files)

### Pattern Reference:
- Issue #340 (refactor sebelumnya yang split page.tsx jadi 6 file).

---

# Progress - Phase 55: Generate ST Pemeriksaan Redirect (WIP)

> Document updated: 2026-05-22 (sore)
> Status: **WIP — siap user testing besok** ⏳

---

## Issue #364: Generate ST Pemeriksaan Button + Auto-fill Template + Cetak Fix + TTD Group Rule

### Completed (di branch `issue/364-generate-st-pemeriksaan`):
- [x] **Issue Created**: Issue #364.
- [x] **Branch + WIP Commit**: `issue/364-generate-st-pemeriksaan` di-push (commit `8523646`).
- [x] **Tombol indigo "Generate ST Pemeriksaan"**: Di action bar dan banner `/bmn/auction-candidates`. Onclick `router.push('/kepegawaian/surat-tugas/create?template=bmn-pemeriksaan')`.
- [x] **ST create auto-fill via query param**: `useEffect` deteksi `template=bmn-pemeriksaan`, set state via `templateAppliedRef` (one-shot).
- [x] **Klasifikasi**: `KAP.05` saat template aktif.
- [x] **Sumber Dana**: opsi baru `bmn` ("BMN Penghapusan (tanpa biaya)") di SUMBER_DANA_OPTIONS create page.
- [x] **Menimbang 2 items + Dasar 8 peraturan**: Sama dengan template di builder.
- [x] **buildBiayaText**: return empty saat `sumberDana === 'bmn'` → baris biaya skip.
- [x] **buildUntukText fix**: Support mode freeform (clean text dari `namaKegiatan`). Saat `bmn`, paksa freeform tanpa suffix "selama X hari" meski user isi tanggal mulai/selesai.
- [x] **handlePrint create page synced dengan builder**: CSS rules lengkap (KOP, surat-content, untuk-entry break-inside, @page margin 3cm/0.7cm) → cetak/save PDF tidak rusak.
- [x] **Conditional laporan tertulis text**: `bmn` pakai "7 (tujuh) hari" (tanpa "kerja"). Default tetap "7 (tujuh) hari kerja".
- [x] **Rule global TTD**: Bungkus `Demikian + TTD + Tembusan` jadi `.penutup-ttd-group` dengan `pageBreakInside: avoid`. Kalau TTD tidak fit halaman, seluruh blok turun ke halaman berikutnya.

### Pending / TODO Besok:
- [ ] **User testing**: Refresh, klik tombol indigo, cek Untuk format (harus 1 baris saja, tanpa "dari... ke... selama"), preview cetak, save PDF, rule TTD pagination.
- [ ] **Fix bugs jika ada** di branch yang sama.
- [ ] **PR + merge** kalau testing OK.

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 54: BA Pemeriksaan Lampiran + ST BMN Template

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #361: BA Pemeriksaan Lampiran (Asset Table + Dual-Column TTD)

### Completed:
- [x] **Issue Created**: Issue #361.
- [x] **PR Created/Merged**: PR #362 merged ke `main` (merge commit `6b2ac4a`).
- [x] **Branch Cleanup**: remote branch `issue/361-ba-pemeriksaan-lampiran` deleted after merge.
- [x] **Lampiran page**: `page-break-before: always`, halaman 2 setelah halaman utama BA.
- [x] **Header lampiran editable**: Lampiran / Nomor / Tanggal (semua editable inline).
- [x] **Tabel 11 kolom**: No, Kode Barang, NUP, Nama Barang, Merk/Type, No Polisi, Tahun Perolehan, Nilai Perolehan (Rp), Nilai Buku, Nilai Taksiran (Rp), Kondisi.
- [x] **All cells contentEditable**: Inline edit semua sel tabel.
- [x] **Dual-column TTD**:
  - Kiri: `Samarinda, {date}` / `Pelaksana Kegiatan,` / 2x2 grid pemeriksa (kolom kiri 1,2; kolom kanan 3,4) dengan ruang paraf, nama bold, NIP.
  - Kanan: `Mengetahui,` / `Kepala Balai,` / ruang TTD / nama bold + NIP.
- [x] **Page-break safety**: Row tabel + TTD block `break-inside: avoid`.
- [x] **Asset count guard**: Tombol Generate BA Pemeriksaan disabled saat 0 aset; handler check minimal 1 aset.
- [x] **Props baru**: BaPemeriksaanDocument terima `assets: AuctionAsset[]` dan `kepalaBalai: SkKepalaBalai`.

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

## Issue #360: Apply BMN Penghapusan Template Button for ST Builder

### Completed:
- [x] **Issue Created**: Issue #360.
- [x] **PR Created/Merged**: PR #363 merged ke `main` (merge commit `270394d`).
- [x] **Branch Cleanup**: remote branch `issue/360-st-bmn-template` deleted after merge.
- [x] **New SUMBER_DANA option**: `bmn` (label `BMN Penghapusan (tanpa biaya)`).
- [x] **buildBiayaText**: Return empty string saat `sumberDana === 'bmn'`.
- [x] **applyBmnTemplate handler**: One-click set Klasifikasi `KAP.05`, sumberDana `bmn`, header `KEPALA BALAI,`, Menimbang (2 items), Dasar (8 peraturan UU/PP/Perpres/PMK), freeform Untuk dengan placeholder `{tanggal_pemeriksaan}`, reset tembusan.
- [x] **Tombol orange "Apply Template BMN Penghapusan"**: Di sidebar ST Builder di atas Sumber Dana select.
- [x] **Preview filter**: STBuilderPreview filter empty string di Untuk list agar baris biaya kosong tidak ter-render.

### Key Files Modified:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint <both files> --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### How to Use:
1. Buka ST manapun di builder (`/kepegawaian/surat-tugas/builder/[id]`).
2. Klik **Apply Template BMN Penghapusan** (orange) di sidebar.
3. Isi tanggal pemeriksaan dan pilih 4 pegawai pemeriksa.
4. Save & generate.

---

# Progress - Phase 53: Add no_mesin Field for Motor Vehicles

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #358: Add no_mesin Field for Motor Vehicles with no_polisi

### Completed:
- [x] **Issue Created**: Issue #358.
- [x] **PR Created/Merged**: PR #359 merged ke `main` (merge commit `bed9cce`).
- [x] **Branch Cleanup**: remote branch `issue/358-add-no-mesin` deleted after merge.
- [x] **Migration**: `2026_05_22_163000_add_no_mesin_to_bmn_assets_table.php` — kolom `no_mesin` nullable string, posisi `after('no_stnk')`.
- [x] **Backend Model**: `Asset` `$fillable` ditambah `no_mesin`.
- [x] **Backend Resource**: `AssetResource` expose `no_mesin` di response API.
- [x] **Backend Validation**: `UpdateAssetRequest` rule `['sometimes', 'nullable', 'string']`.
- [x] **Frontend Detail Asset**: `bmn/assets/[id]/page.tsx` tambah `EditableRow` + `DetailRow` untuk "No Mesin" — conditional render hanya untuk `ALAT ANGKUTAN BERMOTOR` + `no_polisi` valid (mirror pattern `no_rangka`).
- [x] **Frontend Auction Helpers**: `AuctionAsset` interface ditambah `no_mesin?: string | null`.
- [x] **SK Kebenaran Auto-fill**: `SkKebenaranDokumenDocument.tsx` kolom Nomor Mesin auto-fill dari `asset.no_mesin || ""` (tetap editable inline via `contentEditable`).
- [x] **Local migration applied**: `php artisan migrate --path=...` SELESAI di local DB.

### Pending / TODO:
- [ ] **Production migrate**: Wajib `php artisan migrate` di backend container saat deploy ke SSH production.

### Key Files Created:
- `backend/database/migrations/2026_05_22_163000_add_no_mesin_to_bmn_assets_table.php`

### Key Files Modified:
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `backend/app/Modules/Bmn/Requests/UpdateAssetRequest.php`
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/auction-helpers.ts`
- `frontend/src/app/bmn/auction-candidates/_components/SkKebenaranDokumenDocument.tsx`

### Validation:
- [x] `php -l` clean for 4 PHP files (Asset.php, AssetResource.php, UpdateAssetRequest.php, migration).
- [x] `npx eslint "src/app/bmn/**" --max-warnings=0` clean.
- [x] `npx tsc --noEmit` clean.
- [x] `npm run build` clean (59/59 static pages).

---

# Progress - Phase 52: 5 Supporting Documents for Auction

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #356: 5 Supporting Documents for Auction Candidates

### Completed:
- [x] **Issue Created**: Issue #356.
- [x] **PR Created/Merged**: PR #357 merged ke `main` (merge commit `1b88d7c`).
- [x] **Branch Cleanup**: remote branch `issue/356-bmn-supporting-documents` deleted after merge.
- [x] **SPTJ Nilai Limit** (`SM.41/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tanggung jawab nilai limit + TTD Kepala Balai.
- [x] **SPTJM** (`SPTJM.202/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tanggung jawab mutlak + TTD Kepala Balai.
- [x] **SP Tidak Mengganggu Tugas** (`SM.40/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tidak ganggu tugas dinas + TTD Kepala Balai.
- [x] **SK Kebenaran Fotokopi Dokumen Kepemilikan** (`KT.200/K.18/TU/KAP.06.01/MM/YYYY`): judul 4 baris, tabel 6 kolom (No, No Dokumen, Merk/Tipe, No Mesin, No Rangka, No Polisi). Semua sel `contentEditable`. Data otomatis dari `no_identitas`, `merk_tipe`, `no_rangka`, `no_polisi`. Pangkat/Gol `Pembina Muda Tk.I / IV b`. Nomor Mesin default kosong.
- [x] **BA Pemeriksaan BMN** (`BA.158/K.18/TU/KAP.06.01/MM/YYYY`): 4 pemeriksa default editable (DHENY MARDIONO, HERYANTO SUMANBOWO, HARDI PURNAMA, TEGAR ANUGRAH). Select pegawai dari `/kepegawaian/employees/select`. Input Nomor ST + Tanggal ST. Spelled date. **Tanpa TTD Kepala Balai**.
- [x] **Pattern reuse**: setiap dokumen pakai `window.open()` + inject HTML/CSS print, KOP `/header-new.png`, Bookman Old Style 11pt.
- [x] **A4 + BSrE safe area**: `@page { size: A4; margin: 0 0 28mm 0; }` untuk semua dokumen baru.
- [x] **Action bar tombol**: blue (SPTJ Limit), purple (SPTJM), pink (SP Tugas), cyan (SK Kebenaran), orange (BA Pemeriksaan).
- [x] **Panel input nomor surat**: grid 2/3 kolom untuk 5 nomor baru + Nomor ST + Tanggal ST.
- [x] **Helper `resetAllShows()`**: dokumen mutually exclusive (hanya 1 preview tampil sekaligus).
- [x] **No backend migration**: Nomor Mesin di-handle inline-edit di SK Kebenaran (tidak nambah field DB).

### Pending / TODO:
- [ ] **Deploy ke SSH production**: Tunggu batch BMN siap deploy.

### Key Files Created:
- `frontend/src/app/bmn/auction-candidates/_components/SptjLimitDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SptjmDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SpTugasDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SkKebenaranDokumenDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/pemeriksa-defaults.ts`

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/auction-helpers.ts`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 51: SK Panitia Penghapusan BMN

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #354: SK Panitia Penghapusan BMN

### Completed:
- [x] **Issue Created**: Issue #354.
- [x] **PR Created/Merged**: PR #355 merged ke `main` (merge commit `c353bee`).
- [x] **Branch Cleanup**: remote branch `issue/354-sk-panitia-penghapusan` deleted after merge.
- [x] **SK Panitia Document**: Komponen `SkPanitiaDocument.tsx` — mirip SK Penghentian tapi isi berbeda (Panitia Penghapusan).
- [x] **Defaults**: `sk-panitia-defaults.ts` — Menimbang 2 item, Mengingat 8 peraturan, Memutuskan (KEDUA punya sub-items), Tembusan 3 item (termasuk "Yang Bersangkutan").
- [x] **Lampiran tabel border**: No. | Nama/NIP/Jabatan | Jabatan dalam Kegiatan (tanpa Keterangan).
- [x] **Employee search**: Dropdown dari `/kepegawaian/employees/select` untuk susunan panitia. Auto-fill nama, NIP (formatted), jabatan instansi (dari field `position`).
- [x] **Toggle 3 dokumen**: BA / SK Penghentian / SK Panitia — hanya satu tampil.
- [x] **Tombol teal**: "Proses SK Panitia" di action bar dan banner.
- [x] **Input nomor SK Panitia**: Format `SK.____/K.18/TU/KAP.05/MM/YYYY`.
- [x] **Spacing tuning**: line-height 1.25, reduced margins/paddings, firstPageContentH=264mm, continuationContentH=251mm, marker reserve 9mm.
- [x] **Continuation words**: Pagination eksplisit dengan kata penyambung (reuse pattern dari SK Penghentian).
- [x] **TTD grouping**: `KETIGA + TTD + Tembusan` tetap satu paket agar TTD tidak jatuh sendiri tanpa kalimat pengantar.
- [x] **KEDUA sub-items**: sub-item a/b/c/d dirender sebagai grid supaya alignment stabil.
- [x] **Default Penanggung Jawab**: Kepala Balai `M. ARI WIBAWANTO, S.HUT., M.SC.` menjadi nomor 1 di susunan panitia dengan jabatan kegiatan `Penanggung Jawab`.
- [x] **Judul SK Panitia**: halaman 1 menampilkan baris `PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR`.
- [x] **Lampiran line break**: jabatan Kepala Balai di tabel lampiran memecah `Kalimantan Timur` ke baris bawah.
- [x] **Lint cleanup**: Bersihkan blocker lama di `portal` dan `EmployeeAccessSheet` sehingga full lint kembali clean.

### Pending / TODO:
- [ ] **Deploy ke SSH production**: Ditunda sampai user siap deploy batch BMN terbaru.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPanitiaDocument.tsx` (new)
- `frontend/src/app/bmn/auction-candidates/_lib/sk-panitia-defaults.ts` (new)
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx` (lint cleanup)
- `frontend/src/app/portal/page.tsx` (lint cleanup)
- `frontend/src/app/portal/surat-tugas/[id]/page.tsx` (lint cleanup)

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [x] `git diff --check` clean

---

# Progress - Phase 50: SK Continuation Words

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #352: Continuation Words at Page Breaks in SK Document

### Objective:
Saat halaman SK terpotong (misal Mengingat 8 di halaman 1, Mengingat 9 di halaman 2), tampilkan kata penyambung di pojok kanan bawah halaman yang terpotong. Contoh: `9. Peraturan Menteri Lingkungan.....` atau `KESATU.....`.

### Completed:
- [x] **Branch**: `issue/352-sk-continuation-words` aktif.
- [x] **Print-only pagination**: SK utama dipaginate menjadi halaman A4 eksplisit di `handlePrintSk`, sehingga preview cetak Chrome stabil.
- [x] **Continuation words**: Kata lanjutan muncul di pojok kanan bawah halaman sebelum item berikutnya turun, misalnya `9. Peraturan.....`, `MEMUTUSKAN.....`, atau `KETIGA.....`.
- [x] **Mengingat per item**: Setiap peraturan diperlakukan sebagai unit sendiri agar item panjang boleh turun halaman tanpa merusak item sebelumnya.
- [x] **MEMUTUSKAN + Menetapkan grouped**: Judul `MEMUTUSKAN` dan baris `Menetapkan` tetap satu kesatuan.
- [x] **KETIGA + TTD grouped**: Jika blok TTD harus turun ke halaman berikutnya, kalimat `KETIGA` ikut turun agar tanda tangan tidak terpotong sendiri.
- [x] **BSrE safe area**: Halaman utama memakai margin/padding bawah khusus untuk ruang teks tanda tangan elektronik otomatis dari aplikasi lain.
- [x] **Lampiran untouched**: Pagination lampiran SK tetap mengikuti aturan yang sudah disetujui sebelumnya.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `git diff --check -- frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx` clean

---

# Progress - Phase 49: SK Builder Panel

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #350: SK Builder Panel beside SK Preview

### Completed:
- [x] **Issue Created**: Issue #350.
- [x] **PR Created/Merged**: PR #351 merged ke `main` (merge commit `b833a20`).
- [x] **Branch Cleanup**: `issue/350-sk-builder` deleted after merge.
- [x] **Split Layout**: Builder di kiri (`lg:grid-cols-[400px_1fr]`), preview di kanan, builder ter-hide saat cetak (`print:hidden`).
- [x] **Card Menimbang**: Default 2 item (a, b). Tombol "+ Tambah" untuk c, d, e, ... Tombol "Hapus" per item (disabled jika hanya 1 tersisa).
- [x] **Card Mengingat**: Default 9 peraturan. Tambah/hapus item. Number column diperbesar dari 6mm → 9mm untuk 2-digit (10+).
- [x] **Card Memutuskan**: 4 textarea (Menetapkan, KESATU, KEDUA, KETIGA), tidak bisa tambah/hapus.
- [x] **Card Kepala Balai**: Dropdown dari API `/kepegawaian/employees/select`, sorted alphabetically. On select: nama auto-uppercase (`UPPERCASE`), NIP auto-format spasi (`19740514 199903 1 001`).
- [x] **Card Tembusan**: Default 2 item, tambah/hapus. Rendering: jika hanya 1 item → tanpa nomor, jika 2+ → nomor `1.`, `2.`, dst.
- [x] **KETIGA + TTD halaman 2 grouped**: `break-inside: avoid` agar kalau TTD turun, KETIGA ikut turun (tidak terpisah).
- [x] **Nama Kepala Balai tidak bold**: TTD halaman 2 + TTD lampiran (preview + print).
- [x] **State management**: Lifted ke `page.tsx`, di-pass sebagai props ke SkBuilder dan SkPenghentianDocument.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_lib/sk-defaults.ts` (new)
- `frontend/src/app/bmn/auction-candidates/_components/SkBuilder.tsx` (new)
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

---

# Progress - Phase 48: SK Colon Alignment

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #348: Align Colons in SK Ditetapkan/Pada tanggal Block

### Completed:
- [x] **Issue Created**: Issue #348.
- [x] **PR Created/Merged**: PR #349 merged ke `main` (merge commit `b29e5f5`).
- [x] **Branch Cleanup**: `issue/348-sk-colon-align` deleted after merge.
- [x] **Grid 3 kolom**: `label / colon / value` dengan `grid-template-columns: max-content auto 1fr` agar `:` sejajar atas-bawah.
- [x] **Inline `display: grid`**: Tidak bergantung pada Tailwind class supaya berlaku di print window.
- [x] **CSS `.sk-ttd-meta`**: Ditambahkan di handlePrintSk print CSS dan `@media print` block dengan `display: grid !important`.
- [x] **Konsisten preview + print**: ':' sejajar di kedua mode.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean

---

# Progress - Phase 47: BA & SK TTD Spacing

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #346: Widen TTD Spacing in BA and SK Documents

### Completed:
- [x] **Issue Created**: Issue #346.
- [x] **PR Created/Merged**: PR #347 merged ke `main` (merge commit `fa24541`).
- [x] **Branch Cleanup**: `issue/346-ba-ttd-spacing` deleted after merge.
- [x] **BA Halaman 1**: `Kepala Balai,` → 2rem spacing → `${ttd_pengirim}` → 2rem spacing → `M. ARI WIBAWANTO`.
- [x] **BA Lampiran**: Sama, jarak `mt-8` (2rem) di atas dan bawah placeholder.
- [x] **SK Halaman 2**: Spasi atas + bawah placeholder ditambah 2rem.
- [x] **SK Lampiran**: Spasi atas + bawah placeholder ditambah 2rem.
- [x] **Posisi horizontal**: Tidak berubah, `${ttd_pengirim}` tetap di tengah dengan padding-left 1.35cm.
- [x] **Print + screen consistent**: Tambah `margin-top: 2rem; margin-bottom: 2rem` di JSX (Tailwind `mt-8`), `handlePrintBa`/`handlePrintSk` print CSS, `@media print` block, dan screen CSS (`.sk-print-root`).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

---

# Progress - Phase 46: BA Koreksi Lampiran Pagination

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #344: BA Koreksi Lampiran Pagination & Bottom Margin

### Completed:
- [x] **Issue Created**: Issue #344.
- [x] **PR Created/Merged**: PR #345 merged ke `main` (`db598ca`).
- [x] **Branch Cleanup**: `issue/344-ba-lampiran-pagination` deleted after merge.
- [x] **`@page { margin-bottom: 28mm }`**: Margin bawah semua halaman untuk BSrE footer.
- [x] **Measured pagination final**: Natural browser pagination diganti menjadi halaman lampiran eksplisit berbasis hasil ukur tinggi row.
- [x] **`break-inside: avoid` per `<tr>`**: Setiap row tabel tidak terpotong di tengah.
- [x] **`display: table-header-group`**: Header tabel otomatis repeat di setiap halaman baru.
- [x] **Sebelum lalu Sesudah**: Urutan lampiran mengikuti dokumen resmi; bagian `I. Sebelum` selesai dulu sebelum `II. Sesudah`.
- [x] **TTD reserved space**: Signature block dihitung sebagai area utuh di halaman terakhir.
- [x] **Measured row pagination**: Lampiran BA memakai tinggi row aktual agar stabil untuk nama barang panjang-pendek.
- [x] **Sequential sections**: `I. Sebelum` diselesaikan dulu sampai habis, baru lanjut `II. Sesudah`.
- [x] **Continuation header**: Halaman lanjutan tidak mengulang label `I. Sebelum` / `II. Sesudah`; diganti baris nomor kolom `1 2 3 ...`.
- [x] **Signature safe area**: Halaman terakhir menghitung tinggi blok TTD agar `${ttd_pengirim}`, nama, dan NIP tidak terpotong.

### Pending / Known Issues:
- [ ] **Deploy ke SSH production**: Ditunda sampai user siap deploy batch BMN terbaru.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [ ] Full `npm run lint -- --max-warnings=0` masih blocked oleh issue lama tidak terkait di `portal` dan `EmployeeAccessSheet`.

---

# Progress - Phase 45: Editable BA Builder + Refactor

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #340: Refactor Auction Candidates Page
- [x] PR #341 merged. Split 1518-line page.tsx into 6 files.

## Issue #342: Editable BA Builder + Toggle BA/SK
- [x] PR #343 merged. BA Koreksi editable (contentEditable), KAP field editable, toggle BA/SK.

---

# Progress - Phase 44: SK Penghentian Penggunaan BMN

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #338: SK Penghentian Penggunaan BMN

### Completed:
- [x] **Issue Created**: Issue #338.
- [x] **PR Created/Merged**: PR #339 merged ke `main` (merge commit `1ddfb1a`).
- [x] **Input Nomor SK**: Format `SK.____/K.18/TU/KAP.05/MM/YYYY` (bulan+tahun otomatis).
- [x] **Tombol Generate SK**: Tombol amber "Generate SK Penghentian" di action bar dan banner.
- [x] **Preview SK**: KOP+Judul+Menimbang+Mengingat → MEMUTUSKAN+TTD+Tembusan → Lampiran tabel.
- [x] **KOP**: Pakai `header-new.png` (sama dengan ST Builder).
- [x] **Tabel Lampiran**: No, Kode Barang, NUP, Nama, Merk/Type, No Polisi, Tahun, Nilai, Kondisi, Keterangan + baris Jumlah + TTD.
- [x] **Label tidak bold**: Menimbang, Mengingat, Menetapkan, KESATU, KEDUA, KETIGA tidak bold.
- [x] **Print Mengingat fixed**: Grid/block layout — hanya item berikutnya yang turun, bukan seluruh bagian.
- [x] **TTD/Tembusan fixed**: Tidak bold, rata kiri, spacing rapi.
- [x] **Lampiran pagination**: Halaman pertama max 15 aset, tengah max 17, terakhir max 10.
- [x] **Lampiran continuation header**: Hanya muncul di halaman lanjutan.
- [x] **BSrE safe area**: `@page { margin-bottom: 28mm }` di semua halaman.
- [x] **Preview screen**: Disamakan dengan CSS print.

### Pending:
- [ ] Deploy ke SSH production (bersama issue #336).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`

---

# Progress - Phase 43: BMN Reorder Selected Assets

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #336: Reorder Selected Assets in Auction Candidates

### Completed:
- [x] **Issue Created**: Issue #336.
- [x] **PR Created/Merged**: PR #337 merged ke `main`.
- [x] **State Refactor**: `selectedIds` (Set) → `orderedIds` (array) untuk menjaga urutan.
- [x] **Panel Reorder**: "Urutan Aset Terpilih" dengan drag-and-drop native HTML5 + tombol ↑↓.
- [x] **Nomor Urut**: Badge merah (1, 2, 3, ...) per aset di panel.
- [x] **No Polisi**: Ditampilkan di panel jika aset memilikinya.
- [x] **Dokumen BA Koreksi**: Menggunakan urutan dari panel (bukan urutan API).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Note:
- Deploy ke SSH ditunda — masih ada fitur lanjutan di halaman ini.

---

# Progress - Phase 42: BMN Auction Candidates & BA Koreksi Kondisi

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #334: Aset Akan Di Lelang & BA Koreksi Kondisi BMN

### Completed:
- [x] **Issue Created**: Issue #334 tracks the BMN auction candidate page and first generated document workflow.
- [x] **PR Created/Merged**: PR #335 merged to `main` (`135ef77`).
- [x] **Sidebar Page**: Added `Aset Akan Di Lelang` in the BMN sidebar at `/bmn/auction-candidates`.
- [x] **Candidate Filtering**: Page loads BMN assets in `Rusak Berat` condition, with search, pagination, select all on page, and bulk selection.
- [x] **BA Koreksi Document**: Added preview/print for `BERITA ACARA KOREKSI PERUBAHAN KONDISI BARANG MILIK NEGARA`.
- [x] **Official Header**: Document uses `frontend/public/header-terbaru.png`.
- [x] **Print Layout Tuning**: Tuned A4 page 1 body, signature, `${ttd_pengirim}`, page 2 lampiran metadata, asset tables, and two-page print/save-PDF output.
- [x] **ST Builder Font Follow-up**: NIP and tembusan text now inherit the main ST Builder font size for both FOLU and non-FOLU layouts.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and production route checks passed.

### Key Files:
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/public/header-terbaru.png`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/page.tsx" "src/app/bmn/layout.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` is still blocked by unrelated pre-existing lint issues in `portal` and `EmployeeAccessSheet` files.

### Production:
- [x] Server pulled `main` to `135ef77`.
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d frontend`
- [x] `bksda-frontend` and `bksda-nginx` containers are up.
- [x] `https://bksdakaltim.net/login` returns HTTP 200.
- [x] `https://bksdakaltim.net/bmn/auction-candidates` returns HTTP 307 to login because the route is protected.

---

# Progress - Phase 41: Kepegawaian ST Builder TTE & Tembusan Fix

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #332: ST Builder TTE Placeholder & Tembusan Numbering

### Completed:
- [x] **Issue Created**: Issue #332 tracks ST Builder print/PDF alignment for Srikandi TTE and non-FOLU tembusan numbering.
- [x] **PR Created/Merged**: PR #333 merged to `main` (`c67aca5`).
- [x] **TTE Placeholder Alignment**: Adjusted `${ttd_pengirim}` placement for FOLU and non-FOLU layouts so Srikandi TTE/QR lands in the signature area without covering the Kepala Balai name/NIP.
- [x] **Signature Spacing**: Increased placeholder height to reserve enough vertical space for large TTE overlays.
- [x] **Non-FOLU Tembusan Rule**: Single tembusan recipient now renders without numbering; two or more recipients remain numbered. FOLU tembusan remains numbered.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` is still blocked by unrelated pre-existing lint issues in `portal` and `EmployeeAccessSheet` files.

---

# Progress - Phase 40: BMN Vehicle Document Uploads & Prod Bugfix

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #330: Add No Rangka Field for Motor Vehicles

### Completed:
- [x] **Database Migration**: Added `no_rangka` column to `bmn_assets` table.
- [x] **Backend Updates**: Added `no_rangka` to `Asset` model `$fillable`, `AssetResource.php`, and validation rules in `UpdateAssetRequest.php`.
- [x] **Frontend UI**: Updated `page.tsx` to conditionally render the "No Rangka" field below "No STNK" only when `jenis_bmn` is `ALAT ANGKUTAN BERMOTOR` and `no_polisi` exists.

### Key Files:
- `backend/database/migrations/2026_05_19_134552_add_no_rangka_to_bmn_assets_table.php`
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `backend/app/Modules/Bmn/Requests/UpdateAssetRequest.php`
- `frontend/src/app/bmn/assets/[id]/page.tsx`

---

## Issue #329: BPKB & STNK Upload for Vehicle Assets

### Completed:
- [x] **Database Migration**: Added 6 new columns to `bmn_assets` for 4 BPKB photos and 2 STNK photos.
- [x] **Backend Updates**: Updated `Asset` model `$fillable` and `forceDeleted` events. Modified `AssetResource` and `AssetPhotoController` to handle file uploads/deletions and ZIP downloads for the new document types.
- [x] **Frontend UI**: Refactored `PhotoGallery.tsx` and updated `page.tsx` to conditionally render a "Dokumen Kendaraan" section for `ALAT ANGKUTAN BERMOTOR` with a valid `no_polisi`.
- [x] **UI Improvement**: Relocated the "No BPKB" field from the Dokumen tab to the Identitas BMN (Kendaraan & Sertifikat) tab for better grouping.

### Production Bugfix (Issue #324 Regression):
- **Problem**: In production, the "Pilih Semua" and "Pilih hanya aset baru" buttons in the Import Review page were missing, and the "Setujui" button was locked. This worked in local development.
- **Root Cause**: The backend container was built using an old `Dockerfile` image cache that didn't include the recent PR #324 logic (`filtered_new` counts) because a simple `docker-compose restart` was used instead of `docker-compose build`.
- **Resolution**: SSH'd into the EC2 server and fully rebuilt the backend Docker image (`docker-compose build backend` & `up -d backend`), successfully syncing the container code with `main` and restoring the selection functionality.

### Key Files:
- `backend/database/migrations/2026_05_19_112752_add_bpkb_stnk_photos_to_bmn_assets_table.php`
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Controllers/AssetPhotoController.php`
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx`
- `frontend/src/app/bmn/assets/[id]/page.tsx`

---

# Progress - Phase 39: BMN Disposal Invalid Date Fix & RustFS Cleanup

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #326: BMN Disposal Invalid Date

### Completed:
- [x] **Issue Created**: Issue #326 tracks the "Invalid Date" bug on the disposal page.
- [x] **PR Created/Merged**: PR #327 merged to `main`.
- [x] **Root Cause Identified**: The `deleted_at` field was missing from the `AssetResource` API response.
- [x] **Backend Fix**: Added `deleted_at` to `AssetResource.php`.
- [x] **Frontend Fix**: Added null safety check and `id-ID` locale formatting for the deletion date in `disposal/page.tsx`.

### Key Files:
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `frontend/src/app/bmn/disposal/page.tsx`

---

## Issue #328: RustFS Cleanup on Force Delete

### Completed:
- [x] **PR Created/Merged**: PR #328 merged to `main`.
- [x] **Root Cause Identified**: `bulkForceDelete` used a query builder delete, bypassing Eloquent model events. Consequently, physical photo files remained in RustFS (S3) after permanent deletion.
- [x] **Model Event Added**: Implemented `booted` method in `Asset.php` with a `forceDeleted` event listener to delete all 5 photo paths from storage.
- [x] **Controller Fix**: Updated `bulkForceDelete` in `AssetController.php` to fetch models and iterate with `$asset->forceDelete()` so that events are triggered.

### Key Files:
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Controllers/AssetController.php`

---

# Progress - Phase 38: Production Fixes + ST Builder FOLU Template

## Issue #318: ST Builder Bottom Print Margin

### Completed:
- [x] **Issue Created**: Issue #318 tracks removal of the temporary BSrE footer test and preservation of bottom print spacing.
- [x] **PR Created/Merged**: PR #319 merged to `main` (`83f89c6`).
- [x] **Temporary Footer Removed**: BSrE test text is not part of the final output.
- [x] **Bottom Margin Preserved**: Print bottom margin stays at `1.9cm` for page 1 and continuation pages.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Current Print CSS State:
```css
@page { size: A4; margin: 3cm 1cm 1.9cm 1.55cm; }
@page :first { margin: 0.7cm 1cm 1.9cm 1.55cm; }
```

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test ST Builder print preview spacing on production.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #320: Production Storage Proxy + Employee ST Link

### Completed:
- [x] **Issue Created**: Issue #320 tracks profile photo SSL errors and employee ST create route 404.
- [x] **PR Created/Merged**: PR #321 merged to `main` (`36298ca`).
- [x] **Storage Same-Origin Proxy**: Production storage URL now uses `https://bksdakaltim.net/storage`.
- [x] **Nginx Storage Proxy**: HTTPS `/storage/` now proxies to RustFS bucket `bksda`.
- [x] **Backend URL Fixed**: Backend `AWS_URL` now returns same-origin storage URLs from `Storage::url()`.
- [x] **Frontend Build Args Fixed**: Frontend uses `https://bksdakaltim.net/api` and `https://bksdakaltim.net/storage`.
- [x] **Next Image Config**: Added allowed remote patterns for main-domain storage and legacy storage subdomain.
- [x] **Employee ST Route Fixed**: Employee history CTA now links to `/kepegawaian/surat-tugas/create?employee_id=...`.
- [x] **Employee Preselect**: ST create page now auto-selects the employee from the `employee_id` query parameter.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt frontend, recreated backend/frontend/nginx, reloaded nginx, and `https://bksdakaltim.net/login` returned HTTP 200.

### Validation:
- [x] `npx eslint "src/app/kepegawaian/_components/AssignmentLetterHistory.tsx" "src/app/kepegawaian/surat-tugas/create/page.tsx" "next.config.ts"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `php -l backend/app/Http/Controllers/Api/AuthController.php`
- [x] `php -l backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php`
- [x] `https://bksdakaltim.net/kepegawaian/surat-tugas/create?employee_id=78` returns HTTP 200.
- [x] Backend container env has `AWS_URL=https://bksdakaltim.net/storage`.

### Pending:
- [ ] Re-test production employee detail photo upload.
- [ ] Re-test production portal profile photo upload.
- [ ] Re-test employee detail -> Buat Surat Tugas auto-selects the employee.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #316: ST Builder Untuk Print Pagination

### Completed:
- [x] **Issue Created**: Issue #316 tracks the `Untuk` section print pagination bug.
- [x] **PR Created**: PR #317 opened from `issue/316-untuk-print-pagination` to `main`.
- [x] **PR Merged**: PR #317 merged to `main` (`76589fa`).
- [x] **Root Cause Identified**: `Untuk` still used nested table rows, and global `tr { break-inside: avoid }` made the whole section move to page 2.
- [x] **Untuk Layout Refactor**: Replaced nested table markup with grid/block layout so the section can paginate naturally.
- [x] **Print CSS Updated**: `.untuk-section` and `.untuk-list` can break across pages; `.untuk-entry` avoids splitting each numbered item.
- [x] **FOLU 2-Employee Scenario Targeted**: Fix targets the case where 2 FOLU employees leave blank space and push all `Untuk` items to the next page.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test production FOLU print preview with 2 employees.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #314: ST Builder FOLU Funding Normalization

### Completed:
- [x] **PR Created**: PR #315 opened from `issue/314-folu-funding-builder` to `main`.
- [x] **Issue Created**: Issue #314 tracks the FOLU funding fallback bug.
- [x] **PR Merged**: PR #315 merged to `main` (`f4a34ba`).
- [x] **Funding Normalization**: ST Builder now maps submitted labels such as `Dana Kerjasama FOLU` and `Dana Kerjasama FOLU NC 2&3` to the internal `folu` option.
- [x] **Inbox Edit Bug Fixed**: Letters that show `Dana Kerjasama FOLU` in Inbox no longer open as `DIPA` when clicking **Edit Surat Tugas**.
- [x] **FOLU Menimbang Helper**: Added shared helper to extract kawasan from `Tempat Spesifik` or from activity text containing `di ...`.
- [x] **Patroli SMART Template**: FOLU activities containing `Smart Patrol` or `Patroli` now generate `Menimbang` with `melalui Patroli SMART`.
- [x] **Create + Builder Sync**: Direct ST create and Builder edit flows both sync generated FOLU Menimbang when activity/place changes.
- [x] **Manual Text Safety**: Auto-sync only touches default/generated FOLU Menimbang text and does not overwrite manually customized Menimbang text.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Example Output:
```text
bahwa dalam upaya menjaga kelestarian keanekaragaman hayati di Suaka Margasatwa Kelian, perlu dilakukan kegiatan pengamanan dan perlindungan melalui Patroli SMART;
```

```text
bahwa dalam upaya menjaga kelestarian keanekaragaman hayati di Cagar Alam Muara Kaman Sedulang, perlu dilakukan kegiatan pengamanan dan perlindungan melalui Patroli SMART;
```

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/lib/letter-utils.ts`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx" "src/app/kepegawaian/surat-tugas/create/page.tsx" "src/lib/letter-utils.ts"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test production Inbox -> Edit Surat Tugas for submitted FOLU letters.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #312: ST Builder Print Layout Stabilization

### Completed:
- [x] **PR Merged**: PR #313 merged into `main` (`f17c1049378f9b86b92c4cf2ff9e29982995adec`).
- [x] **Production**: SSL active, login works, employee import works, API URL fixed to `bksdakaltim.net/api`.
- [x] **ST Builder FOLU Template**: FOLU header, nomor prefix, menimbang/dasar defaults, TTD wording, penutup, and tembusan are implemented.
- [x] **KOP Print**: KOP only appears on page 1 and no longer crops in Chrome print preview.
- [x] **Content Margins**: Main letter body now uses `.surat-content` so page 1, page 2, and later pages keep consistent margins independent of KOP.
- [x] **Page Margins**: `@page` top margin keeps continuation pages readable; first page uses a smaller top margin for KOP.
- [x] **Employee Pagination**: `Kepada` was refactored from one large table row to block/grid layout so employee entries can paginate one-by-one instead of all moving to the next page.
- [x] **Employee Row Safety**: `.employee-entry` uses `break-inside: avoid` / `page-break-inside: avoid` so each employee is not split in the middle.
- [x] **Scenarios Checked During Session**: FOLU/DIPA, 1 employee, 4 employees, 7 employees, and 11 employees print behavior.

### Current Print CSS State:
```css
@page { size: A4; margin: 3cm 1cm 1cm 1.55cm; }
@page :first { margin: 0.7cm 1cm 1cm 1.55cm; }
.kop-surat { margin-left: 0; margin-right: -0.95cm; margin-top: -0.25cm; }
.kop-surat img { width: 18.8cm; height: auto; }
.surat-content { margin-left: 1.25cm; width: calc(100% - 2.2cm); margin-right: 0.95cm; }
.field-section, .kepada-section, .kepada-list { break-inside: auto; page-break-inside: auto; }
.employee-entry { break-inside: avoid; page-break-inside: avoid; }
```

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` still blocked by unrelated pre-existing lint errors in portal/kepegawaian files.

### Pending:
- [ ] Deploy ST Builder print fix to production.
- [ ] Import BMN Excel in production.
- [ ] Style public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

# Progress - Phase 37: Production Deployment

> Document updated: 2026-05-17
> Status: **IN PROGRESS** 🔄

---

## Phase 37: AWS EC2 Deployment

### Completed:
- [x] **EC2 Instance**: t3.micro launched (Amazon Linux 2023, 30GB, ap-southeast-2)
- [x] **Docker + Compose**: Installed on server
- [x] **Production Dockerfiles**: Backend (PHP 8.2 FPM) + Frontend (Next.js standalone)
- [x] **docker-compose.prod.yml**: 7 services (db, rustfs, backend, nginx-backend, frontend, nginx, certbot)
- [x] **Nginx Reverse Proxy**: Routes bksdakaltim.net → frontend, api.bksdakaltim.net → backend, storage.bksdakaltim.net → rustfs
- [x] **All Containers Running**: Verified via `docker ps`
- [x] **Database Migrated**: `migrate:fresh` successful (fixed ST migration ordering)
- [x] **RustFS Bucket**: Created + public-read policy set
- [x] **Admin User**: Seeded (198001012005011001 / Bksda2026!)
- [x] **DNS Records**: A (@, api) + CNAME (www) configured at Biznet NeoDNS
- [x] **Frontend Live**: http://www.bksdakaltim.net accessible
- [x] **Next.js standalone**: Added `output: "standalone"` to next.config.ts
- [x] **Migration Fix**: ST alter migrations moved to module folder
- [x] **Git Security**: .pem and service-account.json added to .gitignore

### Pending:
- [ ] SSL/HTTPS setup (Let's Encrypt certbot)
- [ ] Fix API 500 error on login
- [ ] Root domain DNS propagation (bksdakaltim.net without www)
- [ ] CORS configuration for production
- [ ] Storage subdomain DNS (storage.bksdakaltim.net)
- [ ] Seed production data (BMN Excel import)
- [ ] End-to-end testing on production
- [ ] Update nginx with SSL blocks

### Server Info:
| Item | Value |
|------|-------|
| IP | 15.135.114.1 |
| SSH | `ssh -i bksda-superapp.pem ec2-user@15.135.114.1` |
| Path | `/home/ec2-user/bksda-superapp` |
| Compose | `docker-compose -f docker-compose.prod.yml --env-file .env.prod` |
| Domain | bksdakaltim.net |
| Admin | 198001012005011001 / Bksda2026! |

### Architecture:
```
Internet → Nginx (:80/:443)
              ├── bksdakaltim.net → Frontend (Next.js :3000)
              ├── api.bksdakaltim.net → Nginx-Backend → PHP-FPM (:9000)
              └── storage.bksdakaltim.net → RustFS (:9000)
           PostgreSQL (:5432) ← Backend
```

### Next Steps:
- [ ] SSL setup
- [ ] Fix API errors
- [ ] Seed data
- [ ] Full testing

---

# Progress - Phase 36: RustFS Storage + Kepegawaian + Portal

> Document updated: 2026-05-17
> Status: **COMPLETED** ✅

---

## Phase 36: RustFS Storage Migration + Module Enhancements

### Completed:
- [x] **RustFS Docker Setup**: Container running (API :9002, Console :9003), Apache 2.0 license
- [x] **Laravel S3 Driver**: `league/flysystem-aws-s3-v3` installed, `FILESYSTEM_DISK=s3`
- [x] **All Modules Migrated**: BMN, CMS, Kepegawaian, Surat Tugas, DeReporting → RustFS
- [x] **Artisan Command**: `php artisan storage:setup` creates bucket + sets public-read policy
- [x] **Per-Entity Folders**: `bmn-photos/wet-suit-2/`, `employees/nama-pegawai/foto-profil/`, `surat-tugas/st-01-k-18.../`
- [x] **Hybrid Geotag Upload**: POST /geotag accepts file OR URL (mutual exclusive)
- [x] **Employee Create Fix**: NIP unique validation 500 error fixed
- [x] **Dropdown Pangkat**: PNS (I/a-IV/e) + PPPK (I-XVII) + "Tidak ada pangkat"
- [x] **Dropdown Penempatan**: Kantor Balai + SKW I/II/III + 14 Resor
- [x] **Auto User Account**: Employee create → auto user (password: 123)
- [x] **Editable Biodata**: All fields editable in detail page (dropdowns for pangkat, unit kerja, status)
- [x] **Reset Password**: Admin can reset employee password to "123"
- [x] **Portal Photo Upload**: Hover avatar → upload directly
- [x] **Portal ST Visibility**: New `/api/surat-tugas/my` endpoint (no module access required)
- [x] **Formal Letter Preview**: SuratTugasLetterPreview component (kop surat, format dinas resmi)
- [x] **Print Fix**: New window approach, kop not cropped
- [x] **Module Access OR Logic**: CheckModuleAccess middleware supports multiple modules
- [x] **Upload PDF Only**: Surat tugas dasar surat restricted to PDF
- [x] **Bulk Satker Update**: 151 employees renamed to new format
- [x] **ST Badge on Load**: Count shown immediately without clicking tab

### RustFS Storage Structure:
```
bksda (bucket)/
├── bmn-photos/{nama-aset-nup}/           ← per-asset photos
├── employees/{nama-pegawai}/foto-profil/ ← per-employee photos
├── surat-tugas/{nomor-surat-slug}/       ← per-ST attachments
├── cms/                                   ← CMS media
└── private/dereporting/                   ← report attachments
```

### New API Endpoints:
- `POST /api/me/update-photo` — portal profile photo upload
- `POST /api/me/update-profile` — portal profile edit
- `GET /api/surat-tugas/my` — my approved surat tugas (no module access)
- `GET /api/surat-tugas/my/{id}` — my ST detail (no module access)
- `POST /api/kepegawaian/employees/{id}/photo` — admin upload employee photo
- `POST /api/kepegawaian/employees/{id}/reset-password` — admin reset pw

### Next Steps:
- [ ] Style public sub-pages (/kawasan, /tsl, /galeri, /publikasi)
- [ ] Deployment preparation
- [ ] Mobile app spec

---

# Progress - Phase 35b: CMS Editor Fixes & Public Detail Page Redesign

> Document updated: 2026-05-17
> Status: **COMPLETED** ✅

---

## Phase 35b: CMS Editor Fixes & Public Detail Page

### Completed:
- [x] **405 Fix**: Edit berita save error — use POST + `_method=PUT` for multipart FormData (PR #311)
- [x] **Edit Data Loading**: Fixed API response unwrap (`res.data.data`)
- [x] **React Query Cache**: Invalidate `["cms-informasi-edit", id]` after update
- [x] **Quill Justify**: Added `{ align: [] }` to toolbar modules
- [x] **Light/Dark Mode**: Dual-mode styling on all CMS form elements
- [x] **react-quill-new**: Replaced old package for React 19 compatibility
- [x] **Remove Urutan**: Removed from Profil, Links, Categories
- [x] **Toast Confirm**: Replaced all `window.confirm()` with sonner toast
- [x] **Dialog Modal**: CrudFormDrawer → centered dialog (not sidebar)
- [x] **Public Disk**: File uploads now go to `storage/app/public/cms/`
- [x] **Berita Detail Redesign**: Hero banner + breadcrumb + thumbnail + date badge + sidebar "Informasi Terbaru"
- [x] **Alignment CSS**: Rules in `style.css` + inline `<style>` tags for Quill classes
- [x] **Overflow Fix**: `break-word` + `max-width: 100%` images
- [x] **nbsp Fix**: Replace `&nbsp;` with regular spaces for clean justify rendering

### Design (Public Berita Detail):
```
┌──────────────────────────────────────────────┐
│ HERO BANNER (thumbnail bg + gradient)        │
│ Breadcrumb: Beranda / Informasi              │
│ JUDUL UPPERCASE                              │
├──────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌────────────────┐ │
│ │ THUMBNAIL           │  │ INFORMASI      │ │
│ │ + Date Badge [17]   │  │ TERBARU        │ │
│ │   [MAR]             │  │ ┌──┐ title...  │ │
│ └─────────────────────┘  │ ┌──┐ title...  │ │
│ Metadata (date,author)   │ ┌──┐ title...  │ │
│ ─────────────────────    └────────────────┘ │
│ Konten berita (justify)                      │
│ ...                                          │
└──────────────────────────────────────────────┘
```

### Next Steps:
- [ ] Style /kawasan, /tsl, /galeri, /publikasi pages matching bksdakaltim design
- [ ] Populate CMS content
- [ ] Deployment preparation

---

# Progress - Phase 35: Public Website & CMS Upgrade

> Document updated: 2026-05-16
> Status: **COMPLETED** ✅

---

## Phase 35: Public Website & CMS Upgrade

### Completed:
- [x] **Backend Public API**: Added `/api/cms/public/home` aggregate endpoint + `/api/cms/public/page/{slug}` generic page renderer (PR #307)
- [x] **Homepage Premium Design**: Replicated superapp-inventory design — banner carousel, profil section, TSL tabs, video carousel, photo marquee, news grid (PR #308, #310)
- [x] **Public Pages**: Created `/profil` hub page + `/page/[slug]` CMS page renderer (PR #309)
- [x] **PublicLayout Component**: Full header (top bar + sticky nav + search + CTA), mobile drawer, 4-column footer, WhatsApp float
- [x] **Hardcoded Navbar**: Menu items without menu management dependency
- [x] **Static Assets**: Copied Bootstrap CSS, style.css, responsive.css, flaticon, Font Awesome, theme images from superapp-inventory
- [x] **CMS Editor Fix**: Replaced `react-quill` → `react-quill-new` (React 19 `findDOMNode` error)
- [x] **Editor Toolbar**: Added justify alignment (`{ align: [] }`)
- [x] **Editor Light/Dark Mode**: Proper dual-mode styling for all form elements
- [x] **Edit Page Data Loading**: Fixed API response unwrap (`res.data.data`)
- [x] **File Upload Fix**: Changed from `private` disk → `public` disk for accessible URLs
- [x] **Removed Urutan Field**: From Profil, Links, Categories forms
- [x] **Toast Confirmations**: Replaced all `window.confirm()` with sonner toast action
- [x] **Dialog Modal**: Changed CrudFormDrawer from sidebar to centered dialog
- [x] **Google Sheets Disabled**: Temporarily commented out in ST controller
- [x] **Portal TS Fix**: Fixed pre-existing string/number id comparison error

### PRs Merged:
- PR #307: Backend public API endpoints
- PR #308: Homepage upgrade (carousel, TSL, video, marquee)
- PR #309: /profil + /page/[slug] pages
- PR #310: Premium design (Bootstrap theme, PublicLayout, full homepage)

### Next Steps:
- [ ] Style sub-pages (/informasi, /kawasan, /tsl, /galeri) to match superapp-inventory
- [ ] Contact form integration on /hubungi-kami
- [ ] CMS Website settings — populate logo, alamat, sosmed
- [ ] Seed initial CMS content (profil, kawasan, TSL)
- [ ] Deployment preparation

---

# Progress - Phase 34: Data Security & Linting Finalization

> Document updated: 2026-05-16
> Status: **COMPLETED** ✅

---

## Phase 34: Data Security & Linting Finalization

### Completed:
- [x] **Surat Tugas Data Leakage Fix**: Added `employee_id` filter to `AssignmentLetterController::index` to ensure users only see Surat Tugas related to them in their Portal Dashboard.
- [x] **BMN Portal Integration & Fuzzy Search**: 
  - Enhanced `AssetController` with fuzzy name matching for `pengguna` column to handle title/spacing variations.
  - Implemented frontend deduplication to exclude "Pinjaman Aktif" assets from "Aset Saya".
  - Added dynamic count badges to all portal tabs.
- [x] **Rich Asset Metadata**: Updated UI to display Merk/Tipe, NUP Lama, and No. Polisi (for vehicles) in portal asset cards.
- [x] **ST Builder Layout Constraint**: Fixed missing A4 wrapper in `STBuilderPreview` on the `create` page.
- [x] **Frontend Stability & Linting**: 
  - Fixed React Hook ordering issue (`useMemo` positioning).
  - Resolved all remaining ESLint warnings (`any` types, unused imports).
- [x] **Build Verification**: `npm run lint` yields 0 warnings and `npx tsc --noEmit` yields 0 errors.

### Next Steps:
- [ ] Preparation for Production / Server Deployments.

---

# Progress - Phase 33: Module Themes & Fluid Layouts
> Status: **COMPLETED** ✅

---

## Phase 33: Module Themes & Fluid Layouts

### Completed:
- [x] **Kepegawaian Module Branding**: Replaced generic emerald elements with **Blue** (`blue-600`, `blue-50`) to establish a formal HR identity.
- [x] **Inventory Module Branding**: Replaced emerald/teal elements with **Orange/Amber** (`orange-600`, `amber-500`) for clear differentiation.
- [x] **Portal & Module Switcher Alignment**: Synced the portal dashboard cards and global module switcher to accurately reflect each module's distinct theme (Blue, Emerald, Orange, Violet, Teal).
- [x] **Kepegawaian Layout**: Upgraded wrapper layouts to use standard fluid padding `p-6 md:p-10`.
- [x] **BMN Layout Standardization**: Removed `max-w-7xl` containers from BMN pages and fully migrated to fluid `p-6 md:p-10 space-y-8 animate-in fade-in` design system.
- [x] **Cross-Module Verification**: Verified CMS (Teal) and DeReporting (Violet) are correctly themed and sized.
- [x] **Build Verification**: `npx next build` and `npx tsc --noEmit` verified successfully after global color replacements.

### Next Steps:
- [ ] API & Frontend Integrations / Testing.

---

# Progress - Phase 32: Full Dark Mode Finalization

## Phase 32: Full Dark Mode Finalization

### Completed:
- [x] **CMS Module**: Dashboard, Layout, CrudPageFactory, CrudFormDrawer, Informasi — converted from dark-only to dual-mode.
- [x] **DeReporting Module**: Dashboard, Internal page, FilteredReportTable — fixed light mode rendering.
- [x] **Kepegawaian Module**: ST Builder (Kota input fix), ST Create, ST Inbox — full dual-mode.
- [x] **BMN Core Module**: Dashboard, Layout, Assets list, Loans, Loans/create, Maintenances, Disposal — `slate` → `zinc` + `dark:`.
- [x] **BMN Import Review**: Header, upload section, batch history cards — light-only → dual-mode.
- [x] **BMN Reports**: Header, report cards, icon backgrounds — light-only → dual-mode.
- [x] **BMN Asset Detail**: Hero card, quick stats, tabs, history tab — `slate` → `zinc` + `dark:`.
- [x] **BMN DetailSection Component**: All 8 sub-components refactored (DetailRow, EditableRow, CurrencyRow, EditableCurrencyRow, EditableSelectRow, EditableEmployeeRow, AreaRow, BadgeRow).
- [x] **BMN PhotoGallery Component**: Container, header, empty slots, verified banner, labels, action buttons, geotag input.
- [x] **Inventory Transactions**: Dark-only → dual-mode (filter bar, table, pagination footer).
- [x] **Inventory Stock-Out**: Dark-only → dual-mode (form, labels, inputs, select, buttons).
- [x] **Inventory Stock-In**: Dark-only → dual-mode (form, labels, inputs, select, buttons).
- [x] **Portal Dashboard**: Full dark mode refinement.
- [x] **Build Verified**: `npx next build` → exit code 0.

### Design Standard:
| Element | Light | Dark |
|---------|-------|------|
| Background | `bg-white` / `bg-zinc-50` | `dark:bg-zinc-900` / `dark:bg-zinc-950` |
| Text | `text-zinc-900` / `text-zinc-500` | `dark:text-white` / `dark:text-zinc-400` |
| Borders | `border-zinc-200` | `dark:border-zinc-800` |
| Hover | `hover:bg-zinc-50` | `dark:hover:bg-zinc-800/30` |
| Accent | `bg-emerald-50` | `dark:bg-emerald-500/10` |

### Files Modified (31 files):
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/bmn/assets/[id]/_components/DetailSection.tsx`
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx`
- `frontend/src/app/bmn/import-review/page.tsx`
- `frontend/src/app/bmn/reports/page.tsx`
- `frontend/src/app/bmn/{page,layout,assets/page,loans/page,loans/create/page,maintenances/page,disposal/page}.tsx`
- `frontend/src/app/inventory/{page,items/page,transactions/page,stock-in/page,stock-out/page}.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/{builder/[id]/page,create/page,inbox/page}.tsx`
- `frontend/src/app/dereporting/{page,internal/page,_components/FilteredReportTable}.tsx`
- `frontend/src/app/cms/{page,layout,informasi/page,_components/CrudPageFactory,_components/CrudFormDrawer}.tsx`
- `frontend/src/app/portal/page.tsx`

### Dark Mode Coverage (100%):
| Module | Status |
|--------|--------|
| Portal | ✅ Complete |
| BMN (all pages) | ✅ Complete |
| Inventory (all pages) | ✅ Complete |
| Kepegawaian (all pages) | ✅ Complete |
| DeReporting (all pages) | ✅ Complete |
| CMS (all pages) | ✅ Complete |

### Next Steps:
- [ ] Inventory module improvements
- [ ] DeReporting module improvements
- [ ] Import: handle foto_geotag_url mapping dari Excel header "Foto Ber-geotag"

---

# Progress - Phase 31: BMN Loan UI Overhaul + Comprehensive Dark Mode

> Document updated: 2026-05-16 12:45
> Status: **COMPLETED** ✅

---

## Phase 31: BMN Loan UI & Dark Mode

### Completed:
- [x] **BMN Loan List Overhaul**: Identical header, search, and filter layout with Assets catalog.
- [x] **Emerald Theme Unification**: Accent colors changed from Blue to Emerald across the Loan module.
- [x] **Form Wizard Standardization**: Consistent "Batal" (outline) and "Lanjut" (solid) buttons in `/bmn/loans/create`.
- [x] **Vehicle Icon Logic Fix**: Vehicle icons only show if `no_polisi !== '-'` in asset select tables.
- [x] **Full Dark Mode (Portal)**: Added `dark:` classes to `/portal/page.tsx` for cards, header, and profile.
- [x] **Full Dark Mode (BMN)**: Comprehensive support for Assets, Loans, and Detail pages.
- [x] **Full Dark Mode (Sidebar)**: Navigasi inventory sidebar sekarang mendukung transisi gelap.
- [x] **Automated Class Mapping**: Patch script for mass addition of `dark:` utility classes.

### Files Modified:
- `frontend/src/app/portal/page.tsx`
- `frontend/src/app/bmn/loans/page.tsx`
- `frontend/src/app/bmn/loans/create/page.tsx`
- `frontend/src/app/bmn/assets/page.tsx`
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`

### Next Steps:
- [x] ~~Audit remaining modules (DeReporting, Kepegawaian, CMS) for dark mode consistency~~ ✅ Phase 32
- [x] ~~Accessibility review for dark mode contrast~~ ✅ Phase 32

---

# Progress - Phase 30: BMN Dashboard Charts + Export Filtered + Riwayat + Verifikasi + Foto

---

## Phase 30: BMN Enhancements

### Completed:
- [x] **Dashboard charts** (PR #299): donut kondisi (SVG), bar jenis BMN + nilai, bar lokasi, compact layout
- [x] **Export filtered** (PR #300): export sesuai filter aktif (jenis, lokasi, kondisi, search)
- [x] **Tab Riwayat** (PR #301): log semua perubahan field (siapa, kapan, old→new)
- [x] **Persist filters to URL** (PR #302): filter + search + page di-persist, kembali dari detail tidak reset
- [x] **Deduplicate merk_tipe**: "Sanyo Sanyo" → "Sanyo"
- [x] **Track all field changes**: AssetService sekarang log semua field (bukan hanya nilai+kondisi)
- [x] **Currency input**: format ribuan (Rp 1.000.000) di edit inline + create form
- [x] **Employee picker**: Penghuni, Pengguna, Nama Pengguna pakai search dropdown pegawai
- [x] **Pengguna sync**: edit Pengguna → Nama Pengguna otomatis ikut (dan sebaliknya)
- [x] **Hero card cleanup**: hapus gradient bar, tambah info Lokasi + Pengguna + No Polisi + Pajak STNK
- [x] **No Polisi di tabel**: tampil di subtitle untuk kendaraan (Merk • No Pol • Tahun)
- [x] **Shorten lokasi**: nama panjang disingkat di tabel (Kantor Balai, Seksi Wil. I, R.01, dll)
- [x] **Pengguna di tabel**: tampil di bawah lokasi jika ada
- [x] **Issue #329: BPKB & STNK Upload for Vehicle Assets**
  - Added new columns to `bmn_assets` via migration.
  - Updated `Asset` model and `AssetResource` for 6 new photo slots (BPKB 1-4, STNK 1-2).
  - Modified `AssetPhotoController` to support uploading and ZIP download for the new document types.
  - Extended `PhotoGallery.tsx` and `page.tsx` on the frontend to conditionally render a "Dokumen Kendaraan" section for `ALAT ANGKUTAN BERMOTOR` assets.
  - *Pending*: User testing and git commit/PR.
- [x] **Verifikasi BMN**: tombol + timestamp + log riwayat
- [x] **Photo history**: upload + delete foto tercatat di riwayat
- [x] **Disposal pagination**: tambah opsi "Semua"
- [x] **Reset filter**: termasuk kondisi + search
- [x] **Confirm dialogs**: semua pakai useConfirm (bukan window.confirm)
- [x] **Kondisi editable**: dropdown select di detail page (Baik/Rusak Ringan/Rusak Berat)
- [x] **Bulk update kondisi**: select beberapa aset → ubah kondisi sekaligus + riwayat tercatat

### Files Modified (key):
- `backend/app/Modules/Bmn/Controllers/DashboardController.php` — charts data
- `backend/app/Modules/Bmn/Controllers/AssetController.php` — verify endpoint
- `backend/app/Modules/Bmn/Controllers/AssetPhotoController.php` — history logging
- `backend/app/Modules/Bmn/Controllers/ExportController.php` — filtered export
- `backend/app/Modules/Bmn/Exports/AssetExport.php` — filter support
- `backend/app/Modules/Bmn/Services/AssetService.php` — track all fields
- `backend/app/Modules/Bmn/Resources/AssetResource.php` — verified_at, foto rename
- `backend/app/Modules/Bmn/Models/Asset.php` — new columns
- `backend/app/Modules/Bmn/Migrations/2026_05_13_160000_*` — foto rename
- `backend/app/Modules/Bmn/Migrations/2026_05_13_170000_*` — verification columns
- `frontend/src/app/bmn/page.tsx` — dashboard rewrite
- `frontend/src/app/bmn/assets/page.tsx` — filters, export, no_polisi, pengguna, shorten lokasi
- `frontend/src/app/bmn/assets/[id]/page.tsx` — hero card, employee picker, riwayat tab
- `frontend/src/app/bmn/assets/[id]/_components/DetailSection.tsx` — EditableEmployeeRow, EditableCurrencyRow
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx` — rename, verify, confirm dialog
- `frontend/src/app/bmn/assets/create/page.tsx` — currency input, foto rename
- `frontend/src/app/bmn/disposal/page.tsx` — pagination "Semua"

### Next Steps (TODO):
- [x] Mobile responsive sidebar (semua modul) ✅ PR #304
- [ ] Inventory module improvements
- [ ] DeReporting module improvements
- [ ] Import: handle foto_geotag_url mapping dari Excel header "Foto Ber-geotag"

---

# Progress - Phase 29: Tembusan ST + Multi-page Preview + RBAC All Modules

> Document updated: 2026-05-13 17:00
> Status: **COMPLETED** ✅

---

## Phase 29: Tembusan + Multi-page + RBAC

### Completed:
- [x] **Tembusan field** (PR #296): kolom JSON di DB, dynamic list di builder, tampil di preview/print di bawah TTD
- [x] **Download fix**: CORS suppressed, nama file: Dasar Surat-Nama Personel-Tanggal
- [x] **Submit timeout**: 60s untuk public form (Google Sheets)
- [x] **Cache invalidation**: history page langsung update setelah ajukan/terbitkan
- [x] **Multi-page preview** (PR #297): page break indicator (bar HALAMAN 2/3) di posisi 297mm
- [x] **Prevent duplicate personil**: yang sudah dipilih jadi abu-abu + disabled
- [x] **TTD + Tembusan**: pageBreakInside:avoid agar tidak terpotong saat cetak
- [x] **RBAC all modules** (PR #298): Inventory, DeReporting, CMS sidebar filtered by role
- [x] **Signature integration**: DROPPED (lewat aplikasi lain)

### RBAC Summary:
| Modul | User (view) | Admin (CRUD) |
|-------|-------------|--------------|
| Inventory | Dashboard, Katalog, Riwayat | + Kantor, Stok Masuk, Distribusi |
| DeReporting | Dashboard, Laporan, Data, Kerjasama, Izin | + Operator |
| CMS | Dashboard, Berita, Pesan, Kawasan, TSL, Galeri, Publikasi | + Kategori, Profil, Kepala, Link |

### Commits:
```
bf4c06d feat(rbac): apply role-based sidebar to Inventory, DeReporting, CMS (#298) [PR #298]
45223c2 feat(surat-tugas): multi-page preview + prevent duplicate personil (#297) [PR #297]
54cd40a feat(surat-tugas): tembusan + download fix + timeout (#295) [PR #296]
```

### All Major TODOs — DONE ✅:
- [x] Import Review/Diff/Approve (PR #293)
- [x] STNK Countdown + Edit Inline + Filters (PR #294)
- [x] Tembusan ST (PR #296)
- [x] Multi-page testing (PR #297)
- [x] RBAC all modules (PR #298)
- [x] Signature — DROPPED

---

# Progress - Phase 28: STNK Countdown + Edit Inline + Filters

> Document updated: 2026-05-13 16:00
> Status: **COMPLETED** ✅

---

## Phase 28: STNK Countdown + Edit Inline + Filters

### Completed:
- [x] STNK Countdown: kolom tanggal_pajak_stnk + tanggal_ganti_plat, badge di tabel + detail, alert dashboard
- [x] Edit inline: semua tab editable (kecuali Organisasi), klik → input → save
- [x] Filters: dropdown Jenis BMN + Lokasi Ruang di halaman aset
- [x] Lokasi Ruang: EditableSelectRow dropdown di detail page
- [x] Import timeout: 120s untuk file besar
- [x] Penghuni/Pengguna/Nama Pengguna dipindah ke tab Dokumen
- [x] Create form: tanggal pajak STNK + ganti plat untuk Kendaraan
- [x] router.back(): kembali dari detail mempertahankan page number
- [x] UpdateAssetRequest: semua field optional (support inline edit 1 field)

### Commits:
```
8a0c3ad feat(bmn): STNK countdown + edit inline + filters (#294) [PR #294]
```

### Next Steps:
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

---

# Progress - Phase 27: BMN Import Review/Diff/Approve + Fixes

> Document updated: 2026-05-13 15:00
> Status: **COMPLETED** ✅

---

## Phase 27: BMN Import Review/Diff/Approve

### Completed:
- [x] Import Review/Diff/Approve — full feature (upload → staging → compare → diff table → approve/reject)
- [x] Diff detection: all 80 fields, normalize numbers, detect soft-deleted as "update"
- [x] DB rename: `nama_pemilik` → `nama`, `nama_pengguna_bmn` → `nama_pengguna`
- [x] AssetImportDialog → redirect to import-review flow
- [x] Disposal page: checkbox select, bulk restore, bulk force delete, pagination
- [x] Confirm dialog: replaced window.confirm() with useConfirm() hook
- [x] Toast position: bottom-right
- [x] Create form: NUP Lama, Tipe for Kendaraan, No BPKB, Step 5 Foto (geotag link + 4 sisi upload)
- [x] Create form auto-fill: merk_tipe, tahun_perolehan, nilai_perolehan_pertama, nama, 9x "Tidak"
- [x] Detail page: added missing fields (nama, tahun_perolehan, kode_kab_kota, kode_provinsi, nama_pengguna)
- [x] Removed "Keterangan" from create form (not in 80 columns)

### Import Review Flow:
```
Upload Excel → Parse to staging table (bmn_import_staging)
→ Compare each row by kode_barang + nup (including soft-deleted)
→ Mark as: new / updated / unchanged
→ Show diff table (old → new per field, red/green)
→ User can select/deselect individual rows
→ Approve: insert new + update existing (restore if trashed)
→ Reject: discard staging data
→ After approve → redirect to /bmn/assets
```

### API Endpoints (new):
- `GET /api/bmn/import-review` — list batches
- `POST /api/bmn/import-review/upload` — upload & parse
- `GET /api/bmn/import-review/{batchId}` — batch detail + rows
- `POST /api/bmn/import-review/{batchId}/approve` — apply
- `POST /api/bmn/import-review/{batchId}/reject` — discard
- `POST /api/bmn/import-review/toggle-selection` — select/deselect
- `POST /api/bmn/assets/bulk-restore` — restore
- `POST /api/bmn/assets/bulk-force-delete` — permanent delete

### Next Steps (TODO for next session):
- [ ] **STNK Countdown** — tanggal_pajak_stnk + tanggal_ganti_plat columns, countdown badge, dashboard alert
- [ ] **Edit inline** di detail page
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

---

# Progress - Phase 26: BMN Module Full Upgrade

> Document updated: 2026-05-13 09:00
> Status: **COMPLETED** ✅ (create page done, import review next)

---

## Phase 26: BMN Module Full Upgrade

### Completed:
- [x] Dashboard: real API, stat cards, condition bars, category chart, activity feed
- [x] Layout: light theme, RBAC sidebar
- [x] Assets table: search, filter, bulk select/delete, pagination (10/50/100/all), page persist URL, export dropdown (with/without NUP Lama), Jenis BMN column, NUP Lama display
- [x] Asset detail: hero card, 5 tabs, all 80 columns, glassmorphism sections
- [x] Photo gallery: 5 slots, Google Drive thumbnail, lightbox + keyboard nav (←→ Esc), download/ZIP/copy link
- [x] Database: 80 columns migration + 5 photo columns + 1613 assets seeded
- [x] Import: all 80 columns, auto UUID, batch insert, flexible header matching, column AG=Merk fix
- [x] Export: all 80 columns, option with/without NUP Lama, route conflict fix
- [x] Create page: multi-step form, 4 dynamic modes (Kendaraan/Tanah/Bangunan/Peralatan), Lokasi Ruang dropdown, 8 org fields auto-filled
- [x] Dispose: alasan_pemutihan optional, service method nullable fix
- [x] StoreAssetRequest: expanded to accept all 80 columns
- [x] Loans: return action, status badges
- [x] Maintenance, Disposal, Reports: all rewritten

### Create Page Form Modes (final):
| Mode | Jenis BMN | Fields |
|------|-----------|--------|
| Kendaraan | ALAT ANGKUTAN BERMOTOR | Merk, No Polisi, No STNK, No BPKB, No Sertifikat |
| Tanah | TANAH | 5x Luas, Jenis Dokumen, No Dokumen/Sertifikat, Status Sertifikasi |
| Bangunan | BANGUNAN DAN GEDUNG, RUMAH NEGARA, BANGUNAN AIR | Tipe, Luas Tanah/Bangunan/Tapak, Jumlah Lantai. RUMAH NEGARA: +Penghuni, Pengguna, No Identitas, Status PMK |
| Peralatan | ALAT BESAR, MESIN TIK, MESIN NON TIK, ALAT PERSENJATAAN | Merk, Tipe (conditional) |

### Data Insights:
- Kolom AG (header "Nama") = Merk (same data, mapped to merk field)
- Umur Aset = auto-calculated from Tanggal Perolehan (removed from form)
- 8 org fields locked (same for all assets)
- Lokasi Ruang: dropdown with 4 Seksi + 14 Resor + 8 Urusan

### Next Steps (TODO for next session):
- [ ] **Import Review/Diff/Approve** — upload Excel → compare with existing → show diff → approve to update
  - Backend: staging table or temp storage, compare endpoint, approve endpoint
  - Frontend: review page with diff table (red=old, green=new), checkbox per row
- [ ] **STNK Countdown** — tanggal_pajak_stnk + tanggal_ganti_plat columns, countdown badge in table, alert in dashboard
- [ ] **Edit inline** di detail page
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

### Commits (this session):
```
f4d6824 fix(bmn): remove Umur Aset from form - auto-calculated
0735ac9 feat(bmn): update create form with correct fields per jenis BMN
7564d6e feat(bmn): add Lokasi Ruang dropdown with BKSDA Kaltim hierarchy
c062259 fix(bmn): correct luas fields per jenis
fe07885 fix(bmn): map column AG (Nama) to merk field
0534baa fix(bmn): make alasan nullable in disposeAsset service method
7e27fe4 fix(bmn): make alasan_pemutihan optional for dispose endpoint
021ed03 fix(bmn): expand StoreAssetRequest validation to accept all 80 columns
a3a9953 fix(bmn): correct field labels - BPKB for kendaraan
6f23281 feat(bmn): create asset page - dynamic form per jenis BMN (#291) [PR #292]
ac83b73 fix(bmn): move export routes before apiResource
b601a22 feat(bmn): export all 80 columns with option include/exclude NUP Lama
...and more (see git log)
```

---

# Progress - Phase 25: RBAC + Employee Accounts + Access Dialog Fix

> Document updated: 2026-05-12 14:30
> Status: **COMPLETED** ✅

---

## Phase 25: RBAC + Employee Accounts + Access Dialog Fix

### Accomplishments:
- [x] **useRole hook**: Reusable `canWrite`, `canManageAccess`, `isAdmin`, `isSuperAdmin` across all modules.
- [x] **Kepegawaian RBAC**: Sidebar + buttons filtered by role (User=view only, Admin=CRUD, Super Admin=+manage access).
- [x] **Employee Accounts Seeded**: 151 accounts (NIP/mmpX as username, password=123, role=user, modules=[]).
- [x] **EmployeeAccessSheet → Dialog**: Converted from Sheet to centered Dialog modal.
- [x] **Fix hydration error**: `<div>` inside `<p>` (SheetDescription renders `<p>`).
- [x] **Fix infinite loop on open**: useRef `hasSynced` to prevent repeated form.reset.
- [x] **Fix infinite loop on checkbox click**: Removed nested FormField pattern, use `form.setValue` directly.

### Files Created/Modified:
```
frontend/src/hooks/useRole.ts                                              ← NEW
frontend/src/app/kepegawaian/layout.tsx                                    ← sidebar filtered by role
frontend/src/app/kepegawaian/page.tsx                                      ← buttons conditional
frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx            ← REWRITE
backend/database/seeders/EmployeeUserSeeder.php                            ← NEW
```

### Commits:
```
25c2ff4 fix(kepegawaian): rewrite module checkboxes without nested FormField (#287)
4053f3c fix(kepegawaian): fix checkbox infinite loop - stopPropagation (#287)
5f64504 fix(kepegawaian): fix infinite loop in EmployeeAccessSheet dialog (#287) [PR #288]
ba2f821 feat(rbac): role-based access control within modules (#285) [PR #286]
b10bd2f fix(kepegawaian): convert EmployeeAccessSheet from Sheet to Dialog
3c79174 feat(kepegawaian): seed user accounts for all employees
```

### GitHub Issues & PRs:
- Issue #285 → PR #286 ✅ MERGED (RBAC)
- Issue #287 → PR #288 ✅ MERGED (dialog fix) + 2 hotfixes to main

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)
- [ ] Apply RBAC to other modules (BMN, Inventory, DeReporting, CMS)

---

# Progress - Phase 24: Portal Dashboard Redesign

> Document updated: 2026-05-12 13:00
> Status: **COMPLETED** ✅

---

## Phase 24: Portal Dashboard Redesign

### Accomplishments:
- [x] **Complete UI Rewrite**: Modern, clean portal dashboard replacing old cluttered design.
- [x] **Welcome Banner**: Emerald gradient with time-based greeting + date.
- [x] **Module Grid**: 5 modul (Kepegawaian, BMN, Persediaan, DeReporting, CMS) — auto-filtered by user access.
- [x] **Sidebar Profile**: Avatar, status, NIP, jabatan, unit kerja, email, telepon, ganti password.
- [x] **Tab Surat Tugas** (NEW): View + Download surat tugas yang sudah approved.
- [x] **Scalable**: Modul baru cukup tambah 1 entry di array.

### Files Modified:
```
frontend/src/app/portal/page.tsx  ← REWRITE (295 lines, was 707 lines)
```

### Commits:
```
0923c36 feat(portal): redesign dashboard UI/UX with module grid + surat tugas tab (#283) [PR #284]
```

### GitHub Issues & PRs:
- Issue #283 → PR #284 ✅ MERGED

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 23: Nomor Surat Format + Auto-Klasifikasi + Template + State Fix

> Document updated: 2026-05-12 12:00
> Status: **COMPLETED** ✅

---

## Phase 23: Nomor Surat Format + Auto-Klasifikasi + Template Dasar + Inbox State

### Accomplishments:
- [x] **Public Form 500 Fix**: Migration `created_by` + `tempat_tujuan` → nullable.
- [x] **Google Sheets Fix**: Path (`../service-account.json`), SSL (`withoutVerifying`), sheet name (`Form Responses 1`).
- [x] **Sumber Dana Labels**: Public form now sends full label ("DIPA", "Dana Kerjasama KJA") instead of lowercase id.
- [x] **Nomor Surat Format**: `ST.{nomor}/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}` — K.18/TU dan /B fixed.
- [x] **Auto-Klasifikasi**: Jika kegiatan mengandung "konflik" → klasifikasi = KSA.03.01, menimbang auto-fill.
- [x] **Template Dasar Update**: Peraturan Menteri Kehutanan Nomor 4 Tahun 2025, DIPA tanggal 24 April 2026, "and" → "dan".
- [x] **Inbox State Fix**: Detail panel auto-clear/auto-select after delete/restore/forceDelete.

### Files Modified:
```
backend/app/Modules/SuratTugas/Migrations/2026_05_12_110000_make_created_by_nullable_on_st_assignment_letters.php  ← NEW
backend/app/Services/GoogleSheetsService.php                               ← path + SSL + sheet name
backend/config/services.php                                                 ← sheet name default
frontend/src/app/surat-tugas/page.tsx                                       ← sumber dana labels
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor format + klasifikasi + template
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← nomor format + klasifikasi + template + konflik detect
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← state management fix
```

### Commits:
```
d5a5c3f fix(surat-tugas): auto-refresh detail panel after delete (#281) [PR #282]
a1b266c fix(surat-tugas): detect default menimbang template and override for konflik
771a32b fix(surat-tugas): force menimbang auto-fill for konflik
2f87acc fix(surat-tugas): auto-fill klasifikasi on builder load (#277)
077768f fix(surat-tugas): update template Dasar sesuai data terbaru (#279) [PR #280]
3970231 feat(surat-tugas): auto-fill klasifikasi + fix nomor surat format (#277) [PR #278]
3925d16 fix(surat-tugas): fix public submit 500 error + Google Sheets integration + sumber dana labels
```

### GitHub Issues & PRs:
- Issue #277 → PR #278 ✅ MERGED (auto-klasifikasi + nomor surat format)
- Issue #279 → PR #280 ✅ MERGED (template dasar update)
- Issue #281 → PR #282 ✅ MERGED (inbox state fix)

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 22: Google Sheets Integration + Bug Fixes + Route Fix

> Document updated: 2026-05-12 10:00
> Status: **COMPLETED** ✅

---

## Phase 22: Google Sheets Integration + Bug Fixes

### Accomplishments:
- [x] **Google Sheets Integration**: Created `GoogleSheetsService.php` — append row on public submit, update row on approve via UUID search in column Y.
- [x] **Service Account Setup**: `service-account.json` at project root (gitignored), `google/auth` composer package installed.
- [x] **Column Mapping**: A=Timestamp, B=Unit Kerja, C-F=Pegawai 1-4, G=overflow comma-separated, H=PLH, P=Kegiatan, Q=Tgl dari, R=Tgl sampai, S=Sumber Dana, T=Upload path, U=Keterangan, V=Tanda Setuju, Y=UUID.
- [x] **Route Fix**: Public form submit changed from `POST /surat-tugas` to `POST /surat-tugas/submit` to avoid conflict with auth route.
- [x] **Print Title**: Now shows `ST.{nomor}-{nama kegiatan}` with no length limit.
- [x] **Tanggal Surat**: Always defaults to today's date.
- [x] **Keterangan Column**: Added to inbox display.
- [x] **File Upload**: Accept jpg/png/webp (not just pdf), fix download endpoint.
- [x] **Employee ID Validation**: Removed numeric constraint (FormData sends strings).
- [x] **History Personil**: Added column showing employee names in history tab.
- [x] **History Pagination**: 5 items per page.
- [x] **Sumber Dana Options**: 11 options (DIPA, KJA, MJA, COP, Tjiwi Kimia, BOSF, CAN, ALeRT, FOLU, DL1, Lainnya).
- [x] **PLH/Tanda Setuju in Inbox**: Now displayed in inbox detail.
- [x] **PLH Autocomplete**: Searchable from employee list in public form.
- [x] **Toaster Fix**: `<Toaster />` was missing from Providers — all toast notifications now work.
- [x] **Employee Search Fix**: Builder + Create handle `name` vs `nama_lengkap` field mismatch.
- [x] **Double Text Fix**: Strip "selama X hari..." suffix when re-parsing saved text.
- [x] **Nomor Surat Width**: Fixed `/05/2026` being cut off.
- [x] **Smart Parsing**: Detect full freeform text vs structured format.

### Pending:
- [ ] Commit route fix (`POST /submit` for public, frontend calls `/surat-tugas/submit`)
- [ ] Test public form submission end-to-end
- [ ] Verify Google Sheets append/update works with service account

### Files Modified:
```
backend/app/Services/GoogleSheetsService.php                               ← NEW
backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php  ← Sheets integration
backend/app/Modules/SuratTugas/Routes/api.php                              ← POST /submit route
backend/config/services.php                                                 ← google_sheets config
backend/composer.json                                                       ← google/auth dependency
frontend/src/app/surat-tugas/page.tsx                                       ← route fix + PLH + sumber dana
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← keterangan + PLH + tanda setuju
frontend/src/app/kepegawaian/_components/AssignmentHistoryTab.tsx           ← pagination + personil
frontend/src/components/providers.tsx                                        ← Toaster added
frontend/src/lib/letter-utils.ts                                            ← smart parsing fix
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← tanggal default + print title
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor surat width
```

### Commits (after PR #276 merged, direct to main):
```
2dfa71c feat(sheets): robust update via UUID in column Y + append on submit
ac4a9d5 feat(surat-tugas): integrate Google Sheets API - append row on submit
0703a53 feat(history): add pagination (5 per page)
209d1fe feat(history): add personil column showing employee names
679a8c5 fix(validation): remove numeric constraint on employee id
c2b3e68 fix(surat-tugas): add keterangan column + fix file download + accept image uploads
1dbab92 fix(builder): tanggal surat always defaults to today
0b0f679 fix(builder): no limit on print title length
5fa7626 fix(builder): increase print title length to 100 chars
1fdedae fix(builder): print title includes nama kegiatan
90d27a6 feat(surat-tugas): add all sumber dana options to public form
87ffb1d fix(surat-tugas): fix plhSearchQuery declaration order + add PLH/tanda_setuju to inbox
```

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 21: Surat Tugas Builder Flow & Print Fix

> Document updated: 2026-05-11 14:00
> Status: **COMPLETED** ✅

---

## Phase 21: Surat Tugas Builder Flow & Print Fix

### Accomplishments:
- [x] **Print Template Rewrite**: Complete rewrite of `STBuilderPreview.tsx` to match `superapp-inventory` reference exactly — Bookman Old Style 11pt, `table-layout: fixed`, inline styles, kop surat in `<thead>` for multi-page repeat.
- [x] **Print CSS Simplified**: Minimal print CSS (`@page margin: 0`, body padding `0.4cm 1cm 1cm 3cm`) — no complex class overrides needed since all styles are inline.
- [x] **Builder 3-Button Flow**: Replaced single "Terbitkan" button with "Simpan Draft" + "Ajukan Persetujuan" + "Cetak / Download".
- [x] **Backend Approve Endpoint Flex**: Made all fields nullable, status optional (no status = don't change status, `pending` = waiting approval, `approved` = published).
- [x] **Backend updateStatus**: Now accepts `pending` as valid status.
- [x] **History Page Upgrade**: Added `draft` status, "Setujui & Terbitkan" button for pending items, updated labels.
- [x] **Inbox Page Upgrade**: Added `draft` status, updated labels ("Menunggu Persetujuan", "Diterbitkan"), auto-refresh with `staleTime: 0`.
- [x] **Nomor Surat Empty by Default**: Removed auto-fetch of next number in both builder and create pages.
- [x] **Nomor Surat Parsing**: Builder now parses `nomor_surat` and `kode_surat` from API response when editing existing ST.
- [x] **404 Graceful Handling**: Builder redirects to inbox if ST is deleted/not found.
- [x] **Public /surat-tugas Verified**: Confirmed identical flow with `superapp-inventory` reference.

### Files Modified:
```
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx  ← REWRITE
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← flow + print CSS
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor surat kosong
frontend/src/app/kepegawaian/_components/AssignmentHistoryTab.tsx           ← status + approve btn
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← labels + auto-refresh
backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php  ← approve + updateStatus
```

### Surat Tugas Flow (Final):
```
Pegawai submit (/surat-tugas) → status: draft
→ Masuk Inbox Admin (/kepegawaian/surat-tugas/inbox) → klik "Proses"
→ Builder (/kepegawaian/surat-tugas/builder/[id])
→ Admin isi nomor, detail → "Simpan Draft" (save tanpa ubah status)
→ Admin cetak → kirim ke Kasubag via WA
→ Admin klik "Ajukan Persetujuan" → status: pending
→ Di History (/kepegawaian/surat-tugas/history): badge "Menunggu Persetujuan"
→ Kasubag ACC → Admin klik ✓ di History → status: approved ("Diterbitkan")
```

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

### Additional Fixes (same session):
- [x] **PLH & Tanda Setuju**: Added to public form `/surat-tugas` — PLH shows when Kasubag/Kaseksi selected, Tanda Setuju shows when Seksi employee selected.
- [x] **Backend migration**: Added `nama_plh`, `has_seksi_employee`, `tanda_setuju` columns to `st_assignment_letters`.
- [x] **Route move**: `/surat-tugas` moved from `(publik)` to dedicated route with minimal layout (no navbar/footer).
- [x] **Logo unified**: All logo references → `/logo_bksda.png`.
- [x] **Tempat Tujuan removed**: From public form (nullable in DB), but saved from builder's "Tujuan" field.
- [x] **Toaster added**: `<Toaster />` was missing from Providers — all toast notifications now work.
- [x] **Employee search fix**: Builder + Create pages now handle `name` vs `nama_lengkap` field mismatch from API.
- [x] **Employee normalize**: When adding from search, `nama_lengkap` and `jabatan` populated from `name`/`position`.
- [x] **Nomor surat width**: Fixed `/05/2026` being cut off in both builder and create pages.
- [x] **Double text fix**: Strip "selama X hari..." suffix when re-parsing saved `maksud_tujuan`.
- [x] **Smart parsing**: Detect full freeform text vs structured "Perjalanan Dinas dari X ke Y" — no more double prefix.
- [x] **tempat_tujuan saved**: Builder now sends `kotaTujuan` as `tempat_tujuan` to backend.
- [x] **Inbox NIP**: Backend now loads `nip,jabatan` for employees in index query.

---

# Progress - Phase 20: Surat Tugas Standardization (Inbox & Builder)

> Document updated: 2026-05-11 10:15
> Status: **COMPLETED** ✅

---

## Phase 20: Surat Tugas Standardization (Inbox & Builder)

### Accomplishments:
- [x] **Inbox UI Unification**: Restored `max-w-7xl` container and standardized header to match the administrative design system (History module).
- [x] **PDF Template Engineering**: Reconstructed the Surat Tugas layout with fixed-width labels for perfect colon alignment and justify perataan.
- [x] **Print Reliability Engine**: Injected self-contained CSS into the print window to ensure 100% visual parity between screen preview and PDF output.
- [x] **Signatory Alignment**: Fixed signatory (TTD) positioning to be right-aligned in print using robust margin offsets.

---

# Progress - Phase 10: Route Restructure & Portal Dashboard

## ⚠️ GIT WORKFLOW — WAJIB DIIKUTI SETIAP ISSUE

> **DILARANG SHORTCUT!** Setiap issue WAJIB mengikuti flow ini TANPA PENGECUALIAN:

```bash
# STEP 0 — Buat GitHub Issue (jika belum ada)
gh issue create --title "feat(module): nama issue" --body "deskripsi" --label "frontend" # atau backend

# STEP 1 — Ambil state terbaru & buat branch
git pull origin main
git checkout -b issue/XXX-nama-issue

# STEP 2 — Kerjakan kode sesuai spec di docs/issues/XXX-*.md

# STEP 3 — CEK IDE WARNINGS (WAJIB! 2-3x sebelum commit)
cd frontend; npm run lint -- --max-warnings=0   # wajib 0
cd frontend; npx tsc --noEmit                   # wajib 0 error
cd frontend; npm run build                       # wajib clean
# Periksa juga IDE Warning All di VS Code Problems tab (Ctrl+Shift+M)!
# Tailwind v4: bg-gradient-to-* → bg-linear-to-*, flex-shrink-0 → shrink-0, dll

# STEP 4 — Commit (HINDARI git add . — selalu specify folder)
git add frontend/src/components/ frontend/src/app/bmn/ # contoh
git commit -m "feat(module): deskripsi (#<nomor_gh_issue>)"

# STEP 5 — Push & PR
git push -u origin issue/XXX-nama-issue
gh pr create --title "feat(module): deskripsi (#XXX)" --body "Closes #<nomor_gh_issue>" --base main

# STEP 6 — Merge & cleanup (setelah PR di-test & di-approve)
gh pr merge <PR_NUMBER> --merge --delete-branch
git checkout main; git pull origin main

# STEP 7 — Update HANDOFF.md & progress.md lalu push
git add docs/HANDOFF.md docs/progress.md
git commit -m "docs: update HANDOFF.md and progress.md - issue #XXX selesai"
git push origin main
```

> ❌ **DILARANG** mulai mengerjakan issue tanpa `gh issue create` terlebih dahulu!
> ❌ **DILARANG** skip cek IDE warning — Tailwind v4 warnings **harus 0** sebelum commit!
> ❌ **DILARANG** commit langsung ke `main` tanpa PR!
> ❌ **DILARANG** `git add .` — selalu specify folder (`frontend/src/...` atau `backend/...`)!

---

## Phase 19: Audit Middleware (Next.js Middleware migration)

### Status: **COMPLETED** ✅
*Note: Logic implemented in `src/proxy.ts` to match project conventions and avoid conflict with middleware.ts.*

---

## Phase 18: letter-utils.ts Refactoring

## Phase 17: Inventory Trash/Restore Upgrade

### Status: **COMPLETED** ✅

---

## Phase 16: InteractiveKawasanMap Integration

### Status: **COMPLETED** ✅

---

## Phase 15: System Integration & Optimization (Part 1: AuthSync)

### Status: **COMPLETED** ✅

> Document created: 2026-05-10
> Last updated: 2026-05-10 14:55

---

## Phase 14: Inventory Bulk Operations Upgrade

### Status: **COMPLETED** ✅

---

## Summary

Phase 11 implemented RouteGuard Component. Phase 12 focuses on EmployeeAccessSheet for granular module access management.

**Changes in PR #254:**
- Created `frontend/src/components/RouteGuard.tsx`
- Applied RouteGuard to all 5 module layouts (bmn, inventory, kepegawaian, dereporting, cms)
- Added CMS Panel to ModuleSwitcher
- Added ModuleSwitcher and ThemeToggle to CMS layout
- Fixed proxy.ts: authenticated /login redirect → /portal, added /portal and /cms to protected routes
- Fixed ModuleSwitcher: shows active module name/icon based on current route

**Branch Status:**
- Commits: 4 commits pushed
 
- **Phase 12 Update:**
- Branch: `issue/255-employee-access-sheet`
- Commits: 2 commits pushed
- PR: [#256](https://github.com/tegaranugrah1/bksda-superapp/pull/256) - **MERGED ✅**
- Status: COMPLETED ✅

- **Phase 13 Update:**
- Branch: `feat/bmn-import-export-upgrade`
- Commits: 4 commits pushed
- PR: [#258](https://github.com/tegaranugrah1/bksda-superapp/pull/258) - **MERGED ✅**
- Status: COMPLETED ✅

- **Phase 14 Update:**
- Branch: `issue/259-inventory-bulk-operations`
- Commits: 4 commits pushed
- PR: [#259](https://github.com/tegaranugrah1/bksda-superapp/pull/259) - **MERGED ✅**
- Status: COMPLETED ✅

---

## Completed Tasks

### AuthSync Component Implementation (Phase 15) ✅

**Frontend:**
- [x] Phase 15: Cross-tab Session Sync (AuthSync)
- [x] Bugfix: Initial redirection race condition in AuthSync
- Created `AuthSync.tsx` component to handle cross-tab session management.
- Implemented transition-based detection (ref-based) for login/logout events.
- Integrated `AuthSync` into root `Providers` for global side-effects.
- Configured public route bypass to ensure landing page and public resources remain accessible to unauthenticated users.
- Added session-termination toast notifications via `sonner`.

### Inventory Bulk Operations Upgrade (Phase 14) ✅

**Backend:**
- Created `ItemExport` and `TransactionExport` classes for inventory reporting.
- Implemented `ItemImport` with automatic category mapping (`nama_kategori`) and validation.
- Created dedicated `ExportController` and updated `ItemController`.
- Registered API routes for import/export in `api.php`.

**Frontend:**
- Created `InventoryImportDialog.tsx` with modern UI and format guidance.
- Added Import/Export buttons to Katalog Barang (`InventoryItemsPage`).
- Added dynamic Export button to Riwayat Mutasi (`TransactionsHistoryPage`).
- Verified type safety for all new components.

### BMN Import/Export Upgrade (Phase 13) ✅

**Backend:**
- Installed `maatwebsite/excel` (resolved PHP 8.5 conflicts).
- Created `AssetExport`, `LoanExport`, `MaintenanceExport` classes.
- Created `AssetImport` with validation rules.
- Integrated methods into `AssetController` and `ExportController`.
- Registered `POST /api/bmn/assets/import` endpoint.

**Frontend:**
- Created `AssetImportDialog.tsx` with file upload logic and format guidelines.
- Integrated "Impor Excel" button to `BmnAssetsPage`.
- Fixed Module Resolution issues in `page.tsx` using absolute aliases.
- Restored missing `cn` import in `EmployeeAccessSheet.tsx`.
- Updated `BmnAssetFormPage` for Next.js 15 Async Params compatibility.

**Verification:**
- Verified 0 TypeScript errors via `npx tsc --noEmit`. ✅
- Pushed to `main` and merged. ✅

### EmployeeAccessSheet Implementation (Phase 12) ✅

**Created:**
- `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx`
  - Features:
    - Side-sliding sheet for access management.
    - Role selection (super_admin, admin, user).
    - Multi-select module checkboxes (Kepegawaian, BMN, Inventory, D-Reporting, CMS).
    - Password reset functionality (On-the-Fly account creation support).
    - Integration with `react-query` for fetching/updating.

**Modified:**
- `frontend/src/app/kepegawaian/page.tsx`
  - Added `EmployeeAccessSheet` integration.
  - Connected "UserCog" button to open the access management sheet for specific employee.

### RouteGuard Implementation (Phase 11) ✅

**Created:**
- `frontend/src/components/RouteGuard.tsx` - NEW component
  - Uses `useMemo` for synchronous access determination
  - Super admin bypasses all checks
  - Redirects unauthorized users to `/portal?unauthorized=1`
  - Loading spinner during auth check

**Modified:**
- `frontend/src/app/bmn/layout.tsx` - Added RouteGuard
- `frontend/src/app/inventory/layout.tsx` - Added RouteGuard
- `frontend/src/app/kepegawaian/layout.tsx` - Added RouteGuard
- `frontend/src/app/dereporting/layout.tsx` - Added RouteGuard
- `frontend/src/app/cms/layout.tsx` - Added RouteGuard + ModuleSwitcher + ThemeToggle
- `frontend/src/components/module-switcher.tsx` - Added CMS Panel, fixed active state
- `frontend/src/proxy.ts` - Fixed /login redirect, added /portal and /cms routes

---

## Phase 10 Completed Tasks (for reference)

### 1. Route Restructure ✅

**Changes:**
- Moved `/portal/bmn/` → `/bmn/`
- Moved `/portal/inventory/` → `/inventory/`
- Moved `/portal/dereporting/` → `/dereporting/`
- Moved `/portal/kepegawaian/` → `/kepegawaian/`
- Created new `/portal/page.tsx` - Personal Dashboard

**Login redirect:**
- Login page now redirects authenticated users to `/portal`
- After successful login → redirects to `/portal`

### 2. Portal Dashboard (`/portal`) ✅

**Features:**
- Module grid cards (BMN, Inventory, DeReporting, CMS) based on user `access_modules`
- Tab: Pinjaman Aktif, Aset Saya
- Profile sidebar with edit profile & change password dialogs
- Greeting based on time of day
- Error state with retry option when API fails

**UI Style:** Follows superapp-inventory design patterns

### 3. Backend API Endpoint ✅

**Endpoint:** `GET /api/me/dashboard`

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Administrator",
    "role": "super_admin",
    "access_modules": ["kepegawaian", "bmn", "inventory", "dereporting"]
  },
  "employee": { ... },
  "my_assets": []
}
```

### 4. ModuleSwitcher Update ✅

- Portal Utama link changed from `/` → `/portal`
- Now points to Personal Dashboard

### 5. Module Layouts - ThemeToggle & User Profile ✅

**Layout Structure:**
```
┌─────────────────────────────┐
│ [Logo] BKSDA    [🌙/☀️]     │  ← ThemeToggle in header
│        [Module Switcher]    │
├─────────────────────────────┤
│  Nav 1                      │
│  Nav 2                      │
│  ...                        │
├─────────────────────────────┤
│ [Avatar] Nama User          │  ← User info in footer
│          Role               │     above logout
│        [Logout]             │
└─────────────────────────────┘
```

**Files Updated:**
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`
- `frontend/src/app/kepegawaian/layout.tsx`
- `frontend/src/app/dereporting/layout.tsx`

---

## URL Structure

```
# Landing Page
localhost:3000/                        → Landing page BKSDA

# Login
localhost:3000/login/                  → Login page

# Portal Admin (Personal Dashboard)
localhost:3000/portal/                  → Personal Dashboard

# Modules (ROOT LEVEL)
localhost:3000/bmn/                    → BMN Module
localhost:3000/inventory/              → Inventory Module
localhost:3000/dereporting/           → DeReporting Module
localhost:3000/kepegawaian/           → Kepegawaian Module
localhost:3000/cms/                   → CMS Module (NEW!)

# Public Website
localhost:3000/informasi/              → Berita
localhost:3000/kawasan/               → Kawasan
localhost:3000/tsl/                   → TSL
localhost:3000/galeri/               → Galeri
localhost:3000/publikasi/            → Publikasi
localhost:3000/hubungi-kami/        → Kontak
localhost:3000/verifikasi/surat-tugas/[id]/ → QR Verification
```

---

## Test Credentials

**Super Admin:**
| Field | Value |
|-------|-------|
| Username | `198001012005011001` |
| Password | `Bksda2026!@#` |

---

## Git Commits

### Phase 11 (RouteGuard - PR #254)

| Commit | Description |
|--------|-------------|
| `c7be041` | feat(frontend): add RouteGuard component for access_modules check (#253) |
| `9ef3e20` | fix: redirect authenticated /login to /portal, add /portal and /cms to protected routes |
| `92a8b83` | feat(cms): add CMS to ModuleSwitcher and add ModuleSwitcher+ThemeToggle to CMS layout |

### Phase 12 (EmployeeAccessSheet)

| Commit | Description |
|--------|-------------|
| `5ca9040` | feat(kepegawaian): add EmployeeAccessSheet for granular module access management (#255) |

### Phase 10 (Route Restructure - PR #252)

| Commit | Description |
|--------|-------------|
| `7ec9652` | feat(frontend): route restructure - move modules to root level + create portal dashboard |
| `eadfb5a` | fix(login): redirect to /portal if already authenticated |
| `162a110` | fix(portal): handle API error gracefully with retry option |
| `0ba2c40` | feat(backend): add /api/me/dashboard endpoint for portal dashboard |
| `900e9b8` | fix(backend): handle missing bmn_asset_loans table gracefully |
| `bd155bf` | fix(backend): dashboard endpoint - don't use undefined relationship |
| `917abcc` | fix(portal): align API response with frontend expectations |
| `fe74b09` | Add dark mode toggle and user info to all module layouts |
| `31f0777` | refactor: update sidebar layouts with ThemeToggle and user profile placement |
| `53eaea9` | fix(inventory): rename sidebar header to 'Inventory' for space efficiency |
| `955311c` | fix(inventory): remove stray div tag in InventorySidebar |
| `1c6121a` | fix(inventory): add subtitle 'Inventaris & Stok' to sidebar header |
| `a726db6` | fix(module-switcher): show active module name and icon based on current route |
| `abdcfe0` | docs: update HANDOFF.md - PR #252 merged, Phase 10 COMPLETED |

---

## Known Issues / TODOs

| # | Task | Priority | Status |
|---|-------|----------|--------|
| 1 | BMN Import/Export upgrade | HIGH | COMPLETED ✅ |
| 2 | Inventory Bulk Operations upgrade | HIGH | COMPLETED ✅ |
| 3 | AuthSync Component (cross-tab session) | MEDIUM | COMPLETED ✅ |
| 4 | InteractiveKawasanMap Upgrade | MEDIUM | COMPLETED ✅ |
| 5 | letter-utils.ts | LOW | COMPLETED ✅ |
| 6 | Inventory Trash/Restore upgrade | MEDIUM | COMPLETED ✅ |

---

## Verification Status

| Check | Status |
|-------|--------|
| Build | ✅ Success |
| ESLint | ✅ 0 errors, 0 warnings (Strict mode passed) |
| TypeScript | ✅ 0 errors |
| Backend PHP Syntax | ✅ Pass |
| AuthSync Hydration | ✅ Verified (No race condition) |
| RouteGuard Safety | ✅ Verified (Safe redirects) |
| Direct Navigation | ✅ Fixed (Redirect loops resolved) |

---

## PR Information

- **PR:** https://github.com/tegaranugrah1/bksda-superapp/pull/254
- **Branch:** `issue/253-route-guard-component`
- **Status:** MERGED ✅

---

Phase 10 focuses on restructuring routes and creating a standalone Portal Dashboard, aligning bksda-superapp with superapp-inventory patterns.

**Today's Updates:**
- Added ThemeToggle (dark/light mode) to all module layouts
- Added User Profile info (avatar, name, role badge) in sidebar footer
- Refactored layout: ThemeToggle in header, User profile above logout button
- Committed and pushed all changes (commit `31f0777`)
- Updated HANDOFF.md and progress.md for Phase 10 completion

**Branch Status:**
- Branch: `issue/121-frontend-route-restructure-phase10`
- Commits pushed to origin
- PR #252 open and pending testing

---

## Completed Tasks

### 1. Route Restructure ✅

**Changes:**
- Moved `/portal/bmn/` → `/bmn/`
- Moved `/portal/inventory/` → `/inventory/`
- Moved `/portal/dereporting/` → `/dereporting/`
- Moved `/portal/kepegawaian/` → `/kepegawaian/`
- Created new `/portal/page.tsx` - Personal Dashboard

**Login redirect:**
- Login page now redirects authenticated users to `/portal`
- After successful login → redirects to `/portal`

### 2. Portal Dashboard (`/portal`) ✅

**Features:**
- Module grid cards (BMN, Inventory, DeReporting, CMS) based on user `access_modules`
- Tab: Pinjaman Aktif, Aset Saya
- Profile sidebar with edit profile & change password dialogs
- Greeting based on time of day (Selamat Pagi/Siang/Sore/Malam)
- Ambient background gradient effects
- Error state with retry option when API fails

**UI Style:** Follows superapp-inventory design patterns

### 3. Backend API Endpoint ✅

**Endpoint:** `GET /api/me/dashboard`

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Administrator",
    "username": "198001012005011001",
    "email": "admin@bksda.local",
    "role": "super_admin",
    "access_modules": ["kepegawaian", "bmn", "inventory", "dereporting"]
  },
  "employee": {
    "id": 1,
    "nip": "198001012005011001",
    "name": "Administrator pusat BKSDA",
    "position": "Kepala Satuan Teknologi",
    "department": "BKSDA pusat Provinsi",
    "email": "admin@bksda.local",
    "phone": null,
    "photo": null,
    "rank": "Pembina Utama / IV.c",
    "rank_level": 0,
    "is_active": true
  },
  "my_assets": []
}
```

### 4. ModuleSwitcher Update ✅

- Portal Utama link changed from `/` → `/portal`
- Now points to Personal Dashboard

### 5. Module Layouts - ThemeToggle & User Profile ✅

**Added to all module layouts (BMN, Inventory, Kepegawaian, DeReporting):**

**Layout Structure:**
```
┌─────────────────────────────┐
│ [Logo] BKSDA    [🌙/☀️]     │  ← ThemeToggle in header (right side)
│        [Module Switcher]    │
├─────────────────────────────┤
│  Nav 1                      │
│  Nav 2                      │
│  Nav 3                      │
│  ...                        │
├─────────────────────────────┤
│ [Avatar] Nama User          │  ← User info in footer
│          Role               │     positioned above logout
│        [Logout]             │
└─────────────────────────────┘
```

**Components Added:**
- `ThemeToggle` - dark/light mode switch button
- User info card with avatar initial, name, role badge
- `LogoutButton` at bottom

**Files Updated:**
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`
- `frontend/src/app/kepegawaian/layout.tsx`
- `frontend/src/app/dereporting/layout.tsx`

---

## URL Structure

```
# Landing Page
localhost:3000/                        → Landing page BKSDA

# Login
localhost:3000/login/                  → Login page

# Portal Admin (Personal Dashboard)
localhost:3000/portal/                  → Personal Dashboard
  - Module grid cards
  - Tab: Pinjaman Aktif, Aset Saya
  - Profile sidebar

# Modules (ROOT LEVEL)
localhost:3000/bmn/                    → BMN Module
localhost:3000/inventory/              → Inventory Module
localhost:3000/dereporting/           → DeReporting Module
localhost:3000/kepegawaian/           → Kepegawaian Module

# CMS Admin
localhost:3000/cms/                    → CMS Dashboard

# Public Website
localhost:3000/informasi/              → Berita
localhost:3000/kawasan/               → Kawasan
localhost:3000/tsl/                   → TSL
localhost:3000/galeri/               → Galeri
localhost:3000/publikasi/            → Publikasi
localhost:3000/hubungi-kami/        → Kontak
localhost:3000/verifikasi/surat-tugas/[id]/ → QR Verification
```

---

## Test Credentials

**Super Admin:**
| Field | Value |
|-------|-------|
| Username | `198001012005011001` |
| Password | `Bksda2026!@#` |

---

## Files Changed

### Backend
```
backend/app/Http/Controllers/Api/AuthController.php     ← Added dashboard() method
backend/app/Http/Resources/MeDashboardResource.php    ← NEW - dashboard response resource
backend/routes/api.php                              ← Added /me/dashboard route
```

### Frontend
```
frontend/src/app/portal/page.tsx                      ← NEW - Personal Dashboard
frontend/src/app/(auth)/login/page.tsx               ← Redirect authenticated users to /portal
frontend/src/components/module-switcher.tsx           ← Portal link to /portal
frontend/src/app/bmn/                                ← MOVED from /portal/bmn/
frontend/src/app/inventory/                         ← MOVED from /portal/inventory/
frontend/src/app/dereporting/                        ← MOVED from /portal/dereporting/
frontend/src/app/kepegawaian/                         ← MOVED from /portal/kepegawaian/
```

---

## Git Commits

| Commit | Description |
|--------|-------------|
| `7ec9652` | feat(frontend): route restructure - move modules to root level + create portal dashboard |
| `eadfb5a` | fix(login): redirect to /portal if already authenticated |
| `162a110` | fix(portal): handle API error gracefully with retry option |
| `0ba2c40` | feat(backend): add /api/me/dashboard endpoint for portal dashboard |
| `900e9b8` | fix(backend): handle missing bmn_asset_loans table gracefully |
| `bd155bf` | fix(backend): dashboard endpoint - don't use undefined relationship |
| `917abcc` | fix(portal): align API response with frontend expectations |
| `fe74b09` | Add dark mode toggle and user info to all module layouts |
| `b28c9f1` | Refactor sidebar layout: ThemeToggle next to header, user profile above logout |
| `31f0777` | refactor: update sidebar layouts with ThemeToggle and user profile placement |

---

## Known Issues / TODOs

| # | Task | Priority | Status |
|---|-------|----------|--------|
| 1 | RouteGuard Component (access_modules check) | HIGH | PENDING |
| 2 | AuthSync Component (cross-tab session) | MEDIUM | PENDING |
| 3 | EmployeeAccessSheet Component | HIGH | PENDING |
| 4 | InteractiveKawasanMap Upgrade | MEDIUM | PENDING |
| 5 | letter-utils.ts | LOW | PENDING |
| 6 | Upgrade BMN Import/Export | HIGH | COMPLETED ✅ |
| 7 | Upgrade Inventory Bulk Operations | HIGH | COMPLETED ✅ |
| 8 | Upgrade Inventory Trash/Restore | MEDIUM | COMPLETED ✅ |

---

## Verification Status

| Check | Status |
|-------|--------|
| Build | ✅ Success |
| ESLint | ✅ 0 errors, 15 warnings |
| TypeScript | ✅ 0 errors |
| Backend PHP Syntax | ✅ Pass |
| Portal Page Load | 🔄 Testing needed |
| Login Flow | 🔄 Testing needed |
| Module Navigation | 🔄 Testing needed |

---

## PR Information

- **PR:** https://github.com/tegaranugrah1/bksda-superapp/pull/252
- **Branch:** `issue/121-frontend-route-restructure-phase10`
- **Status:** Open, testing in progress

# Progress Log: Modul Kepegawaian & Surat Tugas

## [2026-05-10] Sesi Konsolidasi & Restrukturisasi

### Completed (Selesai)
- [x] Pindahkan fitur Tambah Pegawai ke `/kepegawaian/employees/create`.
- [x] Pindahkan fitur Detail Pegawai ke `/kepegawaian/employees/[id]`.
- [x] Pindahkan operasional Surat Tugas ke `/kepegawaian/surat-tugas/*`.
- [x] Update Sidebar Global agar flat (langsung akses Inbox, Buat Surat, dan Riwayat).
- [x] Perbaikan Error 404 pada navigasi `KepegawaianLayout`.
- [x] Fix Linting: Ganti `any` dengan interface di `EmployeeCreatePage`.
- [x] Fix Linting: Ganti `<img>` dengan `next/image`.
- [x] Fix Linting: Update `rounded-[2rem]` menjadi `rounded-4xl`.
- [x] Riset & Bedah Flow Referensi dari `superapp-inventory`.

### In Progress (Sedang Berjalan)
- [/] Sinkronisasi komponen `AssignmentLetterPreview` agar tidak tergantung folder lama.

### Next Steps (Rencana Besok)
- [ ] **Implementasi ST Builder Premium**:
    - [ ] Buat UI Builder dengan Sidebar Form & Main Preview.
    - [ ] Implementasi Auto-parsing kalimat (Asal, Tujuan, Rangka).
    - [ ] Penomoran surat otomatis (ST.XXX/Code/MM/YYYY).
    - [ ] Fitur Print langsung dari browser.
- [ ] **Integrasi Inbox -> Builder**: Klik "Setujui" di Inbox langsung lempar data ke Builder.
- [ ] **Cleanup**: Hapus folder `src/app/(dashboard)/admin/surat-tugas` (Didepresiasi).
