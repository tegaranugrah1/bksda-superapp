# Technical Architecture & System Design: Hermes Agent BKSDA Kaltim

> **Status**: APPROVED  
> **Arsitektur Host**: Proxmox VE 7.4 (`192.168.100.11`)  
> **Node Target**: VM 108 (`192.168.100.205`), 16 GB RAM, 4 vCPU, 100 GB NVMe  
> **Dokumen Terkait**: [requirements.md](requirements.md) | [tasks.md](tasks.md)

---

## 1. Arsitektur Topologi Jaringan & Komponen

```mermaid
flowchart TB
    subgraph PVE ["Host Proxmox VE 7.4 (192.168.100.11)"]
        subgraph VM106 ["VM 106 Produksi (192.168.100.203)"]
            Dokploy["Dokploy Engine"]
            SuperApp["BKSDA SuperApp API\n(Laravel 11 + PHP 8.2)"]
            Postgres[("PostgreSQL 15 Database")]
            RustFS["RustFS S3 Object Storage"]
            Reverb["Laravel Reverb WebSocket"]

            Dokploy --- SuperApp
            SuperApp <--> Postgres
            SuperApp <--> RustFS
            SuperApp <--> Reverb
        end

        subgraph VM108 ["VM 108 Hermes Agent Sandbox (192.168.100.205)"]
            subgraph DockerCompose ["Docker Compose Stack (24/7 Service)"]
                EvoAPI["WhatsApp Gateway\n(Evolution API Container)"]
                RedisStore[("Redis Cache & Session")]
                AgentCore["Hermes Assistant Core\n(FastAPI / Node.js)"]
            end

            subgraph DevEnv ["Coding Agent Workspace (16 GB RAM)"]
                GeminiCLI["Gemini CLI Environment"]
                GitWorkspace["bksda-superapp Repo Sandbox"]
                TestStack["PHPUnit + Playwright Chromium"]
            end

            EvoAPI <--> RedisStore
            AgentCore <--> EvoAPI
            AgentCore <--> RedisStore
            GeminiCLI <--> GitWorkspace
            GitWorkspace <--> TestStack
        end
    end

    subgraph WAN ["Jaringan Publik & Eksternal"]
        MetaWA["Jaringan WhatsApp (Staf HP)"]
        GeminiAPI["Google Gemini AI Pro API"]
        GitHubRepo["GitHub: tegaranugrah1/bksda-superapp"]
    end

    MetaWA <-->|"Pesan WhatsApp & Media"| EvoAPI
    AgentCore <-->|"NLU & Intent Extraction"| GeminiAPI
    AgentCore <-->|"HTTPS Internal REST API\n(Bearer Sanctum + Whitelist IP)"| SuperApp
    SuperApp -->|"Webhook Trigger ST Baru"| AgentCore

    GeminiCLI <-->|"Coding Reasoning"| GeminiAPI
    GitWorkspace <-->|"Push Branch & PR"| GitHubRepo
```

---

## 2. Struktur Modul di VM 108

Di dalam VM 108 (`/opt/hermes/`), sistem dibagi menjadi dua area kerja yang terisolasi rapi:

```text
/opt/hermes/
├── docker-compose.yml          # Stack WhatsApp Gateway & Redis
├── .env                        # Konfigurasi token, API Key Gemini, SuperApp URL
├── assistant/                  # Service Asisten WhatsApp 24/7
│   ├── src/
│   │   ├── gateway/            # Komunikasi ke Evolution API (send/receive chat)
│   │   ├── nlu/                # Integrasi Gemini Pro untuk intent parser
│   │   ├── conversation/       # State machine percakapan (cuti, cek saldo, buat ST)
│   │   ├── superapp_client/    # REST API client ke BKSDA SuperApp
│   │   └── handlers/           # Webhook handler (notifikasi ST terbit dari SuperApp)
│   └── package.json
└── coding-sandbox/             # Workspace Autonomous Coding Agent
    ├── gemini-agent/           # Skrip otomatisasi Gemini CLI
    └── workspace/              # Direktori clone bksda-superapp
```

