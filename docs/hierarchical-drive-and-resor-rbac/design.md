# Architecture & Design v2: Penataan Hierarki 4 Unit BKSDA Drive & Pengorganisasian Subfolder Laporan DeReporting (Standar 10/10)

> **Dokumen Terkait**: [requirements.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/requirements.md) | [tasks.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/tasks.md)
> **Pedoman Arsitektur**: `/ponytail` (Boring over clever, deletion over addition, reuse existing tables) & `/security-audit` (Anti-IDOR, Anti-Search Leakage, Anti-Bulk ZIP Bypass, Anti-Collision, Subfolder Inheritance, Least Privilege).

---

## 1. Topologi Hierarki & Subfolder Laporan DeReporting

```
BKSDA DRIVE (Drive Bersama)
│
├── 🏛️ [Unit 1] Balai BKSDA Kalimantan Timur (slug: 'balai-samarinda')
│   ├── 📁 Subbagian Tata Usaha
│   ├── 📁 Urusan Perencanaan, Kerjasama & Kehumasan
│   ├── 📁 Urusan Keuangan & BMN
│   ├── 📁 Urusan Kepegawaian & Umum
│   ├── 📁 Urusan Teknis Konservasi & Perlindungan Hutan
│   ├── 📁 Ruang Kepala Balai
│   ├── 📁 Ruang Pelayanan Publik & Call Center
│   │
│   └── 📁 Formulir DeReporting (Folder Induk)
│       └── 📁 Form Laporan Karhutla 2026 (Folder Formulir)
│           ├── 📁 2026-10-30 - Pemadaman Titik Api Km 48 (Budi Santoso) #8a3f [Subfolder Respon #1]
│           │   ├── 📄 Ringkasan_Laporan.txt  <-- Generated otomatis oleh backend (source_id: uuid:summary:txt)
│           │   ├── 📄 BAP_Pemeriksaan.pdf
│           │   ├── 🖼️ Foto_Dokumentasi_1.jpg
│           │   └── 🖼️ Foto_Dokumentasi_2.jpg
│           │
│           └── 📁 2026-10-30 - Groundcheck Hotspot Resor Kelian (Ahmad) #1c2e [Subfolder Respon #2]
│               ├── 📄 Ringkasan_Laporan.txt
│               └── 🖼️ Foto_Titik_Api.jpg
│
├── 🌲 [Unit 2] Seksi Konservasi Wilayah I Berau (slug: 'skw-1-berau')
│   ├── 🔒 Resor 01. Berau (resor_code: 'resor_01')
│   ├── 🔒 Resor 02. Pulau Semama dan Pulau Sangalaki (resor_code: 'resor_02')
│   ├── 🔒 Resor 03. Tanjung Selor (resor_code: 'resor_03')
│   ├── 🔒 Resor 04. Tarakan (resor_code: 'resor_04')
│   └── 📁 Berkas Umum SKW I (is_restricted: false)
│
├── 🌲 [Unit 3] Seksi Konservasi Wilayah II Tenggarong (slug: 'skw-2-tenggarong')
│   ├── 🔒 Resor 05. Samarinda (resor_code: 'resor_05')
│   ├── 🔒 Resor 06. Padang Luway (resor_code: 'resor_06')
│   ├── 🔒 Resor 07. Muara Kaman Sedulang (resor_code: 'resor_07')
│   ├── 🔒 Resor 08. Sangatta (resor_code: 'resor_08')
│   ├── 🔒 Resor 09. Suaka Badak Kelian (resor_code: 'resor_09')
│   └── 📁 Berkas Umum SKW II (is_restricted: false)
│
└── 🌲 [Unit 4] Seksi Konservasi Wilayah III Balikpapan (slug: 'skw-3-balikpapan')
    ├── 🔒 Resor 10. Balikpapan (resor_code: 'resor_10')
    ├── 🔒 Resor 11. Teluk Adang (resor_code: 'resor_11')
    ├── 🔒 Resor 12. Teluk Apar (resor_code: 'resor_12')
    ├── 🔒 Resor 13. Paser (resor_code: 'resor_13')
    ├── 🔒 Resor 14. Ibu Kota Nusantara (IKN) (resor_code: 'resor_14')
    └── 📁 Berkas Umum SKW III (is_restricted: false)
```

