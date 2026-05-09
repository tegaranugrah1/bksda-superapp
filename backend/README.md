# BKSDA SuperApp — Backend

> Laravel 11 API backend dengan arsitektur modular.
> Menggunakan Laravel Sanctum untuk autentikasi Bearer Token.

---

## Tech Stack

- **Framework**: Laravel 11.x
- **PHP**: 8.2+
- **Auth**: Laravel Sanctum (Bearer Token)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (S3-compatible)

---

## Modular Architecture

```
app/Modules/
├── CMS/                       # Website Content Management
│   ├── Controllers/
│   │   ├── Admin/            # CRUD admin (auth required)
│   │   └── Public/           # Read-only (no auth)
│   ├── Models/               # Category, Informasi, Kawasan, TSL, dll
│   ├── Resources/            # API Resources
│   ├── Routes/
│   │   ├── admin.php         # Admin routes (auth:sanctum + module.access:cms)
│   │   └── public.php        # Public routes (no auth)
│   └── Services/
│
├── Kepegawaian/              # Employee Management
│   ├── Controllers/
│   ├── Models/               # Employee
│   └── Routes/
│
├── SuratTugas/               # Assignment Letters
│   ├── Controllers/
│   ├── Models/               # AssignmentLetter
│   └── Routes/
│
├── BMN/                      # Barang Milik Negara
│   ├── Controllers/           # Asset, Loan, Maintenance
│   ├── Models/               # Asset, AssetLoan, AssetUpdate
│   ├── Services/             # Business logic
│   └── Routes/
│
├── Inventory/                # Inventory & Stock
│   ├── Controllers/
│   ├── Models/               # Item, Category, Warehouse, StockTransaction
│   ├── Services/             # InventoryService
│   └── Routes/
│
└── DeReporting/              # Reporting
    ├── Controllers/
    ├── Models/               # Tahun, Anggaran, Koordinator, JenisData, dll
    ├── Database/Seeders/     # Master data seeders
    └── Routes/
```

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | ❌ | Login with NIP + password → Bearer token |
| POST | `/api/logout` | ✅ | Logout → revoke token |
| GET | `/api/me` | ✅ | Get current user info |

### CMS — Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cms/public/home` | Homepage data |
| GET | `/api/cms/public/navbar` | Navigation menu |
| GET | `/api/cms/public/informasi` | News list |
| GET | `/api/cms/public/informasi/{slug}` | News detail |
| GET | `/api/cms/public/kawasan` | Conservation areas |
| GET | `/api/cms/public/kawasan/{slug}` | Area detail |
| GET | `/api/cms/public/tsl` | TSL list (satwa/tumbuhan) |
| GET | `/api/cms/public/tsl/{slug}` | TSL detail |
| GET | `/api/cms/public/buku` | Digital books |
| GET | `/api/cms/public/leaflet` | Leaflets |
| GET | `/api/cms/public/poster` | Posters |
| GET | `/api/cms/public/regulasi` | Regulations |
| GET | `/api/cms/public/photo` | Photo gallery |
| GET | `/api/cms/public/video` | Video gallery |
| GET | `/api/cms/public/profil` | Profile pages |
| GET | `/api/cms/public/kepala` | Kepala (head) info |

### CMS — Admin (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cms/admin/{resource}` | List (paginated) |
| POST | `/api/cms/admin/{resource}` | Create |
| GET | `/api/cms/admin/{resource}/{id}` | Detail |
| PUT | `/api/cms/admin/{resource}/{id}` | Update |
| DELETE | `/api/cms/admin/{resource}/{id}` | Delete |
| PATCH | `/api/cms/admin/informasi/{id}/toggle-publish` | Toggle publish |

**Resources:** `category`, `informasi`, `profil`, `tsl`, `kawasan`, `website`, `kepala`, `photo`, `video`, `pesan`, `link`, `jenis`, `buku`, `leaflet`, `poster`, `regulasi`, `menu`

### Kepegawaian

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/kepegawaian/employees` | ✅ | List employees |
| POST | `/api/kepegawaian/employees` | ✅+role | Create employee |
| GET | `/api/kepegawaian/employees/{id}` | ✅ | Employee detail |
| PUT | `/api/kepegawaian/employees/{id}` | ✅+role | Update employee |
| DELETE | `/api/kepegawaian/employees/{id}` | ✅+role | Soft delete |
| GET | `/api/kepegawaian/employees/select` | ✅ | Select dropdown data |

### Surat Tugas

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/surat-tugas` | ✅ | List assignment letters |
| POST | `/api/surat-tugas` | ✅ | Create letter |
| GET | `/api/surat-tugas/{id}` | ✅ | Letter detail |
| PUT | `/api/surat-tugas/{id}/approve` | ✅+role | Approve letter |
| PUT | `/api/surat-tugas/{id}/reject` | ✅+role | Reject letter |
| DELETE | `/api/surat-tugas/{id}` | ✅+role | Archive letter |
| POST | `/api/surat-tugas/{id}/restore` | ✅+role | Restore letter |
| GET | `/api/public/surat-tugas/{id}/verify` | ❌ | QR code verification |

