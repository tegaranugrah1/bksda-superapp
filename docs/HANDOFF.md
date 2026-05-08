# 🔄 HANDOFF — Progress Tracker

> **TUJUAN FILE INI:**
> File ini adalah "memori" antar sesi chat AI.
> AI WAJIB membaca file ini di awal, dan meng-UPDATE file ini sebelum sesi berakhir.

---

## Status Saat Ini

| Field | Value |
|-------|-------|
| **Issue Terakhir Selesai** | #059 - Frontend Inventory Types |
| **Issue Selanjutnya** | #060 - BMN Module (Phase 6) |
| **Branch Aktif** | `main` |
| **Model Terakhir** | Claude Sonnet 4.6 |
| **Timestamp** | 2025-05-08T13:00:00+08:00 |
| **GitHub Issue** | #108 (PR #109 merged) |

> [!IMPORTANT]
> **INSTRUKSI USER**: Kerjakan SEMUA issue dulu secara berurutan. **JANGAN** rombak UI di akhir phase.
> UI Overhaul akan dilakukan setelah seluruh issue Phase 5–8 selesai dikerjakan.

---

## Progress Phase 1: Project Init & Foundation (#001–#008)

- [x] #001 — Project Rules & Coding Standards
- [x] #002 — Init Monorepo Structure
- [x] #003 — Backend Laravel Scaffold
- [x] #004 — Backend Database & Env Config
- [x] #005 — Frontend Next.js Scaffold
- [x] #006 — Frontend Design System
- [x] #007 — Docker Compose PostgreSQL
- [x] #008 — Backend IDE Helper Setup

## Progress Phase 2: IAM & Auth (#009–#021)

- [x] #009 — Backend Users Migration & Model
- [x] #010 — Backend Laravel Sanctum Setup
- [x] #011 — Backend Auth Controller
- [x] #012 — Backend Module Access Middleware
- [x] #013 — Backend Role Middleware
- [x] #014 — Backend AuditLog Middleware
- [x] #015 — Backend Register Middleware
- [x] #016 — Frontend API Client
- [x] #017 — Frontend Login Page
- [x] #018 — Frontend Route Guard
- [x] #019 — Frontend Auth Sync
- [x] #020 — Frontend Query Provider
- [x] #021 — Frontend Theme Toggle
- [x] #021b — **Phase 2 UI Overhaul** (Login Page → Split-screen premium)

## Progress Phase 3: Core Module (Kepegawaian) (#022–#034)

- [x] #022 — Backend Employees Migration (`kpg_employees` table)
- [x] #023 — Backend Employee Model (Modular `App\Modules\Kepegawaian\Models\Employee`)
- [x] #024 — Backend KepegawaianServiceProvider (Modular route registration)
- [x] #025 — Backend Employee CRUD Controller + FormRequest
- [x] #026 — Backend Employee Access Controller (IAM via NIP ↔ Username)
- [x] #027 — Backend Kepegawaian Routes (7 endpoints with layered middleware)
- [x] #028 — Frontend Admin Layout (Sidebar + Topbar + RouteGuard)
- [x] #029 — Frontend ModuleSwitcher Component (Dropdown with IAM filter)
- [x] #030 — Frontend LogoutButton Component (Modal confirmation + API revoke)
- [x] #031 — Frontend Portal Page (Grid cards hub with staggered animation)
- [x] #032 — Frontend Employee List Page (TanStack Query + Debounce + Pagination)
- [x] #033 — Frontend Employee Create Form (Split layout + FormData + Image Preview)
- [x] #034 — SuperAdmin Seeder + Integration Test Protocol
- [x] #034b — **Phase 3 UI Overhaul** (Admin Layout, Portal, & Employee UI → Premium Glassmorphism)![alt text](image.png)

---

## Progress Phase 5: Inventory Module (#046–#059)

