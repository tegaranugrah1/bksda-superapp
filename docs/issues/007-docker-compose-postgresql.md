# Issue #007 — Docker Compose — PostgreSQL & Database GUI

> **Type**: `setup`
> **Labels**: `database`, `docker`, `foundation`
> **Priority**: 🔴 Critical (database wajib berjalan stabil untuk development)
> **Complexity**: 🟢 Simple (Hanya docker-compose setup)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #002 (Init Monorepo)

---

## Branch

```
issue/007-docker-compose-postgresql
```

## Deskripsi

Pada Issue #002, kita telah membuat file `docker-compose.yml` sederhana. Pada Issue ini, kita akan melengkapinya agar benar-benar siap (Production-like lokal). 

**Apa yang dilakukan:**
1. Mengupdate `docker-compose.yml` agar menggunakan **PostgreSQL 15** yang stabil.
2. Menambahkan servis **pgAdmin** ke dalam `docker-compose.yml`. Ini sangat membantu developer (terutama junior) untuk melihat isi database langsung lewat browser, tanpa perlu menginstall DBeaver atau software GUI lain di komputer.
3. Setup `volumes` agar data tidak hilang (persistent) dan pgAdmin bisa menyimpan konfigurasi.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak menginstall container PHP, Nginx, atau Redis (sesuai *Rule 10.2: Local dev backend dan frontend menggunakan server lokal masing-masing*).

---

## Apa yang Sudah Ada

```
e:\bksda-superapp\
├── docker-compose.yml     ← File basic dari Issue 002 (akan diupdate)
└── docker/
    └── .gitkeep           ← Disiapkan untuk konfigurasi masa depan
```

---

## Acceptance Criteria

- [ ] File `docker-compose.yml` terupdate dan memuat *services* `db` (Postgres) dan `pgadmin`.
- [ ] Container database berjalan di port `5432` dengan password `postgres`.
- [ ] Container pgAdmin berjalan di port `5050` (bisa diakses di `http://localhost:5050`).
- [ ] Data PostgreSQL persisten (menggunakan named volumes `db-data`).
- [ ] Data pgAdmin persisten (menggunakan named volumes `pgadmin-data`).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Copas (copy-paste) kode secara teliti.

### Langkah 1: Update `docker-compose.yml`

**Kenapa?** Kita butuh GUI (Graphical User Interface) database agar mudah melakukan *debugging* (melihat isi tabel, menjalankan raw query) tanpa harus mengetik command di terminal. PgAdmin dijalankan lewat Docker agar tidak mengotori *local machine*.

**Path:** `e:\bksda-superapp\docker-compose.yml`

**Ganti SELURUH isi file menjadi:**

```yaml
# =============================================================================
# BKSDA SuperApp — Docker Compose (Local Development)
# =============================================================================
# Hanya PostgreSQL dan pgAdmin untuk development lokal (Sesuai Rule 10.2).
# Backend: php artisan serve
# Frontend: npm run dev
# =============================================================================

version: '3.8'

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

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bksda-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@bksda.local
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "5050:80"
    volumes:
      - pgadmin-data:/var/lib/pgadmin
    depends_on:
      db:
        condition: service_healthy

volumes:
  db-data:
    driver: local
  pgadmin-data:
    driver: local
```

**Penjelasan Perubahan:**
- **`pgadmin` service ditambahkan**: Image ini menyediakan UI web.
- **`PGADMIN_DEFAULT_EMAIL` / `PASSWORD`**: Digunakan untuk login ke halaman pgAdmin nantinya (email: `admin@bksda.local`, password: `admin`).
- **`depends_on`**: Memastikan pgAdmin hanya dijalankan *setelah* database `db` berstatus siap (healthy).

---

### Langkah 2: Start Services & Verifikasi

**Kenapa?** Memastikan container dapat didownload dan berjalan lancar di komputer developer.

```bash
cd e:\bksda-superapp

# Jalankan Docker di background (-d)
docker compose up -d
```

**Apa yang terjadi:**
- Docker akan menarik (pull) image `postgres` (jika belum ada) dan `pgadmin4`.
- Dua container akan hidup: `bksda-db` dan `bksda-pgadmin`.