---

## 3. Desain Alur Percakapan (Sequence Diagrams)

### 3.1. Alur Pengajuan Cuti Mandiri via WhatsApp

```mermaid
sequenceDiagram
    autonumber
    actor Pegawai as Pegawai BKSDA (WhatsApp)
    participant Evo as Evolution API (WA Gateway)
    participant Agent as Hermes Core Engine
    participant Gem as Google Gemini AI Pro API
    participant App as BKSDA SuperApp API (VM 106)

    Pegawai->>Evo: "Halo Hermes, saya mau ajukan cuti 3 hari mulai 10 Nov karena urusan keluarga"
    Evo->>Agent: Webhook event: onMessageReceived
    Agent->>App: GET /api/agent/v1/auth/verify-phone?phone=+62813...
    App-->>Agent: 200 OK: { id: 78, nip: "19990707...", nama: "Tegar Anugrah", is_active: true }
    
    Agent->>Gem: Parsing teks percakapan ke payload JSON terstruktur
    Gem-->>Agent: JSON: { intent: "leave_request", start_date: "2026-11-10", end_date: "2026-11-12", type: "Cuti Tahunan", reason: "Urusan keluarga" }
    
    Agent->>App: GET /api/agent/v1/employees/19990707.../leaves
    App-->>Agent: 200 OK: { sisa_cuti_n0: 12, sisa_tersedia: 12, overlap: false }
    
    Agent->>Agent: Simpan status sesi ke Redis: AWAITING_CONFIRMATION
    Agent->>Evo: Kirim balasan kartu ringkasan & minta konfirmasi
    Evo->>Pegawai: "Halo Pak Tegar, rincian cuti Anda: Cuti Tahunan (3 hari, 10-12 Nov). Sisa saldo setelah disetujui: 9 hari. Balas 'YA' untuk konfirmasi."
    
    Pegawai->>Evo: "YA"
    Evo->>Agent: Webhook event: onMessageReceived (Text: "YA")
    Agent->>App: POST /api/agent/v1/leaves/request (dengan payload tervalidasi)
    App-->>Agent: 201 Created: { request_id: 105, status: "PENGAJUAN", nomor_tiket: "#CT-2026-092" }
    
    Agent->>Evo: Kirim notifikasi sukses
    Evo->>Pegawai: "✅ Permohonan cuti berhasil diajukan! Tiket #CT-2026-092 telah diteruskan ke Kasubbag TU."
```

---

### 3.2. Alur Siaran Notifikasi Surat Tugas Baru Terbit

```mermaid
sequenceDiagram
    autonumber
    actor Pimpinan as Kepala Balai / Kasubbag TU
    participant App as BKSDA SuperApp (VM 106)
    participant Agent as Hermes Core (VM 108)
    participant Evo as Evolution API
    actor Pegawai as Personil Bertugas (WhatsApp)

    Pimpinan->>App: Setujui & Terbitkan Surat Tugas (Status: DITERBITKAN)
    App->>Agent: POST /api/agent/v1/webhooks/st-published (Payload: no_st, personil, tanggal, link_pdf)
    Agent->>Agent: Format pesan ramah personalisasi per pegawai
    loop Setiap Personil Bertugas
        Agent->>Evo: POST /message/sendText (Tujuan: Phone Pegawai, Delay: 1.5s)
        Evo->>Pegawai: "📢 Surat Tugas Baru: Patroli Kawasan TN Kutai (15-18 Nov 2026). Peran: Koordinator. Unduh PDF resmi: https://bksdakaltim.net/st/..."
    end
```

---

## 4. Desain Spesifikasi API SuperApp (`/api/agent/v1/*`)