---

## 2. Skema Database Minimalis & Migrasi Eksplisit

### File Migrasi: `backend/database/migrations/2026_10_30_130000_restructure_drive_units_and_folder_rbac.php`

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Tambah kolom pada drive_folders
        Schema::table('drive_folders', function (Blueprint $table) {
            $table->boolean('is_restricted')->default(false);
            $table->string('folder_scope', 32)->nullable(); // 'resor' | 'ruangan' | 'submission' | 'general'
            $table->string('resor_code', 32)->nullable()->index();
            $table->string('room_code', 32)->nullable()->index();
        });

        // 2. Tambah kolom drive_folder_id pada dr_form_responses
        Schema::table('dr_form_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('drive_folder_id')->nullable()->index();
        });

        // 3. Tambah folder_id pada drive_shares dan jadikan file_id nullable
        Schema::table('drive_shares', function (Blueprint $table) {
            $table->unsignedBigInteger('folder_id')->nullable()->index();
        });
        
        // Atasi nullable di PostgreSQL/SQLite dengan aman
        DB::statement('ALTER TABLE drive_shares ALTER COLUMN file_id DROP NOT NULL');

        // 4. Bersihkan unit lama 5 s.d. 9 (terverifikasi 0 berkas & 0 folder)
        DB::table('drive_units')->where('id', '>', 4)->delete();
    }

    public function down(): void
    {
        Schema::table('drive_shares', function (Blueprint $table) {
            $table->dropColumn('folder_id');
        });
        Schema::table('dr_form_responses', function (Blueprint $table) {
            $table->dropColumn('drive_folder_id');
        });
        Schema::table('drive_folders', function (Blueprint $table) {
            $table->dropColumn(['is_restricted', 'folder_scope', 'resor_code', 'room_code']);
        });
    }
};
```

---

## 3. Kamus Master Konstanta (Backend & Frontend)

### Backend: `backend/app/Constants/BksdaConstants.php`
```php
namespace App\Constants;

class BksdaConstants
{
    public const RESORS = [
        'resor_01' => ['name' => 'Resor 01. Berau', 'unit_id' => 2, 'skw_slug' => 'skw-1-berau'],
        'resor_02' => ['name' => 'Resor 02. Pulau Semama dan Pulau Sangalaki', 'unit_id' => 2, 'skw_slug' => 'skw-1-berau'],
        'resor_03' => ['name' => 'Resor 03. Tanjung Selor', 'unit_id' => 2, 'skw_slug' => 'skw-1-berau'],
        'resor_04' => ['name' => 'Resor 04. Tarakan', 'unit_id' => 2, 'skw_slug' => 'skw-1-berau'],
        'resor_05' => ['name' => 'Resor 05. Samarinda', 'unit_id' => 3, 'skw_slug' => 'skw-2-tenggarong'],
        'resor_06' => ['name' => 'Resor 06. Padang Luway', 'unit_id' => 3, 'skw_slug' => 'skw-2-tenggarong'],
        'resor_07' => ['name' => 'Resor 07. Muara Kaman Sedulang', 'unit_id' => 3, 'skw_slug' => 'skw-2-tenggarong'],
        'resor_08' => ['name' => 'Resor 08. Sangatta', 'unit_id' => 3, 'skw_slug' => 'skw-2-tenggarong'],
        'resor_09' => ['name' => 'Resor 09. Suaka Badak Kelian', 'unit_id' => 3, 'skw_slug' => 'skw-2-tenggarong'],
        'resor_10' => ['name' => 'Resor 10. Balikpapan', 'unit_id' => 4, 'skw_slug' => 'skw-3-balikpapan'],
        'resor_11' => ['name' => 'Resor 11. Teluk Adang', 'unit_id' => 4, 'skw_slug' => 'skw-3-balikpapan'],
        'resor_12' => ['name' => 'Resor 12. Teluk Apar', 'unit_id' => 4, 'skw_slug' => 'skw-3-balikpapan'],
        'resor_13' => ['name' => 'Resor 13. Paser', 'unit_id' => 4, 'skw_slug' => 'skw-3-balikpapan'],
        'resor_14' => ['name' => 'Resor 14. Ibu Kota Nusantara (IKN)', 'unit_id' => 4, 'skw_slug' => 'skw-3-balikpapan'],
    ];