### BMN

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bmn/ping` | ✅ | Health check |
| GET | `/api/bmn/assets` | ✅ | List assets |
| POST | `/api/bmn/assets` | ✅ | Create asset |
| GET | `/api/bmn/assets/{id}` | ✅ | Asset detail |
| PUT | `/api/bmn/assets/{id}` | ✅ | Update asset |
| DELETE | `/api/bmn/assets/{id}/dispose` | ✅ | Soft delete (disposal) |
| GET | `/api/bmn/assets/export` | ✅ | Export Excel |
| GET | `/api/bmn/loans` | ✅ | Loan history |
| POST | `/api/bmn/assets/{id}/loans` | ✅ | Borrow asset |
| POST | `/api/bmn/loans/{id}/return` | ✅ | Return asset |
| GET | `/api/bmn/maintenances` | ✅ | Maintenance history |
| POST | `/api/bmn/assets/{id}/maintenances` | ✅ | Record maintenance |

### Inventory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory/ping` | ✅ | Health check |
| GET | `/api/inventory/dashboard/stats` | ✅ | Dashboard stats |
| GET | `/api/inventory/offices` | ✅ | List offices |
| POST | `/api/inventory/offices` | ✅+role | Create office |
| GET | `/api/inventory/items` | ✅ | List items |
| POST | `/api/inventory/items` | ✅+role | Create item |
| GET | `/api/inventory/transactions` | ✅ | Transaction history |
| POST | `/api/inventory/stock/in` | ✅+role | Stock in |
| POST | `/api/inventory/stock/out` | ✅+role | Stock out |

### DeReporting

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dereporting/ping` | ✅ | Health check |
| GET | `/api/dereporting/operators` | ✅ | List operators |
| POST | `/api/dereporting/operators` | ✅ | Create operator |
| PUT | `/api/dereporting/operators/{id}` | ✅ | Update operator |
| DELETE | `/api/dereporting/operators/{id}` | ✅ | Remove operator |

---

## Authentication

All admin endpoints use **Bearer Token** (Laravel Sanctum):

```
Authorization: Bearer 4|abc123xyz...
```

### Login Flow

```bash
# Request
POST /api/login
Content-Type: application/json

{
  "username": "198001012005011001",
  "password": "Bksda2026!@#"
}

# Response
{
  "token": "4|abc123xyz...",
  "user": {
    "id": 1,
    "name": "Administrator",
    "username": "198001012005011001",
    "role": "super_admin",
    "access_modules": ["kepegawaian", "bmn", "inventory", "dereporting"]
  }
}
```

### Middleware Stack

- `auth:sanctum` — Validates Bearer token
- `role:super_admin,admin` — Role-based access (optional)
- `module.access:cms` — Module-level access control

---

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `APP_KEY` | `base64:xxx` | Encryption key (generate via `php artisan key:generate`) |
| `APP_DEBUG` | `false` | **Must be false in production!** |
| `APP_URL` | `https://api.bksda.app` | Backend URL |
| `FRONTEND_URL` | `https://bksda.app` | Frontend URL (for CORS) |
| `DB_CONNECTION` | `pgsql` | Database driver |
| `DB_HOST` | `pooler.supabase.com` | Supabase host |
| `DB_PORT` | `6543` | Supabase port |
| `DB_DATABASE` | `postgres` | Database name |
| `DB_USERNAME` | `postgres.xxx` | Supabase username |
| `DB_PASSWORD` | `xxx` | Database password |
| `SANCTUM_TOKEN_EXPIRATION` | `10080` | Token expires in 7 days |
| `LOG_CHANNEL` | `stderr` | Log to stderr (Vercel) |
| `SESSION_DRIVER` | `array` | Session in memory (Vercel) |
| `CACHE_STORE` | `array` | Cache in memory (Vercel) |

### Supabase Storage

| Variable | Description |
|----------|-------------|
| `SUPABASE_PROJECT_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!) |
| `SUPABASE_BUCKET` | Storage bucket name (e.g., `cms`) |
| `SUPABASE_ACCESS_KEY_ID` | S3 access key |
| `SUPABASE_SECRET_ACCESS_KEY` | S3 secret key |
| `SUPABASE_ENDPOINT` | `https://xxx.supabase.co/storage/v1/s3` |

---

## Database Commands

```bash
# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Fresh migrate + seed (WARNING: deletes all data!)
php artisan migrate:fresh --seed

# Specific seeder
php artisan db:seed --class=EmployeeSeeder

# Check routes
php artisan route:list
php artisan route:list --path=cms
```

---

## Troubleshooting

### CORS Error

Ensure `FRONTEND_URL` is set correctly in `.env` and matches the frontend origin.

### Token Expired

Tokens expire after 7 days (configurable via `SANCTUM_TOKEN_EXPIRATION`). Re-login to get a new token.

### Storage Upload Failed

1. Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key!)
2. Ensure bucket `cms` exists in Supabase dashboard
3. Verify bucket policy allows uploads