Di `backend/app/Modules/Agent/`, kita menambahkan router khusus agen yang diproteksi dengan:
1. `middleware('auth:sanctum')` dengan token bertipe `agent_token`.
2. `middleware('client_ip:192.168.100.205')` (hanya IP lokal VM 108 yang diizinkan).

### 4.1. Verifikasi Nomor Telepon Pegawai
- **Endpoint**: `POST /api/agent/v1/auth/verify-phone`
- **Request**:
  ```json
  { "phone": "+6281351458775" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "id": 78,
      "nip": "199907072025061006",
      "nama_lengkap": "TEGAR ANUGRAH, A.Md.Kom.",
      "jabatan": "PRANATA KOMPUTER TERAMPIL",
      "satuan_kerja": "Balai KSDA Kalimantan Timur",
      "role": "pegawai"
    }
  }
  ```

### 4.2. Pengajuan Cuti via Agen
- **Endpoint**: `POST /api/agent/v1/leaves/request`
- **Request**:
  ```json
  {
    "nip": "199907072025061006",
    "jenis_cuti": "Cuti Tahunan",
    "tanggal_mulai": "2026-11-10",
    "tanggal_selesai": "2026-11-12",
    "alasan_cuti": "Urusan keluarga di Balikpapan",
    "alamat_cuti": "Balikpapan",
    "telepon": "+6281351458775"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "message": "Pengajuan cuti berhasil dibuat melalui asisten WhatsApp.",
    "data": {
      "id": 105,
      "nomor_tiket": "CT-2026-105",
      "status": "PENGAJUAN",
      "jumlah_hari": 3
    }
  }
  ```

---

## 5. Desain Coding Agent Sandbox & Otomasi CI/CD

### 5.1. Spesifikasi Sandbox di VM 108
- **Direktori**: `/opt/hermes/coding-sandbox/workspace/bksda-superapp`
- **Kapasitas Eksekusi**:
  - Alokasi RAM: 13 GB didedikasikan untuk kompilasi dan testing.
  - Skrip pengawas: Membatasi proses compile agar tidak menyentuh swap (`NODE_OPTIONS="--max-old-space-size=6144"`).

### 5.2. Pipeline Otomatisasi Git Pull Request
Setiap kali Coding Agent diperintahkan menyelesaikan task, agen wajib mengeksekusi urutan pipeline berikut secara berantai:

```bash
# 1. Pastikan repo up to date dari origin
git checkout development
git pull origin development

# 2. Buat branch tugas baru
git checkout -b task/nama-tugas-baru

# 3. Coding Agent menerapkan perubahan file (via Gemini CLI & Gemini Pro)
# ... file editing ...

# 4. Mandatory Runnable Checks
cd backend && php artisan test
cd ../frontend && npm run build

# 5. Jika kedua tes hijau (exit code 0), lakukan push & PR
git add .
git commit -m "feat(module): implementasi task sesuai instruksi"
git push origin task/nama-tugas-baru
gh pr create --title "feat: implementasi task" --body "Rangkuman perubahan..." --base development
```

---

## 6. Konfigurasi Docker Compose di VM 108

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:v2.1.2
    container_name: hermes-wa-gateway
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://192.168.100.205:8080
      - DOCKER_ENV=true
      - LOG_LEVEL=ERROR,WARN,INFO
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/1
    volumes:
      - evo_instances:/evolution/instances
    networks:
      - hermes-net
    depends_on:
      - redis

  redis:
    image: redis:7.2-alpine
    container_name: hermes-redis
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - hermes-net

  hermes-assistant:
    build: ./assistant
    container_name: hermes-assistant-core
    restart: always
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SUPERAPP_API_URL=http://192.168.100.203
      - SUPERAPP_AGENT_TOKEN=${SUPERAPP_AGENT_TOKEN}
      - EVOLUTION_API_URL=http://evolution-api:8080
      - EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
    networks:
      - hermes-net
    depends_on:
      - evolution-api
      - redis

networks:
  hermes-net:
    driver: bridge

volumes:
  evo_instances:
  redis_data:
```
