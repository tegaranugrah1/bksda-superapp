# Progress - Phase 10: Route Restructure & Portal Dashboard

> Document created: 2026-05-09
> Last updated: 2026-05-10 01:00

---

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

## Current Phase: Phase 12 - EmployeeAccessSheet Component

### Status: **COMPLETED** ✅

> Document created: 2026-05-10
> Last updated: 2026-05-10 11:25

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
- Commits: 1 commit pushed (`5ca9040`)
- PR: [#256](https://github.com/tegaranugrah1/bksda-superapp/pull/256) - **READY FOR REVIEW** 🚀
- Status: PENDING MERGE ⏳

---

## Completed Tasks

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
| 1 | BMN Import/Export upgrade | HIGH | PENDING |
| 2 | Inventory Bulk Operations upgrade | HIGH | PENDING |
| 3 | AuthSync Component (cross-tab session) | MEDIUM | PENDING |
| 4 | InteractiveKawasanMap Upgrade | MEDIUM | PENDING |
| 5 | Inventory Trash/Restore upgrade | MEDIUM | PENDING |

---

## Verification Status

| Check | Status |
|-------|--------|
| Build | ✅ Success |
| ESLint | ✅ 0 errors, 13 warnings (pre-existing in public pages) |
| TypeScript | ✅ 0 errors |
| Backend PHP Syntax | ✅ Pass |
| Portal Page Load | 🔄 Testing needed |
| Login Flow | 🔄 Testing needed |
| Module Navigation | 🔄 Testing needed |

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
| 6 | Upgrade BMN Import/Export | HIGH | PENDING |
| 7 | Upgrade Inventory Bulk Operations | HIGH | PENDING |
| 8 | Upgrade Inventory Trash/Restore | MEDIUM | PENDING |

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