- [x] #046 — Backend Inventory Migrations (5 tables: categories, offices, items, inventory_stocks, stock_transactions, GitHub Issue #81, PR #82 merged)
- [x] #047 — Backend Inventory Models (5 Eloquent models with cross-module relations, GitHub Issue #83, PR #84 merged)
- [x] #048 — Backend Inventory Service Provider (InventoryServiceProvider + Routes/api.php ping + providers.php, GitHub Issue #85, PR #86 merged)
- [x] #049 — Backend Inventory Service (InventoryService stockIn/stockOut + DB::transaction + lockForUpdate, GitHub Issue #87, PR #88 merged)
- [x] #050 — Backend Inventory Requests (4 FormRequests: StoreOffice, StoreItem, StockIn, StockOut, GitHub Issue #89, PR #90 merged)
- [x] #051 — Backend Inventory Controllers (4 Controllers: Dashboard, Office, Item, Stock with DI, GitHub Issue #91, PR #92 merged)
- [x] #052 — Backend Inventory Routes (8 endpoints, role-based READ/WRITE split, GitHub Issue #94, PR #95 merged)
- [x] #053 — Frontend Inventory Layout (InventorySidebar + layout.tsx, GitHub Issue #96, PR #97 merged)
- [x] #054 — Frontend Inventory Dashboard (stats cards + krisis stok alert, GitHub Issue #98, PR #99 merged)
- [x] #055 — Frontend Inventory Items (split-panel catalog + data grid, GitHub Issue #100, PR #101 merged)
- [x] #056 — Frontend Inventory Stock In (blue glassmorphism form, GitHub Issue #102, PR #103 merged)
- [x] #057 — Frontend Inventory Stock Out (orange form + cross-module employees, GitHub Issue #104, PR #105 merged)
- [x] #058 — Frontend Inventory Transactions (audit trail + backend patch history(), GitHub Issue #106, PR #107 merged)
- [x] #059 — Frontend Inventory Types (5 TypeScript interfaces, GitHub Issue #108, PR #109 merged)

---

## Progress Phase 4: Surat Tugas Module (#035–#045c)

- [x] #035 — Backend Assignment Letters Migration (`st_assignment_letters` + `st_assignment_letter_employees`, GitHub Issue #66, PR #67 merged)
- [x] #036 — Assignment Letter Model (`AssignmentLetter.php` + `AssignmentLetterEmployee.php` Pivot, PR #68 merged)
- [x] #037 — SuratTugas Service Provider + API Routing (`SuratTugasServiceProvider.php` + `Routes/api.php` + `bootstrap/providers.php`, PR #69 merged)

- [x] #038 — Assignment Letter Controller + Request (`AssignmentLetterController.php` + `AssignmentLetterRequest.php` + Routes updated, PR #70 merged)
- [x] #039 — API Routing Security Layers (`auth:sanctum`, `module.access:surat_tugas`, `audit.log`, public verify endpoint, PR #71 merged)
- [x] #040 — Public QR Verification Page (`frontend/src/app/(website)/verifikasi/surat-tugas/[id]/page.tsx`, 3-State UI, PR #72 merged)
- [x] #041 — A4 Letter Preview Component (`frontend/src/app/(dashboard)/surat-tugas/_components/AssignmentLetterPreview.tsx`, QR Code + @media print CSS, PR #74 merged)
- [x] #042 — Data Grid + Create Form (`frontend/src/app/(dashboard)/surat-tugas/page.tsx` + `create/page.tsx`, FormData multipart, PR #75 merged)
- [x] #043 — Approval Dialog (`frontend/src/app/(dashboard)/surat-tugas/_components/ApprovalDialog.tsx`, 3-state (approve/reject/input nomor), PR #76 merged)
- [x] #044 — Archive + Filter Status Toolbar (`frontend/src/app/(dashboard)/surat-tugas/page.tsx`, Status dropdown + Trash toggle + Delete/Restore mutations, PR #77 merged)
- [x] #045 — EmployeePicker Component (`frontend/src/components/custom/EmployeePicker.tsx`, debounce 300ms + click-outside, PR #75 merged via #042 dependency)
- [x] #045b — UI Enhancement: Split Panel Create Page (`frontend/src/app/(dashboard)/surat-tugas/create/page.tsx`, split panel left 440px + live A4 preview right, glassmorphism form, gradient submit button)
- [x] #045c — Public Surat Tugas Form + Admin Approve Flow

## File yang Terakhir Dibuat/Diubah (Phase 4 - #045c)
```
backend/app/Modules/SuratTugas/Requests/PublicSuratTugasRequest.php                  ← [NEW] #045c
backend/app/Modules/SuratTugas/Routes/api.php                                 ← [UPDATED] #045c - public route
backend/app/Modules/Kepegawaian/Routes/api.php                            ← [UPDATED] #045c - employee select
backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php           ← [UPDATED] #045c - select()
```

### Frontend (#045c - Public Form + Admin)
```
frontend/src/app/(website)/surat-tugas/page.tsx     ← [NEW] Public form 3 steps
frontend/src/app/(website)/layout.tsx              ← [NEW] Basic layout with Providers
frontend/src/app/(dashboard)/admin/surat-tugas/  ← [NEW] Admin pages (moved from surat-tugas)
frontend/src/components/layout/sidebar.tsx       ← [UPDATED] Menu Surat Tugas
```

