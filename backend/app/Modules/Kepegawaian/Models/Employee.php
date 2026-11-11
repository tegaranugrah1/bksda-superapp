<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $nip Nomor Induk Pegawai. Digunakan untuk link ke table users.username
 * @property string $nama_lengkap
 * @property string|null $jabatan
 * @property string|null $pangkat_golongan Contoh: Penata Tk. I (III/d)
 * @property string|null $satuan_kerja Contoh: SKW I / Resor Konservasi Wilayah
 * @property bool $is_active Apakah pegawai masih aktif bekerja
 * @property string|null $foto_profil
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read User|null $user
 *
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFotoProfil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereNamaLengkap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePangkatGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSatuanKerja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee withoutTrashed()
 *
 * @mixin \Eloquent
 */
class Employee extends Model
{
    // Menggunakan SoftDeletes agar record tidak hilang (Rule 3.6)
    use HasFactory, SoftDeletes;

    // Rule 3.7: Prefix kpg_
    protected $table = 'kpg_employees';

    public const ALLOWED_INACTIVE_REASONS = [
        'pensiun',
        'mengundurkan_diri',
        'habis_kontrak',
        'mutasi',
        'meninggal',
        'diberhentikan',
        'lainnya',
    ];

    public const INACTIVE_REASON_LABELS = [
        'pensiun' => 'Pensiun / Purna Tugas',
        'mengundurkan_diri' => 'Mengundurkan Diri',
        'habis_kontrak' => 'Selesai Masa Kontrak',
        'mutasi' => 'Mutasi / Pindah Instansi',
        'meninggal' => 'Meninggal Dunia',
        'diberhentikan' => 'Diberhentikan',
        'lainnya' => 'Lainnya',
    ];

    // Rule 1.3: Keamanan tingkat tinggi, tolak semua input KECUALI daftar di bawah ini
    protected $fillable = [
        'nip',
        'nama_lengkap',
        'jabatan',
        'pangkat_golongan',
        'satuan_kerja',
        'nama_bank',
        'nomor_rekening',
        'resor',
        'telepon',
        'email',
        'masa_kerja',
        'is_active',
        'inactive_reason',
        'inactive_effective_date',
        'inactive_notes',
        'foto_profil',
    ];

    public static function lockForLeaveUpdate(int $employeeId): self
    {
        LeaveType::lockCatalog();

        return static::withTrashed()->lockForUpdate()->findOrFail($employeeId);
    }

    /**
     * Single source of truth: resolve employee_id dari Daftar Pegawai (kpg_employees)
     * berdasarkan kolom teks pengguna / nama_pengguna hasil import Excel BMN.
     */
    public static function resolveIdByName(?string ...$names): ?int
    {
        $resolvedIds = [];
        foreach ($names as $raw) {
            $target = trim((string) $raw);
            if ($target === '' || $target === '-') {
                continue;
            }
            $lower = mb_strtolower($target);
            $matches = static::whereRaw('LOWER(TRIM(nama_lengkap)) = ?', [$lower])->limit(2)->pluck('id');
            $clean = trim((string) preg_replace('/,.*$/', '', $target));
            if (mb_strlen($clean) >= 3 && ($matches->isEmpty() || $clean === $target)) {
                $escaped = addcslashes(mb_strtolower($clean), '%_');
                $matches = static::whereRaw('LOWER(TRIM(nama_lengkap)) = ?', [mb_strtolower($clean)])
                    ->orWhereRaw('LOWER(nama_lengkap) LIKE ?', [$escaped . ',%'])
                    ->limit(2)->pluck('id');
            }
            foreach ($matches as $id) {
                $resolvedIds[(int) $id] = true;
            }
            // Names authorize only when every matching column identifies one employee.
            if (count($resolvedIds) > 1) {
                return null;
            }
        }

        return $resolvedIds ? array_key_first($resolvedIds) : null;
    }