    public const BALAI_ROOMS = [
        'subbag_tu' => 'Subbagian Tata Usaha',
        'perencanaan' => 'Urusan Perencanaan, Kerjasama & Kehumasan',
        'keuangan_bmn' => 'Urusan Keuangan & BMN',
        'kepegawaian_umum' => 'Urusan Kepegawaian & Umum',
        'teknis_konservasi' => 'Urusan Teknis Konservasi & Perlindungan Hutan',
        'kepala_balai' => 'Ruang Kepala Balai',
        'pelayanan_publik' => 'Ruang Pelayanan Publik & Call Center',
        'dereporting' => 'Formulir DeReporting',
    ];
}
```

### Frontend: `frontend/src/app/kepegawaian/_lib/employee-constants.ts`
```typescript
export interface ResorOption {
  code: string;
  name: string;
  skw: "SKW_1" | "SKW_2" | "SKW_3";
}

export const RESOR_OPTIONS: ResorOption[] = [
  // SKW I Berau
  { code: "resor_01", name: "Resor 01. Berau", skw: "SKW_1" },
  { code: "resor_02", name: "Resor 02. Pulau Semama dan Pulau Sangalaki", skw: "SKW_1" },
  { code: "resor_03", name: "Resor 03. Tanjung Selor", skw: "SKW_1" },
  { code: "resor_04", name: "Resor 04. Tarakan", skw: "SKW_1" },
  // SKW II Tenggarong
  { code: "resor_05", name: "Resor 05. Samarinda", skw: "SKW_2" },
  { code: "resor_06", name: "Resor 06. Padang Luway", skw: "SKW_2" },
  { code: "resor_07", name: "Resor 07. Muara Kaman Sedulang", skw: "SKW_2" },
  { code: "resor_08", name: "Resor 08. Sangatta", skw: "SKW_2" },
  { code: "resor_09", name: "Resor 09. Suaka Badak Kelian", skw: "SKW_2" },
  // SKW III Balikpapan
  { code: "resor_10", name: "Resor 10. Balikpapan", skw: "SKW_3" },
  { code: "resor_11", name: "Resor 11. Teluk Adang", skw: "SKW_3" },
  { code: "resor_12", name: "Resor 12. Teluk Apar", skw: "SKW_3" },
  { code: "resor_13", name: "Resor 13. Paser", skw: "SKW_3" },
  { code: "resor_14", name: "Resor 14. Ibu Kota Nusantara (IKN)", skw: "SKW_3" },
];
```

---

## 4. Algoritma Otorisasi & Pencegahan Celah Keamanan (`DriveAccess.php`)

### A. Memoization Pegawai O(1)
```php
public static function getEmployee(User $user): ?Employee
{
    if (! property_exists($user, '_memoized_employee')) {
        $user->_memoized_employee = Employee::where('nip', $user->username)->first();
    }
    return $user->_memoized_employee;
}