### Frontend (Components & Pages)
```
frontend/src/components/layout/sidebar.tsx              ← [NEW] Glassmorphism sidebar + LogoutButton
frontend/src/components/layout/topbar.tsx               ← [NEW] Topbar + ModuleSwitcher + ThemeToggle
frontend/src/components/module-switcher.tsx             ← [NEW] Dropdown modul dengan IAM filter
frontend/src/components/logout-button.tsx               ← [NEW] Modal konfirmasi logout + API revoke
frontend/src/app/(dashboard)/layout.tsx                 ← [NEW] Dashboard layout dengan RouteGuard
frontend/src/app/(dashboard)/page.tsx                   ← [NEW] Portal hub grid cards
frontend/src/app/(dashboard)/kepegawaian/page.tsx       ← [NEW] Tabel pegawai dengan pagination
frontend/src/app/(dashboard)/kepegawaian/create/page.tsx ← [NEW] Form create pegawai + upload foto
```

---

## Endpoint API Tersedia (Backend Kepegawaian)

| Method | Endpoint | Middleware | Keterangan |
|--------|----------|-----------|------------|
| GET | `/api/kepegawaian/employees` | `auth:sanctum`, `module.access:kepegawaian` | List/Search Pegawai |
| POST | `/api/kepegawaian/employees` | + `role:super_admin,admin` | Tambah Pegawai |
| GET | `/api/kepegawaian/employees/{id}` | `auth:sanctum`, `module.access:kepegawaian` | Detail Pegawai |
| PUT | `/api/kepegawaian/employees/{id}` | + `role:super_admin,admin` | Update Pegawai |
| DELETE | `/api/kepegawaian/employees/{id}` | + `role:super_admin,admin` | Soft Delete Pegawai |
| GET | `/api/kepegawaian/employees/{id}/access` | + `role:super_admin` | Cek Status IAM |
| PUT | `/api/kepegawaian/employees/{id}/access` | + `role:super_admin` | Atur IAM |

---

## Akun Super Admin (Seeder)

| Field | Value |
|-------|-------|
| **NIP** | `198001012005011001` |
| **Username (Login)** | `198001012005011001` |
| **Password** | `Bksda2026!@#` |
| **Role** | `super_admin` |
| **Akses Modul** | `kepegawaian`, `bmn`, `inventory`, `dereporting` |

---

## IDE Check Status (Sebelum Push)

| Check | Status | Keterangan |
|-------|--------|------------|
| TypeScript | ✅ | 0 error |
| ESLint | ✅ | 0 error (Final Triple-Check) |
| PHP Intelephense | ✅ | 0 error (fix: `$request->filled()`) |
| Tailwind v4 | ✅ | Canonical classes updated |

---

## Error / Blocker Terakhir

None. Navigation stability, BFCache "Zombie" state, and authentication sync have been resolved with a Next.js-native restore boundary, auth snapshot store, and active React Query refetch.

---

## ⚠️ INSTRUKSI UNTUK AI BARU

Jika kamu membaca file ini di sesi chat baru, lakukan langkah berikut:

1. Baca `HANDOFF.md` di docs DAN `ONBOARDING.md`  di root project untuk konteks arsitektur lengkap.
2. Lihat tabel "Status Saat Ini" di atas untuk tahu posisi terakhir.
3. Lanjutkan dari issue yang tertulis di "Issue Selanjutnya".
4. Baca spec issue di `docs/issues/XXX-*.md`.
5. Referensi kode yang sudah production: `e:\superapp-inventory\`

---

### 🚨 ATURAN KERAS (WAJIB DIPATUHI)

#### A. Git Workflow — DILARANG SHORTCUT
Setiap issue WAJIB mengikuti flow ini **TANPA PENGECUALIAN**:
```bash
0. gh issue create --title "nama issue" --body "deskripsi" (Jika issue belum ada di GitHub)
1. git checkout -b issue/XXX-nama-issue
2. Kerjakan kode
3. Cek IDE warnings (lihat poin B)
4. Minta KONFIRMASI ke User sebelum lanjut ke langkah 5! (Kecuali untuk Issue Utama Phase 1-125)
5. git add . && git commit -m "feat(module): deskripsi (#XXX)"
6. git push -u origin issue/XXX-nama-issue
7. gh pr create --title "feat(module): deskripsi (#XXX)" --base main
8. gh pr merge <PR_NUMBER> --merge --delete-branch
9. git checkout main && git pull
```
> ❌ **DILARANG** mulai mengerjakan fitur/bug baru di luar flow utama (Phase 1-125) jika belum ada tiket isunya di GitHub!
> ❌ **DILARANG** melakukan `commit` atau membuat `Pull Request` untuk issue tambahan/bug tanpa konfirmasi dari User (misal: "Lanjutkan", "Oke")!
> ❌ **DILARANG** commit langsung ke `main` tanpa PR!
> ❌ **DILARANG** skip membuat GitHub Issue untuk issue yang dikerjakan!

#### B. IDE Warning Check — SEBELUM SETIAP PUSH
Jalankan command berikut **DAN pastikan hasilnya 0 error/warning**:
```bash
# Frontend
cd frontend && npm run lint && npm run build