    public function replaceProfilePhoto(UploadedFile $file): string
    {
        $oldPath = $this->foto_profil;
        $path = $file->store('employees/emp-'.$this->getKey().'/foto-profil');
        abort_if($path === false, 500, 'Foto profil gagal disimpan.');

        $this->update(['foto_profil' => $path]);
        static::deleteUnreferencedProfilePhoto($oldPath);

        return $path;
    }

    public static function deleteUnreferencedProfilePhoto(?string $path): void
    {
        // Display scopes must not hide an active or archived storage reference.
        if ($path && ! str_starts_with($path, 'http')
            && ! static::withoutGlobalScopes()->withTrashed()->where('foto_profil', $path)->exists()) {
            Storage::delete($path);
        }
    }

    // Konversi otomatis string 0/1 dari database menjadi boolean true/false di PHP
    protected $casts = [
        'is_active' => 'boolean',
        'inactive_effective_date' => 'date:Y-m-d',
    ];

    protected $appends = [
        'is_seksi',
        'seksi_wilayah',
        'is_pppk',
        'is_mmp',
        'jenis_pegawai',
        'nip_label',
        'is_cpns2025',
        'foto_url',
        'inactive_reason_label',
        'status_badge',
    ];

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto_profil ? Storage::url($this->foto_profil) : null;
    }

    public function getNoTeleponAttribute(): ?string
    {
        return $this->attributes['no_telepon'] ?? $this->attributes['telepon'] ?? null;
    }

    public function setNoTeleponAttribute(?string $value): void
    {
        $this->attributes['telepon'] = $value;
    }

    /**
     * Accessor: Cek apakah personil merupakan Masyarakat Mitra Polhut (MMP)
     */
    public function getIsMmpAttribute(): bool
    {
        $nip = strtoupper(trim((string) $this->nip));
        return str_starts_with($nip, 'MMP-');
    }

    /**
     * Accessor: Kategori jenis pegawai ('PNS', 'PPPK', atau 'MMP')
     */
    public function getJenisPegawaiAttribute(): string
    {
        if ($this->is_mmp) {
            return 'MMP';
        }

        return $this->is_pppk ? 'PPPK' : 'PNS';
    }

    /**
     * Generate kode unik MMP-xxx berikutnya secara sekuensial
     */
    public static function generateNextMmpCode(): string
    {
        $existingCodes = static::withTrashed()
            ->withoutGlobalScopes()
            ->where('nip', 'LIKE', 'MMP-%')
            ->pluck('nip');

        $maxNumber = 0;
        foreach ($existingCodes as $code) {
            if (preg_match('/^MMP-(\d+)$/i', trim((string) $code), $matches)) {
                $num = (int) $matches[1];
                if ($num > $maxNumber) {
                    $maxNumber = $num;
                }
            }
        }

        return sprintf('MMP-%03d', $maxNumber + 1);
    }

    /**
     * Accessor: Cek apakah pegawai berstatus PPPK (P3K)
     * Ditandai dengan NIP pos 13-14 bernilai '21' atau memuat pppk/p3k pada pangkat/jabatan
     */
    public function getIsPppkAttribute(): bool
    {
        if (empty($this->nip) || $this->is_mmp) {
            return false;
        }

        $cleanNip = preg_replace('/\s+/', '', (string) $this->nip);
        if (strlen($cleanNip) >= 14 && substr($cleanNip, 12, 2) === '21') {
            return true;
        }

        $gol = strtolower($this->pangkat_golongan ?? '');
        $jab = strtolower($this->jabatan ?? '');
        return str_contains($gol, 'pppk') || str_contains($jab, 'pppk') || str_contains($gol, 'p3k') || str_starts_with($gol, 'golongan ');
    }

    /**
     * Scope filter berdasarkan kategori jenis pegawai (PNS, PPPK, MMP)
     */
    public function scopeOfJenis($query, string $jenis)
    {
        $jenis = strtoupper(trim($jenis));
        $mmpSql = "UPPER(TRIM(COALESCE(nip, ''))) LIKE 'MMP-%'";
        $pppkSql = "(NOT ({$mmpSql}) AND (SUBSTR(REPLACE(COALESCE(nip, ''), ' ', ''), 13, 2) = '21' OR LOWER(COALESCE(pangkat_golongan, '')) LIKE '%pppk%' OR LOWER(COALESCE(pangkat_golongan, '')) LIKE '%p3k%' OR LOWER(COALESCE(pangkat_golongan, '')) LIKE 'golongan %' OR LOWER(COALESCE(jabatan, '')) LIKE '%pppk%'))";

        if ($jenis === 'MMP') {
            return $query->whereRaw($mmpSql);
        }
        if ($jenis === 'PPPK' || $jenis === 'P3K') {
            return $query->whereRaw($pppkSql);
        }
        if ($jenis === 'PNS') {
            return $query->whereRaw("NOT ({$mmpSql}) AND NOT {$pppkSql}");
        }

        return $query;
    }

    /**
     * Accessor: Label NIP ("NIPPPK" jika PPPK, "NIP" jika PNS/lainnya)
     */
    public function getNipLabelAttribute(): string
    {
        return $this->is_pppk ? 'NIPPPK' : 'NIP';
    }


    /**
     * Accessor: Cek apakah pegawai merupakan CPNS pengangkatan 2025 (NIP mengandung 202506)
     */
    /**
     * Tanggal mulai berhak cuti tahunan (1 tahun setelah pengangkatan dari NIP).
     * CPNS/PNS: digit 9-14 (YYYYMM) + 1 tahun (misal 202506 -> 2026-06-01).
     * PPPK: digit 9-12 (YYYY) + 1 tahun kalender (misal 2024 -> 2025-01-01).
     * MMP: null (tidak ada hak cuti).
     */
    public function getAnnualLeaveEligibleDateAttribute(): ?Carbon
    {
        if ($this->is_mmp || empty($this->nip)) {
            return null;
        }

        $cleanNip = preg_replace('/\s+/', '', (string) $this->nip);

        if ($this->is_pppk) {
            if (strlen($cleanNip) >= 12 && ctype_digit(substr($cleanNip, 8, 4))) {
                $year = (int) substr($cleanNip, 8, 4);
                if ($year >= 2000 && $year <= 2100) {
                    return Carbon::create($year + 1, 1, 1)->startOfDay();
                }
            }
            return null;
        }

        if (strlen($cleanNip) >= 14 && ctype_digit(substr($cleanNip, 8, 6))) {
            $ym = substr($cleanNip, 8, 6);
            $y = (int) substr($ym, 0, 4);
            $m = (int) substr($ym, 4, 2);
            if ($y >= 1950 && $y <= 2100 && $m >= 1 && $m <= 12) {
                return Carbon::create($y, $m, 1)->addYear()->startOfDay();
            }
        }

        return null;
    }

    /**
     * Cek apakah pegawai sudah memenuhi syarat 1 tahun masa kerja untuk Cuti Tahunan
     */
    public function isEligibleForAnnualLeave(?Carbon $asOf = null): bool
    {
        if ($this->is_mmp) {
            return false;
        }

        $eligibleDate = $this->annual_leave_eligible_date;
        if (! $eligibleDate) {
            return true;
        }

        $target = $asOf ? $asOf->copy()->startOfDay() : Carbon::now()->startOfDay();
        return $target->gte($eligibleDate);
    }

    public function getIsCpns2025Attribute(): bool
    {
        if (empty($this->nip)) {
            return false;
        }
        $cleanNip = preg_replace('/\s+/', '', (string) $this->nip);
        return str_contains($cleanNip, '202506');
    }

    /**
     * Accessor: Cek apakah pegawai bertugas di Seksi Konservasi Wilayah (I, II, atau III)
     */
    public function getIsSeksiAttribute(): bool
    {
        if (empty($this->satuan_kerja)) {
            return false;
        }

        $sk = strtolower($this->satuan_kerja);

        // Jika Kantor Balai KSDA -> Bukan Seksi
        if (str_contains($sk, 'kantor balai') || str_contains($sk, 'balai')) {
            return false;
        }

        // Jika memuat seksi / skw / wilayah / berau / tenggarong / balikpapan
        return str_contains($sk, 'seksi')
            || str_contains($sk, 'skw')
            || str_contains($sk, 'wilayah')
            || str_contains($sk, 'berau')
            || str_contains($sk, 'tenggarong')
            || str_contains($sk, 'balikpapan');
    }

    /**
     * Accessor: Nomor romawi Seksi Wilayah ('I', 'II', 'III', atau null)
     */
    public function getSeksiWilayahAttribute(): ?string
    {
        if (! $this->is_seksi) {
            return null;
        }

        $sk = strtolower($this->satuan_kerja);

        // Periksa Wilayah III / Balikpapan terlebih dahulu untuk menghindari collision substring
        if (str_contains($sk, 'wilayah iii') || str_contains($sk, 'wil iii') || str_contains($sk, 'balikpapan') || str_contains($sk, 'seksi 3') || str_contains($sk, 'seksi iii')) {
            return 'III';
        }

        // Periksa Wilayah II / Tenggarong
        if (str_contains($sk, 'wilayah ii') || str_contains($sk, 'wil ii') || str_contains($sk, 'tenggarong') || str_contains($sk, 'seksi 2') || str_contains($sk, 'seksi ii')) {
            return 'II';
        }

        // Periksa Wilayah I / Berau
        if (str_contains($sk, 'wilayah i') || str_contains($sk, 'wil i') || str_contains($sk, 'berau') || str_contains($sk, 'seksi 1') || str_contains($sk, 'seksi i')) {
            return 'I';
        }

        return null;
    }

    /**
     * Exclude administrator pusat from employee listings globally
     */
    protected static function booted(): void
    {
        static::addGlobalScope('excludeAdminPusat', function ($builder) {
            $builder->where('nip', '!=', '198001012005011001')
                ->where('nama_lengkap', 'NOT LIKE', '%Administrator Pusat%')
                ->where('nama_lengkap', 'NOT LIKE', '%administrator%');
        });

        static::saving(function (Employee $employee) {
            if ($employee->is_mmp) {
                $employee->nama_bank = null;
                $employee->nomor_rekening = null;
            }
        });
    }

    /**
     * RELASI (Rule 6.1)
     * Pegawai (Employee) mungkin memiliki 1 Akun Aplikasi (User).
     * Relasi ini tidak menggunakan employee_id seperti biasa,
     * melainkan menjodohkan NIP pegawai dengan Username di tabel User.
     *
     * Argumen ke-2: Foreign Key di tabel tujuan (users.username)
     * Argumen ke-3: Local Key di tabel sumber (employees.nip)
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'username', 'nip');
    }

    /**
     * LOCAL SCOPE (Penyederhanaan Query)
     * Daripada menulis Employee::where('is_active', true)->get() berulang-ulang,
     * developer cukup menulis Employee::active()->get()
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * RELASI: Riwayat Penugasan (Surat Tugas)
     * Mengambil daftar surat tugas yang melibatkan pegawai ini.
     */
    public function assignmentLetters(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \App\Modules\SuratTugas\Models\AssignmentLetter::class,
            'st_assignment_letter_employees',
            'employee_id',
            'assignment_letter_id'
        )
            ->using(\App\Modules\SuratTugas\Models\AssignmentLetterEmployee::class)
            ->withPivot('peran')
            ->withTimestamps();
    }

    public function leaves(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmployeeLeave::class, 'employee_id');
    }

    public function histories(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmployeeHistory::class, 'employee_id')->latest('created_at');
    }

    /**
     * Memeriksa apakah pegawai secara efektif aktif pada tanggal tertentu (default: hari ini).
     * Jika is_active = false, atau tanggal sudah mencapai/melewati inactive_effective_date (TMT),
     * maka bernilai false.
     */
    public function isEffectiveActive(\DateTimeInterface|string|null $asOf = null): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->inactive_effective_date) {
            $checkDate = $asOf instanceof \DateTimeInterface
                ? $asOf->format('Y-m-d')
                : ($asOf ? Carbon::parse($asOf)->toDateString() : now()->toDateString());
            if ($checkDate >= $this->inactive_effective_date->toDateString()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Memeriksa apakah pegawai memiliki jadwal nonaktif di masa mendatang.
     */
    public function isScheduledInactive(): bool
    {
        return $this->is_active
            && $this->inactive_effective_date !== null
            && $this->inactive_effective_date->toDateString() > now()->toDateString();
    }

    /**
     * Scope untuk query pegawai yang efektif aktif pada tanggal tertentu.
     */
    public function scopeEffectiveActive($query, \DateTimeInterface|string|null $asOf = null)
    {
        $date = $asOf instanceof \DateTimeInterface
            ? $asOf->format('Y-m-d')
            : ($asOf ? Carbon::parse($asOf)->toDateString() : now()->toDateString());

        return $query->where('is_active', true)
            ->where(function ($q) use ($date) {
                $q->whereNull('inactive_effective_date')
                    ->orWhere('inactive_effective_date', '>', $date);
            });
    }

    /**
     * Scope untuk query pegawai yang dijadwalkan nonaktif di masa mendatang.
     */
    public function scopeScheduledInactive($query)
    {
        $today = now()->toDateString();

        return $query->where('is_active', true)
            ->whereNotNull('inactive_effective_date')
            ->where('inactive_effective_date', '>', $today);
    }

    public function getInactiveReasonLabelAttribute(): ?string
    {
        if (! $this->inactive_reason) {
            return null;
        }

        return static::INACTIVE_REASON_LABELS[$this->inactive_reason] ?? ucfirst(str_replace('_', ' ', $this->inactive_reason));
    }

    public function getStatusBadgeAttribute(): array
    {
        if ($this->isEffectiveActive()) {
            if ($this->isScheduledInactive()) {
                return [
                    'state' => 'scheduled_inactive',
                    'label' => 'Akan Nonaktif (' . $this->inactive_effective_date?->format('d M Y') . ')',
                    'color' => 'amber',
                    'is_active' => true,
                    'reason' => $this->inactive_reason,
                    'effective_date' => $this->inactive_effective_date?->format('Y-m-d'),
                ];
            }

            return [
                'state' => 'active',
                'label' => 'Aktif Bertugas',
                'color' => 'emerald',
                'is_active' => true,
            ];
        }

        // Nonaktif
        $reason = $this->inactive_reason_label;
        $label = $reason ? "Nonaktif • {$reason}" : 'Nonaktif — Data Belum Lengkap';

        return [
            'state' => 'inactive',
            'label' => $label,
            'color' => 'slate',
            'is_active' => false,
            'reason' => $this->inactive_reason,
            'effective_date' => $this->inactive_effective_date?->format('Y-m-d'),
        ];
    }

    /**
     * Memeriksa apakah pegawai memiliki jejak historis operasional (SPT, Cuti, BMN, dll).
     */
    public function hasOperationalHistory(): bool
    {
        if (DB::table('st_assignment_letter_employees')->where('employee_id', $this->id)->exists()) {
            return true;
        }

        $nip = trim((string) $this->nip);
        if ($nip !== '') {
            $userId = DB::table('users')->where('username', $nip)->value('id');
            if ($userId && DB::table('st_assignment_letters')->where('created_by', $userId)->exists()) {
                return true;
            }
        }

        if (DB::table('kpg_employee_leave_requests')->where('employee_id', $this->id)->exists()) {
            return true;
        }

        if (DB::table('kpg_employee_leaves')
            ->where('employee_id', $this->id)
            ->where(function ($q) {
                $q->where('cuti_terpakai_n0', '>', 0)
                    ->orWhere('cuti_terpakai_n1', '>', 0)
                    ->orWhere('cuti_terpakai_n2', '>', 0);
            })
            ->exists()) {
            return true;
        }

        if (DB::table('kpg_meal_allowance_items')->where('employee_id', $this->id)->exists()) {
            return true;
        }

        if (DB::table('bmn_asset_loans')->where('employee_id', $this->id)->exists()) {
            return true;
        }

        if (DB::table('kpg_employee_histories')->where('employee_id', $this->id)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Transisi status lifecycle pegawai secara atomik & terkoordinasi (doc.md §5 & §6).
     */
    public function applyLifecycleStatus(
        string $action,
        ?string $reason = null,
        ?string $effectiveDate = null,
        ?string $notes = null,
        ?User $actor = null
    ): self {
        return DB::transaction(function () use ($action, $reason, $effectiveDate, $notes, $actor) {
            $locked = static::lockForUpdate()->findOrFail($this->id);
            $oldActive = $locked->is_active;
            $oldReason = $locked->inactive_reason;
            $oldDate = $locked->inactive_effective_date?->toDateString();
            $oldNotes = $locked->inactive_notes;

            $nip = trim((string) $locked->nip);
            $user = $nip !== '' ? User::where('username', $nip)->lockForUpdate()->first() : null;

            if ($action === 'deactivate') {
                $effDateCarbon = $effectiveDate ? Carbon::parse($effectiveDate) : now();
                $isEffectiveNow = $effDateCarbon->toDateString() <= now()->toDateString();

                $locked->update([
                    'is_active' => ! $isEffectiveNow,
                    'inactive_reason' => $reason,
                    'inactive_effective_date' => $effDateCarbon->toDateString(),
                    'inactive_notes' => $notes,
                ]);

                if ($isEffectiveNow && $user) {
                    $user->update(['is_active' => false]);
                    $user->tokens()->delete();
                }

                EmployeeHistory::create([
                    'employee_id' => $locked->id,
                    'user_id' => $actor?->id,
                    'action' => $isEffectiveNow ? 'DEACTIVATE_EMPLOYEE' : 'SCHEDULE_INACTIVE_EMPLOYEE',
                    'changes' => [
                        'is_active' => ['old' => $oldActive, 'new' => ! $isEffectiveNow],
                        'inactive_reason' => ['old' => $oldReason, 'new' => $reason],
                        'inactive_effective_date' => ['old' => $oldDate, 'new' => $effDateCarbon->toDateString()],
                        'inactive_notes' => ['old' => $oldNotes, 'new' => $notes],
                    ],
                    'notes' => $notes ?: ($isEffectiveNow ? "Penonaktifan pegawai ({$reason})" : "Penjadwalan nonaktif pegawai ({$reason}) per {$effDateCarbon->toDateString()}"),
                    'created_at' => now(),
                ]);
            } elseif ($action === 'cancel_schedule') {
                $locked->update([
                    'is_active' => true,
                    'inactive_reason' => null,
                    'inactive_effective_date' => null,
                    'inactive_notes' => null,
                ]);

                EmployeeHistory::create([
                    'employee_id' => $locked->id,
                    'user_id' => $actor?->id,
                    'action' => 'CANCEL_SCHEDULE_INACTIVE',
                    'changes' => [
                        'inactive_reason' => ['old' => $oldReason, 'new' => null],
                        'inactive_effective_date' => ['old' => $oldDate, 'new' => null],
                        'inactive_notes' => ['old' => $oldNotes, 'new' => null],
                    ],
                    'notes' => $notes ?: 'Pembatalan jadwal penonaktifan pegawai',
                    'created_at' => now(),
                ]);
            } elseif ($action === 'reactivate') {
                $locked->update([
                    'is_active' => true,
                    'inactive_reason' => null,
                    'inactive_effective_date' => null,
                    'inactive_notes' => $notes,
                ]);

                // Sesuai doc.md: Pengaktifan kembali pegawai TIDAK otomatis mengaktifkan akun user
                EmployeeHistory::create([
                    'employee_id' => $locked->id,
                    'user_id' => $actor?->id,
                    'action' => 'REACTIVATE_EMPLOYEE',
                    'changes' => [
                        'is_active' => ['old' => false, 'new' => true],
                        'inactive_reason' => ['old' => $oldReason, 'new' => null],
                        'inactive_effective_date' => ['old' => $oldDate, 'new' => null],
                    ],
                    'notes' => $notes ?: 'Pengaktifan kembali pegawai (Akun user tetap non-aktif sampai dikelola via IAM)',
                    'created_at' => now(),
                ]);
            }

            return $locked->fresh(['user']);
        });
    }
}