public static function isDriveAdmin(User $user): bool
{
    if ($user->role === 'super_admin') return true;
    $modules = $user->access_modules ?? [];
    return is_array($modules) && in_array('drive', $modules, true);
}
```

### B. Evaluasi Izin Folder (`canReadFolder`)
```php
public static function canReadFolder(User $user, DriveFolder $folder): bool
{
    if (self::isDriveAdmin($user) || $folder->user_id === $user->id) {
        return true;
    }

    if ($folder->is_restricted) {
        // Cek share internal via drive_shares
        $userUnitIds = DriveUnit::all()->filter(fn($u) => self::unitRole($user, $u) !== null)->pluck('id');
        $hasShare = \App\Models\DriveShare::where('folder_id', $folder->id)
            ->where(function ($q) use ($user, $userUnitIds) {
                $q->where('user_id', $user->id)->orWhereIn('unit_id', $userUnitIds);
            })
            ->exists();

        if ($hasShare) return true;

        // Cek kecocokan penempatan dinamis pegawai resor
        if ($folder->resor_code) {
            $employee = self::getEmployee($user);
            return $employee && (string)$employee->resor === (string)$folder->resor_code;
        }

        return false;
    }

    // Folder umum: warisi hak akses unit
    if ($folder->unit_id) {
        $unit = $folder->unit ?? DriveUnit::find($folder->unit_id);
        return $unit ? self::canRead($user, $unit) : false;
    }

    return false;
}
```

### C. Anti-IDOR Berkas (`canReadFile`)
```php
public static function canReadFile(User $user, DriveFile $file): bool
{
    if (self::isDriveAdmin($user) || $file->user_id === $user->id) {
        return true;
    }

    // Jika berkas berada di folder terisolasi, wajib lulus izin folder!
    if ($file->folder_id) {
        $folder = $file->folder ?? DriveFolder::find($file->folder_id);
        if ($folder && $folder->is_restricted) {
            return self::canReadFolder($user, $folder);
        }
    }

    if ($file->unit_id) {
        $unit = $file->unit ?? DriveUnit::find($file->unit_id);
        return $unit ? self::canRead($user, $unit) : false;
    }

    return $file->shares()->where('user_id', $user->id)->exists();
}
```

### D. Anti-Bulk ZIP Traversal Leakage (`DriveController::addFolderToZipStream`)
```php
protected function addFolderToZipStream(\ZipStream\ZipStream $zip, DriveFolder $folder, string $basePath, User $user): void
{
    $files = DriveFile::where('folder_id', $folder->id)->whereNull('deleted_at')->get();
    foreach ($files as $file) {
        // Anti-Zip-Slip...
    }

    $subfolders = DriveFolder::where('parent_id', $folder->id)->whereNull('deleted_at')->get();
    foreach ($subfolders as $sub) {
        // LEWATI SUBFOLDER TERISOLASI JIKA USER TIDAK BERHAK
        if (! DriveAccess::canReadFolder($user, $sub)) {
            continue;
        }

        $subClean = basename(preg_replace('/(\.\.[\/\\\\])+/', '', (string) $sub->name));
        $subPath = ltrim(($basePath !== '' ? "{$basePath}/" : '') . $subClean, '/');
        $this->addFolderToZipStream($zip, $sub, $subPath, $user);
    }
}
```

### E. Perbaikan Query Tab "Dibagikan kepada Saya" (`DriveController::index`)
```php
if ($filter === 'shared_with_me') {
    $userUnits = DriveUnit::all()->filter(fn($u) => DriveAccess::unitRole($user, $u) !== null)->pluck('id');
    
    $sharedShares = \App\Models\DriveShare::where('share_type', 'internal')
        ->where(function ($q) use ($user, $userUnits) {
            $q->where('user_id', $user->id)->orWhereIn('unit_id', $userUnits);
        })
        ->get();

    $sharedFileIds = $sharedShares->whereNotNull('file_id')->pluck('file_id');
    $sharedFolderIds = $sharedShares->whereNotNull('folder_id')->pluck('folder_id');

    // AKTIFKAN QUERY FOLDER
    $folderQuery->whereIn('id', $sharedFolderIds)->whereNull('deleted_at');
    $fileQuery->whereIn('id', $sharedFileIds)->whereNull('deleted_at');
}
```

---

## 5. Pembuatan Subfolder & Ringkasan Laporan DeReporting

### A. Ekstraksi Judul & Anti-Collision Sanitization
Di dalam `FormBuilderController::submitPublic()`:
```php
// Heuristic Matcher Judul & Nama Pelapor
$rawTitle = null;
$rawReporter = null;
foreach ($fields as $f) {
    $fid = $f['id'] ?? '';
    $lbl = strtolower((string)($f['label'] ?? ''));
    if (! $rawTitle && preg_match('/(judul|kegiatan|laporan|perihal)/i', $lbl) && ! empty($answers[$fid])) {
        $rawTitle = is_array($answers[$fid]) ? implode(' ', $answers[$fid]) : (string)$answers[$fid];
    }
    if (! $rawReporter && preg_match('/(nama|pelapor|petugas)/i', $lbl) && ! empty($answers[$fid])) {
        $rawReporter = is_array($answers[$fid]) ? implode(' ', $answers[$fid]) : (string)$answers[$fid];
    }
}

$rawTitle = $rawTitle ?: 'Laporan Lapangan';
$rawReporter = $rawReporter ?: ($request->user()?->name ?: 'Masyarakat');
$date = now()->format('Y-m-d');
$shortHash = substr(md5($responseId), 0, 4);

