# Progress - Phase 10: Route Restructure & Portal Dashboard

> Document created: 2026-05-09
> Last updated: 2026-05-09 21:00

---

## Summary

Phase 10 focuses on restructuring routes and creating a standalone Portal Dashboard, aligning bksda-superapp with superapp-inventory patterns.

**Today's Updates:**
- Added ThemeToggle (dark/light mode) to all module layouts
- Added User Profile info (avatar, name, role badge) in sidebar footer
- Refactored layout: ThemeToggle in header, User profile above logout button

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