# Backend  
cd backend && php -l app/Modules/**/*.php
```
Juga periksa **pesan IDE yang di-attach user** (format `@[file:current_problems]`).
Jika ada warning, **PERBAIKI DULU** sebelum push. Jangan abaikan!

#### C. End-of-Phase Checklist (MANDATORY)
Setiap Phase selesai, **WAJIB** jalankan semua langkah ini:

- [ ] **IDE Check**: 0 error/warning di ESLint, TypeScript, PHP
- [ ] **UI Comparison**: Bandingkan UI dengan `e:\superapp-inventory\`. Jika *basic*, buat Issue "Phase X UI Overhaul"
- [ ] **GitHub Issues**: Semua issue sudah CLOSED (jalankan `gh issue list --state open`)
- [ ] **GitHub PRs**: Semua issue punya PR yang sudah MERGED (jalankan `gh pr list --state all`)
- [ ] **Update HANDOFF.md**: Timestamp, status, issue selanjutnya
- [ ] **Update ONBOARDING.md**: Ubah status Phase dari `📋 Spec` → `✅ Done`
- [ ] **Push dokumentasi**: Commit & push perubahan docs

> ⚠️ **JIKA ADA SATU SAJA LANGKAH YANG TERLEWAT, PHASE BELUM DIANGGAP SELESAI!**

#### D. Sebelum Sesi Berakhir
**WAJIB** update file `HANDOFF.md` ini dengan status terakhir!

---
**STATUS TERAKHIR (2026-05-07):**
- **Rollback dilakukan**: Seluruh skrip navigasi eksperimental (BFCache watchdog & Hard Navigation) dihapus.
- **Kondisi**: Kembali ke "Phase 3 UI Overhaul" yang stabil secara tampilan.
- **Fokus Selanjutnya**: Mencari solusi navigasi yang lebih "Next.js Native" tanpa merusak performa.

**UPDATE SESI (2026-05-07):**
- Investigasi BFCache Zombie state pada alur `/kepegawaian` -> `/bmn` -> browser Back.
- Fix diterapkan di frontend: auth snapshot memakai `useSyncExternalStore`, dashboard layout kembali membaca user dari cookie server-side, provider React Query melakukan invalidate query aktif saat `pageshow persisted`/`popstate`, dan dropdown module switcher ditutup saat restore.
- Validasi frontend: `npm run lint` dan `npm run build` berhasil.

**UPDATE LANJUTAN (2026-05-07):**
- Route `/bmn` ditambahkan sebagai dashboard placeholder agar perpindahan modul tidak jatuh ke 404 sebelum Phase BMN dikerjakan.
- Root provider sekarang meremount client subtree saat browser Back/Forward restore, sekaligus refetch active React Query dan reset `pointer-events` body.
- Skenario terverifikasi via browser automation: login -> `/kepegawaian` -> module switcher `/bmn` -> browser Back; data pegawai tetap tampil, user tetap `Administrator Pusat BKSDA / super_admin`, dan tombol sidebar `Keluar Sistem` membuka modal konfirmasi.

**SESI FASE 4 - #035 (2026-05-07):**
- Issue GitHub: `#66` (feat-surat-tugas-assignment-letters-database-migrations), PR `#67` merged.
- 2 file migrasi dibuat di `backend/app/Modules/SuratTugas/Migrations/`: tabel induk `st_assignment_letters` dan tabel pivot `st_assignment_letter_employees`.
- Validasi wajib dijalankan: `npm run lint` ✅, `npm run build` ✅, `php -l` kedua migrasi ✅.
- Working tree lokal terdeteksi corrupt (puluhan file Phase 1-3 hilang dari disk tapi tercatat di git HEAD) — penyebab: kemungkinan AI sebelumnya mengerjakan di branch berbeda tanpa merge.
- Perbaikan: `git restore .` berhasil memulihkan semua file Phase 1-3 tanpa mengubah file migrasi Phase 4.
- File `frontend/src/proxy.ts.bak` dihapus dari untracked (sesuai pilihan user di awal sesi).
- HANDOFF.md diupdate dengan progress Phase 4.
- Catatan dev: Pastikan sebelum setiap sesi, cek `git status` untuk memastikan working tree bersih.

