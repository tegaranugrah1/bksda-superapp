# Issue #002 — Init Monorepo Structure

> **Type**: `chore`
> **Labels**: `setup`, `foundation`
> **Priority**: 🔴 Critical (semua issue lain bergantung pada ini)
> **Complexity**: 🟢 Simple (buat folder + file config, tidak ada logic)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama — cukup model murah
> **Dependencies**: Issue #001 harus sudah selesai & merged

---

## Branch

```
issue/002-init-monorepo-structure
```

## Deskripsi

Buat struktur folder monorepo `bksda-superapp` lengkap. Issue ini **hanya** membuat:
- Folder-folder kosong (dengan `.gitkeep` agar Git track)
- `docker-compose.yml` — **hanya PostgreSQL** (sesuai aturan Rule 10.2)
- Placeholder folder untuk backend & frontend (isi project-nya di issue #003 dan #005)

> ⚠️ Issue ini **TIDAK** install Laravel atau Next.js. Hanya buat struktur folder + docker compose.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak install Laravel (itu Issue #003)
- ❌ Tidak install Next.js (itu Issue #005)
- ❌ Tidak tambah PHP, Nginx, atau Redis di Docker (Rule 10.2)

---

## Apa yang Sudah Ada (dari Issue #001)

```
e:\bksda-superapp\
├── .editorconfig       ← sudah ada
├── .gitignore          ← sudah ada
├── README.md           ← sudah ada
├── RULES.md            ← sudah ada
└── docs/
    ├── issues/         ← sudah ada
    │   ├── 001-project-rules-coding-standards.md
    │   └── 002-init-monorepo-structure.md
    └── HANDOFF.md      ← sudah ada
```

## Files & Folders yang Harus Dibuat

```
e:\bksda-superapp\
├── docker-compose.yml                     ← NEW (PostgreSQL only)
├── backend/                               ← NEW (folder kosong, isi di issue #003)
│   └── .gitkeep                           ← NEW
├── frontend/                              ← NEW (folder kosong, isi di issue #005)
│   └── .gitkeep                           ← NEW
└── docker/                                ← NEW
    └── .gitkeep                           ← NEW
```

Total: **4 file baru** + **3 folder baru**

---

## Acceptance Criteria

- [ ] Folder `backend/` ada dengan `.gitkeep`
- [ ] Folder `frontend/` ada dengan `.gitkeep`
- [ ] Folder `docker/` ada dengan `.gitkeep`
- [ ] File `docker-compose.yml` ada di root
- [ ] `docker compose up -d` berhasil start PostgreSQL container
- [ ] Bisa connect ke database: `localhost:5432`, db=`bksda_superapp`, user=`postgres`, password=`postgres`
- [ ] `docker compose down` berhasil stop container
- [ ] GitHub issue dibuat, PR dibuat, merged via squash

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Jangan skip.

### Langkah 1: Buat Folder-Folder

**Kenapa?** Monorepo butuh struktur folder yang jelas. Setiap folder punya tanggung jawab sendiri:
- `backend/` → kode Laravel API
- `frontend/` → kode Next.js website
- `docker/` → konfigurasi Docker (untuk deployment VPS nanti)

```powershell
cd e:\bksda-superapp

# Buat folder
New-Item -ItemType Directory -Path "backend" -Force
New-Item -ItemType Directory -Path "frontend" -Force
New-Item -ItemType Directory -Path "docker" -Force
```

**Apa yang terjadi:**
- 3 folder baru dibuat di root project
- `-Force` artinya: kalau folder sudah ada, tidak error

---

### Langkah 2: Buat `.gitkeep` di Setiap Folder

**Kenapa?** Git tidak bisa track folder kosong. File `.gitkeep` adalah konvensi agar folder kosong tetap masuk Git. File ini isinya kosong (0 byte), hanya sebagai placeholder.

```powershell
# Buat file .gitkeep kosong di setiap folder
New-Item -ItemType File -Path "backend\.gitkeep" -Force
New-Item -ItemType File -Path "frontend\.gitkeep" -Force
New-Item -ItemType File -Path "docker\.gitkeep" -Force
```

**Apa yang terjadi:**
- 3 file kosong dibuat
- Sekarang Git bisa track ketiga folder ini
- File ini akan dihapus saat folder diisi (Issue #003 dan #005)

---

### Langkah 3: Buat `docker-compose.yml`

**Kenapa?** Kita butuh PostgreSQL untuk development. Daripada install PostgreSQL langsung di komputer (ribet uninstall, versi konflik), kita pakai Docker container — lebih bersih dan bisa dihapus kapan saja.

**Path**: `e:\bksda-superapp\docker-compose.yml`

**Buat file baru** dengan isi:

```yaml
# =============================================================================
# BKSDA SuperApp — Docker Compose (Local Development)
# =============================================================================
# Hanya PostgreSQL untuk development lokal.
# Backend: jalankan dengan `php artisan serve` (BUKAN Docker)
# Frontend: jalankan dengan `npm run dev` (BUKAN Docker)
# =============================================================================

services:
  db:
    image: postgres:15-alpine
    container_name: bksda-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: bksda_superapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db-data:
    driver: local
```

### Penjelasan Setiap Baris

| Baris | Artinya | Kenapa |
|-------|---------|--------|
| `image: postgres:15-alpine` | Download PostgreSQL versi 15 edisi ringan (Alpine Linux) | Alpine lebih kecil (~80MB vs ~400MB full). Versi 15 = sama dengan Supabase production |
| `container_name: bksda-db` | Nama container Docker | Supaya gampang diingat saat `docker ps` atau `docker exec` |
| `restart: unless-stopped` | Otomatis restart kalau crash | Container tetap jalan bahkan setelah restart komputer |
| `POSTGRES_DB: bksda_superapp` | Nama database yang otomatis dibuat | Nama database untuk project ini |
| `POSTGRES_USER: postgres` | Username database | Default PostgreSQL |
| `POSTGRES_PASSWORD: postgres` | Password database | **Hanya untuk local dev!** Production di Supabase pakai password berbeda |
| `127.0.0.1:5432:5432` | Map port 5432 container ke port 5432 komputer | `127.0.0.1` = hanya bisa diakses dari komputer sendiri (keamanan) |
| `db-data:/var/lib/...` | Simpan data di Docker volume | Data tidak hilang saat container di-restart atau di-stop |
| `healthcheck` | Docker cek berkala apakah PostgreSQL siap | Supaya bisa tahu status container via `docker ps` (healthy/unhealthy) |

---

### Langkah 4: Test Docker Compose

**Kenapa test?** Untuk memastikan Docker dan PostgreSQL berfungsi sebelum lanjut ke issue berikutnya.

#### Test 1: Start Container

```bash
cd e:\bksda-superapp
docker compose up -d
```

**Apa yang terjadi:**
- Docker download image `postgres:15-alpine` (pertama kali saja, ~80MB)
- Container `bksda-db` dibuat dan dijalankan
- Database `bksda_superapp` otomatis dibuat

**Output yang diharapkan:**
```
[+] Running 2/2
 ✔ Network bksda-superapp_default  Created
 ✔ Container bksda-db              Started
```

#### Test 2: Cek Container Running

```bash
docker ps --filter name=bksda-db
```

**Output yang diharapkan:**
```
CONTAINER ID   IMAGE                COMMAND                  STATUS          PORTS
xxxxxxxxxxxx   postgres:15-alpine   "docker-entrypoint.s…"   Up X seconds    127.0.0.1:5432->5432/tcp
```

**Kalau tidak muncul:** Container gagal start. Cek log: `docker logs bksda-db`

#### Test 3: Cek Database Bisa Connect

```bash
docker exec -it bksda-db psql -U postgres -d bksda_superapp -c "SELECT 1 AS test;"
```

**Penjelasan command:**
- `docker exec -it bksda-db` → masuk ke dalam container
- `psql -U postgres` → jalankan PostgreSQL client sebagai user `postgres`
- `-d bksda_superapp` → connect ke database `bksda_superapp`
- `-c "SELECT 1"` → jalankan query test

**Output yang diharapkan:**
```
 test
------
    1
(1 row)
```

#### Test 4: Stop Container

```bash
docker compose down
```

**Output yang diharapkan:**
```
[+] Running 2/2
 ✔ Container bksda-db              Removed
 ✔ Network bksda-superapp_default  Removed
```

> 💡 `docker compose down` hanya stop & hapus container, **data tetap aman** di volume `db-data`.
> Kalau mau hapus data juga: `docker compose down -v` (flag `-v` = hapus volume).

---

## Troubleshooting

### Q: `docker compose up -d` error "Cannot connect to Docker daemon"

**Artinya:** Docker Desktop belum jalan.

**Solusi:**
1. Buka Docker Desktop
2. Tunggu sampai status "Docker Desktop is running" (icon hijau di system tray)
3. Coba lagi: `docker compose up -d`

### Q: `docker compose up -d` error "port is already allocated"

**Artinya:** Port 5432 sudah dipakai program lain (mungkin PostgreSQL lokal yang sudah di-install sebelumnya).

**Solusi 1:** Stop program yang pakai port 5432
```bash
# Cek siapa yang pakai port 5432
netstat -ano | findstr :5432

# Kill proses tersebut (ganti PID)
taskkill /PID <PID> /F
```

**Solusi 2:** Ganti port di `docker-compose.yml`
```yaml
    ports:
      - "127.0.0.1:5433:5432"   # ganti 5432 jadi 5433
```
Lalu update `.env` nanti di Issue #004: `DB_PORT=5433`

### Q: `docker exec` error "No such container"

**Artinya:** Container belum jalan.

**Solusi:**
```bash
docker compose up -d    # start dulu
docker ps               # pastikan ada container bksda-db
```

### Q: Download image lambat / timeout

**Solusi:** Pastikan internet stabil. Image `postgres:15-alpine` hanya ~80MB.

---

## Verifikasi Folder Structure

Setelah semua selesai, jalankan:

```powershell
# Windows PowerShell
Get-ChildItem -Recurse -Name -Exclude ".git","node_modules","docs" | Sort-Object
```

**Output yang diharapkan (kurang lebih):**
```
.editorconfig
.gitignore
README.md
RULES.md
backend\.gitignore
backend\.gitkeep
docker\.gitkeep
docker-compose.yml
frontend\.gitignore
frontend\.gitkeep
```

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: init monorepo structure" \
  --body "Buat struktur folder monorepo (backend/, frontend/, docker/) dan docker-compose.yml (PostgreSQL only). Detail di docs/issues/002-init-monorepo-structure.md" \
  --label "setup,foundation"
```

> ⚠️ Catat nomor issue yang muncul (misal `#2`).

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/002-init-monorepo-structure
```

### Step 3: Buat Semua File

Ikuti Langkah 1-3 di atas:
1. Buat folder `backend/`, `frontend/`, `docker/`
2. Buat `.gitkeep` di setiap folder
3. Buat `docker-compose.yml`

### Step 4: Verifikasi

```bash
docker compose up -d
Start-Sleep -Seconds 5
docker exec -it bksda-db psql -U postgres -d bksda_superapp -c "SELECT 1 AS test;"
docker compose down
```

### Step 5: Commit & Push

```bash
git add docker-compose.yml
git add backend/.gitkeep frontend/.gitkeep docker/.gitkeep

git commit -m "chore: init monorepo structure (#2)"
git push -u origin issue/002-init-monorepo-structure
```

### Step 6: Buat Pull Request

```bash
gh pr create \
  --title "chore: init monorepo structure (#2)" \
  --body "## Summary
Buat struktur folder monorepo dan setup Docker Compose untuk PostgreSQL local development.

## Changes
- \`docker-compose.yml\` — PostgreSQL 15 Alpine (hanya database, sesuai Rule 10.2)
- \`backend/.gitkeep\` — Placeholder folder backend
- \`frontend/.gitkeep\` — Placeholder folder frontend
- \`docker/.gitkeep\` — Placeholder folder docker configs

## Verification
- [x] \`docker compose up -d\` berhasil start PostgreSQL
- [x] Bisa connect ke database \`bksda_superapp\`
- [x] \`docker compose down\` berhasil stop

Closes #2" \
  --base main
```

### Step 7: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Tech Stack: PostgreSQL 15, Docker
Workspace: e:\bksda-superapp\
Issue #001 sudah selesai — file .editorconfig, .gitignore, README.md, RULES.md,
docs/HANDOFF.md sudah ada.

## Task

Buat struktur folder monorepo dan Docker Compose. Ikuti langkah PERSIS di
`docs/issues/002-init-monorepo-structure.md`.

### Files to Create
1. `docker-compose.yml` — di root (PostgreSQL 15 Alpine ONLY, tanpa PHP/Nginx/Redis)
2. `backend/.gitkeep` — file kosong
3. `frontend/.gitkeep` — file kosong
4. `docker/.gitkeep` — file kosong

### Folders to Create
1. `backend/`
2. `frontend/`
3. `docker/`

### Verification (WAJIB jalankan)
```bash
docker compose up -d
Start-Sleep -Seconds 5
docker exec -it bksda-db psql -U postgres -d bksda_superapp -c "SELECT 1 AS test;"
docker compose down
```

### Git Workflow (WAJIB ikuti urutan ini)
```bash
cd e:\bksda-superapp
gh issue create --title "chore: init monorepo structure" --body "Detail di docs/issues/002-init-monorepo-structure.md" --label "setup,foundation"
git checkout main && git pull origin main
git checkout -b issue/002-init-monorepo-structure
# ... buat semua file & folder ...
git add .
git commit -m "chore: init monorepo structure (#2)"
git push -u origin issue/002-init-monorepo-structure
gh pr create --title "chore: init monorepo structure (#2)" --body "Closes #2" --base main
gh pr merge --squash --delete-branch
git checkout main && git pull origin main
```

### Rules
- Docker compose HANYA PostgreSQL — DILARANG tambah PHP/Nginx/Redis
- Backend dan Frontend jalan lokal (Rule 10.1 & 10.2)
- Setelah selesai, update docs/HANDOFF.md status menjadi ✅ DONE
- WAJIB buat GitHub issue SEBELUM mulai kerja
- WAJIB buat PR, jangan langsung merge ke main

### HANDOFF
Sebelum selesai/berhenti, WAJIB update `docs/HANDOFF.md` dengan progress terkini.
````