$cleanTitle = Str::limit(preg_replace('/[\/\\\\:\*\?"<>\|\r\n\t]/', '', (string)$rawTitle), 45, '');
$cleanReporter = Str::limit(preg_replace('/[\/\\\\:\*\?"<>\|\r\n\t]/', '', (string)$rawReporter), 25, '');
$subfolderName = trim("{$date} - {$cleanTitle} ({$cleanReporter}) #{$shortHash}");

$subfolder = DriveFolder::create([
    'unit_id' => 1, // Balai Samarinda
    'parent_id' => $formFolder->id,
    'name' => $subfolderName,
    'user_id' => $ownerId,
    'folder_scope' => 'submission',
    'color' => '#3B82F6',
]);

$response->update(['drive_folder_id' => $subfolder->id]);
```

### B. Generator `Ringkasan_Laporan.txt` Otomatis
```php
$summaryText = "========================================================================\n";
$summaryText .= "RINGKASAN TANGGAPAN FORMULIR DE-REPORTING BKSDA KALTIM\n";
$summaryText .= "========================================================================\n";
$summaryText .= "Formulir       : {$form->title}\n";
$summaryText .= "ID Tanggapan   : {$responseId}\n";
$summaryText .= "Waktu Kirim    : " . now()->setTimezone('Asia/Makassar')->format('d F Y H:i') . " WITA\n";
$summaryText .= "IP Pengirim    : " . ($request->ip() ?: '-') . "\n\n";
$summaryText .= "------------------------------------------------------------------------\n";
$summaryText .= "DATA JAWABAN:\n";
$summaryText .= "------------------------------------------------------------------------\n";

foreach ($fields as $field) {
    $fId = $field['id'] ?? '';
    $fLabel = $field['label'] ?? '';
    $fType = $field['type'] ?? 'text';
    
    if ($fType === 'gps_location') {
        $gps = $answers[$fId] ?? null;
        $locStr = (is_array($gps) && isset($gps['latitude'], $gps['longitude']))
            ? "{$gps['latitude']}, {$gps['longitude']} (Akurasi: " . ($gps['accuracy'] ?? '-') . " m)"
            : "-";
        $summaryText .= "- {$fLabel}: {$locStr}\n";
    } elseif ($fType !== 'file') {
        $ans = $answers[$fId] ?? '-';
        $ansStr = is_array($ans) ? implode(', ', $ans) : (string)$ans;
        $summaryText .= "- {$fLabel}: {$ansStr}\n";
    }
}

$summaryText .= "\n========================================================================\n";
$summaryText .= "Dicetak secara otomatis oleh BKSDA SuperApp DeReporting System.\n";

$summaryPath = "units/balai-samarinda/dereporting/{$form->slug}/{$responseId}/Ringkasan_Laporan.txt";
Storage::disk('drive')->put($summaryPath, $summaryText);

DriveFile::create([
    'unit_id' => 1,
    'user_id' => $ownerId,
    'folder_id' => $subfolder->id,
    'name' => 'Ringkasan_Laporan.txt',
    's3_key' => $summaryPath,
    'size_bytes' => strlen($summaryText),
    'mime_type' => 'text/plain',
    'source_module' => 'dereporting',
    'source_id' => "{$responseId}:summary:txt",
]);
```

---

## 6. Validasi Silang di Modul Kepegawaian (`EmployeeRequest.php`)

```php
public function rules(): array
{
    return [
        'satuan_kerja' => ['required', 'string', 'max:255'],
        'resor' => [
            'nullable',
            'string',
            function ($attribute, $value, $fail) {
                $sk = strtolower((string) $this->input('satuan_kerja'));
                if (str_contains($sk, 'balai') && ! empty($value)) {
                    $fail('Pegawai dengan Satuan Kerja Balai tidak boleh memiliki penempatan Resor.');
                }
                if (! empty($value)) {
                    $validCodes = array_keys(\App\Constants\BksdaConstants::RESORS);
                    if (! in_array($value, $validCodes, true)) {
                        $fail('Kode resor penempatan tidak valid.');
                    }
                }
            },
        ],
    ];
}
```