**FINAL SESI #064 (2026-05-07):**
- GitHub Issue: `#64 fix(frontend): stabilize dashboard back navigation restore`.
- Branch kerja: `issue/064-dashboard-back-navigation-restore`.
- Tujuan: menyelesaikan bug "BFCache Zombie state" saat user berada di `/kepegawaian`, pindah ke `/bmn`, lalu klik browser Back.
- Gejala awal: data pegawai tidak load setelah Back, Topbar sempat fallback ke `Admin SuperApp / Administrator`, dan tombol sidebar `Keluar Sistem` tidak bisa diklik.
- Root cause yang ditemukan: auth state client tidak punya snapshot stabil saat history restore, React Query tidak refetch active query setelah BFCache/popstate, dropdown/overlay module switcher dapat tersisa di atas UI, dan `/bmn` belum punya route sehingga perpindahan modul jatuh ke 404.
- Fix auth: `frontend/src/lib/auth-store.ts` sekarang menyediakan snapshot token+user dari localStorage/cookie, subscribe ke `auth-change`, `storage`, `pageshow`, dan `popstate`; `frontend/src/hooks/useAuth.ts` memakai `useSyncExternalStore`.
- Fix dashboard restore: `frontend/src/components/providers.tsx` menjadi provider aktif root; saat `pageshow persisted` atau `popstate`, provider reset `document.body.style.pointerEvents`, dispatch `auth-change`, invalidate/refetch active React Query, dan remount subtree via `restoreKey`.
- Fix dashboard layout: `frontend/src/app/(dashboard)/layout.tsx` kembali membaca `bksda_user` dari cookie server-side dan mengirim `serverUser` ke Topbar agar tidak flash fallback saat restore.
- Fix Topbar: `frontend/src/components/layout/topbar.tsx` dikembalikan ke pola Phase 2/3, yaitu `ThemeToggle` + profil user; ikon search/notif/help/settings dan logout dobel di kanan user dihapus. Logout tetap hanya di sidebar.
- Fix module switcher/sidebar: `frontend/src/components/module-switcher.tsx` menutup overlay saat `pageshow`/`popstate`; `frontend/src/components/layout/sidebar.tsx` memakai Next `Link` dan menutup drawer mobile saat klik menu.
- Fix API lokal: `frontend/src/lib/api.ts` default base URL lokal ke `http://127.0.0.1:8000/api`, memakai `authStore.logout()` saat 401 non-login, dan tidak lagi memakai `console.error` yang memicu Next dev overlay untuk network/API failure biasa.
- Fix route BMN: `frontend/src/app/(dashboard)/bmn/page.tsx` ditambahkan sebagai placeholder dashboard supaya `/bmn` bukan 404 sebelum Phase BMN resmi dikerjakan.
- File penting yang ikut tersentuh dari sesi navigasi/auth sebelumnya dan dipertahankan: `frontend/src/app/layout.tsx`, `frontend/src/proxy.ts`, `frontend/src/components/logout-button.tsx`, `frontend/src/components/theme-toggle.tsx`, `frontend/src/app/(dashboard)/kepegawaian/page.tsx`, `frontend/src/app/(dashboard)/page.tsx`, `frontend/next.config.ts`.
- File yang sengaja tidak ikut commit: `frontend/src/proxy.ts.bak` karena hanya backup lokal tidak terpakai.
- Validasi wajib yang sudah dijalankan: `npm run lint` di `frontend` berhasil, `npm run build` di `frontend` berhasil, dan `php -l` untuk semua file `backend/app/Modules/**/*.php` berhasil.
- Validasi browser yang sudah dijalankan: login dengan akun seeder, buka `/kepegawaian`, buka module switcher ke `/bmn`, klik browser Back, data pegawai tetap tampil, user tetap `Administrator Pusat BKSDA / super_admin`, tombol sidebar `Keluar Sistem` membuka modal konfirmasi.
- Jika AI baru melanjutkan setelah percakapan ini ditutup: mulai dari `git checkout main && git pull`, baca `HANDOFF.md` dan `ONBOARDING.md`, pastikan issue #64 dan PR terkait sudah closed/merged, lalu lanjut ke Phase 4 Surat Tugas (`docs/issues/035-*.md` sampai `045-*.md`).
- Catatan lokal dev: frontend memakai `http://localhost:3000`, backend Laravel lokal perlu hidup di `http://127.0.0.1:8000`, dan database lokal `.env` backend mengarah ke PostgreSQL `127.0.0.1:5435`.