**Verifikasi Command Line:**
```bash
docker ps
```
Cek apakah ada *dua* container yang statusnya `Up`.

---

### Langkah 3: Setup pgAdmin (Koneksikan ke DB)

**Kenapa?** pgAdmin memang sudah nyala, tapi dia belum otomatis tahu di mana letak database `bksda_superapp`. Kita harus mengoneksikannya pertama kali.

1. Buka browser dan pergi ke **http://localhost:5050**
2. Login menggunakan:
   - Email: `admin@bksda.local`
   - Password: `admin`
3. Klik **Add New Server**
   - **Tab General** → Name: `BKSDA Local DB`
   - **Tab Connection**:
     - Host name/address: `db` (Karena dalam jaringan Docker yang sama, cukup ketik nama service `db`)
     - Port: `5432`
     - Maintenance database: `bksda_superapp`
     - Username: `postgres`
     - Password: `postgres`
     - Klik **Save password?** (centang)
4. Klik **Save**.
5. Kamu sekarang bisa melihat struktur database dari BKSDA Superapp di web browser!

---

## Troubleshooting

### Q: `docker compose up -d` error: `port 5050 is already allocated`

**Artinya:** Port 5050 di komputer kamu sudah dipakai aplikasi lain.
**Solusi:** Buka `docker-compose.yml`, pada bagian `pgadmin` ubah `ports: - "5050:80"` menjadi `"5051:80"`. Lalu akses browser lewat `http://localhost:5051`.

### Q: Di browser http://localhost:5050 terus berputar (loading) / tidak terbuka

**Artinya:** Container pgadmin belum sepenuhnya siap atau mati (crash).
**Solusi:** Jalankan `docker logs bksda-pgadmin`. Pastikan tidak ada pesan error fatal. Biasanya pgAdmin butuh 15-30 detik untuk *booting* saat pertama kali dijalankan.

### Q: Di dalam pgAdmin, muncul error `Unable to connect to server: connection failed: ...`

**Artinya:** pgAdmin tidak bisa mencapai PostgreSQL container.
**Solusi:** Pastikan pada Tab Connection, kolom **Host name/address** diisi dengan tulisan `db` (bukan `localhost` atau `127.0.0.1`), karena pgAdmin dan postgres berkomunikasi via internal Docker network.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: docker compose setup postgres and pgadmin" \
  --body "Setup Docker Compose final untuk PostgresSQL 15 dan PgAdmin GUI lokal. Detail di docs/issues/007-docker-compose-postgresql.md" \
  --label "setup,docker,database"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/007-docker-compose-postgresql
```

### Step 3: Kerjakan

Lakukan Langkah 1 (update file `docker-compose.yml`) dan verifikasi jalannya server.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add docker-compose.yml
git commit -m "chore: docker compose setup postgres and pgadmin (#7)"
git push -u origin issue/007-docker-compose-postgresql
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: docker compose setup postgres and pgadmin (#7)" \
  --body "## Summary
Menambahkan konfigurasi lengkap database untuk mempermudah development backend.

## Changes
- File \`docker-compose.yml\` ditambahkan service pgAdmin.
- Setup environment login pgadmin.
- Volume persistent terpasang untuk database dan pgadmin config.

## Verification
- [x] Docker compose berjalan sukses tanpa error.
- [x] Web GUI pgAdmin terbuka di \`localhost:5050\`.
- [x] Service database berstatus \`healthy\`.

## Rules Compliance
- [x] Rule 10.2: Docker eksklusif untuk layanan database (Postgres & GUI). Tidak ada PHP/Nginx.

Closes #7" \
  --base main
```

### Step 6: Merge & Sync

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
Workspace: e:\bksda-superapp\
Issue #006 selesai dikerjakan. Kita kembali ke fondasi Docker.

## Task

Kerjakan Issue #007 (Docker Compose — PostgreSQL & Database GUI).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/007-docker-compose-postgresql.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Update seluruh file `docker-compose.yml` sesuai script yang ada di dokumen (tambahkan pgadmin dan setup environmentnya).
3. Jalankan `docker compose up -d`.
4. Pastikan tidak ada yang *crash*.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
