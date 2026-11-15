<?php

namespace App\Modules\Bmn\Models;

use App\Constants\BksdaConstants;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class Location extends Model
{
    use HasUuids;

    public const TYPE_BALAI = 'balai';
    public const TYPE_SEKSI = 'seksi';
    public const TYPE_ROOM = 'room';
    public const TYPE_RESOR = 'resor';

    public const UNIT_SLUGS = [
        'balai-samarinda',
        'skw-1-berau',
        'skw-2-tenggarong',
        'skw-3-balikpapan',
    ];

    /**
     * Pemetaan nama lokasi seeder BMN ke kode standar folder BKSDA Drive.
     */
    private const KNOWN_ROOM_CODES = [
        'urusan kepegawaian & umum' => 'ruang_tu',
        'urusan kepegawaian' => 'ruang_tu',
        'ruang tata usaha & kepegawaian' => 'ruang_tu',
        'urusan keuangan & bmn' => 'ruang_keuangan',
        'urusan keuangan' => 'ruang_keuangan',
        'ruang keuangan & bmn' => 'ruang_keuangan',
        'urusan perencanaan, kerjasama & kehumasan' => 'ruang_pevh',
        'urusan program dan perencanaan' => 'ruang_pevh',
        'ruang pevh & kerjasama' => 'ruang_pevh',
        'urusan teknis konservasi' => 'ruang_teknis',
        'urusan teknis' => 'ruang_teknis',
        'ruang teknis konservasi' => 'ruang_teknis',
        'ruang pelayanan & perizinan' => 'ruang_pelayanan',
        'ruang pelayanan & perizinan (ptsp)' => 'ruang_pelayanan',
        'ruang data & informasi (call center)' => 'ruang_server',
        'ruang server & data' => 'ruang_server',
        'ruang rapat utama' => 'ruang_rapat',
        'ruang rapat' => 'ruang_rapat',
        'gudang / logistik' => 'ruang_gudang',
    ];

    protected $table = 'bmn_locations';

    protected $fillable = [
        'parent_id',
        'location_type',
        'unit_kerja',
        'drive_unit_id',
        'name',
        'code',
        'description',
        'is_restricted',
        'is_active',
    ];

    protected $casts = [
        'is_restricted' => 'boolean',
        'is_active' => 'boolean',
        'drive_unit_id' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function driveUnit(): BelongsTo
    {
        return $this->belongsTo(DriveUnit::class, 'drive_unit_id');
    }

    public function driveFolders(): HasMany
    {
        return $this->hasMany(DriveFolder::class, 'location_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'location_id');
    }

    public function assets()
    {
        return $this->hasMany(Asset::class, 'lokasi_ruang', 'name');
    }

    public function effectiveUnitKerja(): string
    {
        if ($this->parent_id) {
            $parent = $this->relationLoaded('parent') ? $this->parent : $this->parent()->first();
            if ($parent) {
                return trim((string) ($parent->unit_kerja ?: $parent->name));
            }
        }

        return trim((string) ($this->unit_kerja ?: $this->name));
    }

    public function derivedResorCode(): ?string
    {
        if ($this->location_type !== self::TYPE_RESOR) {
            return null;
        }

        return $this->code ?: $this->name;
    }

    public function effectiveDriveUnitId(): ?int
    {
        if ($this->drive_unit_id) {
            return (int) $this->drive_unit_id;
        }

        if ($this->parent_id) {
            $parent = $this->relationLoaded('parent') ? $this->parent : $this->parent()->first();

            return $parent?->drive_unit_id ? (int) $parent->drive_unit_id : null;
        }

        return null;
    }

    public function folderScope(): string
    {
        return match ($this->location_type) {
            self::TYPE_RESOR => 'resor',
            self::TYPE_ROOM => 'ruangan',
            default => 'general',
        };
    }

    /**
     * Memetakan string satuan kerja / unit / resor ke slug kanonik unit BKSDA (`balai-samarinda`, `skw-1-berau`, dst).
     */
    public static function canonicalUnitSlug(?string $text): ?string
    {
        $raw = trim(strtolower((string) $text));
        if ($raw === '') {
            return null;
        }

        if (in_array($raw, self::UNIT_SLUGS, true)) {
            return $raw;
        }

        if (preg_match('/resor[_\s-]*0?(\d{1,2})/', $raw, $m)) {
            $code = 'resor_' . str_pad((string) (int) $m[1], 2, '0', STR_PAD_LEFT);
            if (isset(BksdaConstants::RESORS[$code]['skw_slug'])) {
                return BksdaConstants::RESORS[$code]['skw_slug'];
            }
        }

        if (preg_match('/\b(wilayah|wil|skw)[\s_-]*(iii|3)\b/', $raw) || str_contains($raw, 'balikpapan') || str_contains($raw, 'skw-3')) {
            return 'skw-3-balikpapan';
        }
        if (preg_match('/\b(wilayah|wil|skw)[\s_-]*(ii|2)\b/', $raw) || str_contains($raw, 'tenggarong') || str_contains($raw, 'skw-2')) {
            return 'skw-2-tenggarong';
        }
        if (preg_match('/\b(wilayah|wil|skw)[\s_-]*(i|1)\b/', $raw) || str_contains($raw, 'berau') || str_contains($raw, 'skw-1')) {
            return 'skw-1-berau';
        }
        if (str_contains($raw, 'balai')) {
            return 'balai-samarinda';
        }

        return null;
    }

    /**
     * Ekstrak kode resor standar (`resor_01`..`resor_14`) dari kode atau nama resor.
     */
    public static function extractResorCode(?string $value): ?string
    {
        $raw = trim(strtolower((string) $value));
        if ($raw === '') {
            return null;
        }

        if (preg_match('/^resor[_\s-]*0?(\d{1,2})\b/', $raw, $m)) {
            $code = 'resor_' . str_pad((string) (int) $m[1], 2, '0', STR_PAD_LEFT);

            return isset(BksdaConstants::RESORS[$code]) ? $code : null;
        }

        foreach (BksdaConstants::RESORS as $code => $meta) {
            if (str_contains($raw, strtolower($meta['name']))) {
                return $code;
            }
        }

        return null;
    }

    /**
     * Cari record Master Lokasi terbaik dari input payload pegawai / legacy string.
     */
    public static function resolveForPlacement(?string $locationId = null, ?string $satuanKerja = null, ?string $resor = null): ?self
    {
        if (! Schema::hasTable('bmn_locations')) {
            return null;
        }

        if ($locationId) {
            $found = static::with('parent')->find($locationId);
            if ($found) {
                return $found;
            }
        }

        $resorTrim = trim((string) $resor);
        if ($resorTrim !== '' && $resorTrim !== '-') {
            $lowerResor = strtolower($resorTrim);
            $byCode = static::with('parent')->whereRaw('LOWER(code) = ?', [$lowerResor])->first();
            if ($byCode) {
                return $byCode;
            }

            $resorCode = self::extractResorCode($resorTrim);
            if ($resorCode) {
                $byResorCode = static::with('parent')->where('code', $resorCode)->first();
                if ($byResorCode) {
                    return $byResorCode;
                }
            }

            $byName = static::with('parent')->whereRaw('LOWER(name) = ?', [$lowerResor])->first();
            if ($byName) {
                return $byName;
            }
        }

        $satkerTrim = trim((string) $satuanKerja);
        if ($satkerTrim !== '') {
            $lowerSatker = strtolower($satkerTrim);
            $exact = static::with('parent')
                ->where(function ($q) use ($lowerSatker) {
                    $q->whereRaw('LOWER(name) = ?', [$lowerSatker])
                        ->orWhere(function ($q2) use ($lowerSatker) {
                            $q2->whereNull('parent_id')->whereRaw('LOWER(unit_kerja) = ?', [$lowerSatker]);
                        });
                })
                ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
                ->first();
            if ($exact) {
                return $exact;
            }

            $slug = self::canonicalUnitSlug($satkerTrim);
            if ($slug) {
                $bySlug = static::with('parent')->where('code', $slug)->first();
                if ($bySlug) {
                    return $bySlug;
                }
            }
        }

        return null;
    }

    /**
     * Buat atau perbarui DriveFolder (beserta turunannya) agar selalu sinkron dengan Master Lokasi.
     */
    public function syncDriveFolder(?int $actorUserId = null): ?DriveFolder
    {
        if (! Schema::hasTable('drive_folders') || ! Schema::hasColumn('drive_folders', 'location_id')) {
            return null;
        }

        $driveUnitId = $this->effectiveDriveUnitId();
        if (! $driveUnitId || ! in_array($this->location_type, [self::TYPE_ROOM, self::TYPE_RESOR], true)) {
            return null;
        }

        $ownerId = $actorUserId ?: self::resolveSystemOwnerId();
        if (! $ownerId) {
            return null;
        }

        $folderName = preg_replace('/[\\\\\\/:\*\?"<>\|]/', '-', trim((string) $this->name));
        $folderName = trim((string) preg_replace('/\s+/', ' ', (string) $folderName)) ?: 'Folder';
        $resorCode = $this->location_type === self::TYPE_RESOR ? $this->code : null;
        $roomCode = $this->location_type === self::TYPE_ROOM ? $this->code : null;
        $scope = $this->folderScope();

        $folder = DriveFolder::withTrashed()
            ->where('location_id', $this->id)
            ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('id')
            ->first();

        if (! $folder && ($resorCode || $roomCode)) {
            $folder = DriveFolder::withTrashed()
                ->where(function ($q) use ($resorCode, $roomCode) {
                    if ($resorCode) {
                        $q->where('resor_code', $resorCode);
                    }
                    if ($roomCode) {
                        $q->orWhere('room_code', $roomCode);
                    }
                })
                ->whereNull('parent_id')
                ->first();
        }

        if (! $folder) {
            $folder = DriveFolder::create([
                'unit_id' => $driveUnitId,
                'location_id' => $this->id,
                'user_id' => $ownerId,
                'parent_id' => null,
                'name' => $folderName,
                'is_restricted' => (bool) $this->is_restricted,
                'folder_scope' => $scope,
                'resor_code' => $resorCode,
                'room_code' => $roomCode,
            ]);
        } else {
            $oldUnitId = (int) $folder->unit_id;
            $folder->update([
                'unit_id' => $driveUnitId,
                'location_id' => $this->id,
                'name' => $folderName,
                'is_restricted' => (bool) $this->is_restricted,
                'folder_scope' => $scope,
                'resor_code' => $resorCode,
                'room_code' => $roomCode,
            ]);

            $descendantIds = DriveFolder::collectDescendantIds($folder->id, withTrashed: true);
            $allFolderIds = array_merge([$folder->id], $descendantIds);

            if (! empty($descendantIds)) {
                DriveFolder::withTrashed()->whereIn('id', $descendantIds)->update([
                    'unit_id' => $driveUnitId,
                    'location_id' => $this->id,
                    'is_restricted' => (bool) $this->is_restricted,
                    'folder_scope' => $scope,
                    'resor_code' => $resorCode,
                    'room_code' => $roomCode,
                ]);
            }

            if ($oldUnitId !== $driveUnitId || Schema::hasTable('drive_files')) {
                DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->update([
                    'unit_id' => $driveUnitId,
                ]);
            }
        }

        return $folder;
    }

    public static function resolveSystemOwnerId(): ?int
    {
        if (! Schema::hasTable('users')) {
            return null;
        }

        return User::where('role', 'super_admin')->orderBy('id')->value('id')
            ?? User::orderBy('id')->value('id');
    }

    /**
     * Backfill hierarki Level 1 -> Level 2, Drive links, dan employee location_id secara idempoten.
     */
    public static function syncHierarchyAndBackfill(): void
    {
        if (! Schema::hasTable('bmn_locations') || ! Schema::hasColumn('bmn_locations', 'location_type')) {
            return;
        }

        $unitIdsBySlug = Schema::hasTable('drive_units')
            ? DriveUnit::pluck('id', 'slug')->all()
            : [];

        $locations = static::all();
        $parentsBySlug = [];
        $parentsByUnitKerja = [];

        // 1. Klasifikasi & lengkapi Level-1 (balai / seksi)
        foreach ($locations as $loc) {
            $lowerName = strtolower(trim((string) $loc->name));
            $lowerUk = strtolower(trim((string) $loc->unit_kerja));

            $isBalaiRoot = str_starts_with($lowerName, 'kantor balai') || $lowerName === 'balai ksda kalimantan timur';
            $isSeksiRoot = str_starts_with($lowerName, 'seksi ') || str_starts_with($lowerName, 'skw ');

            if ($isBalaiRoot || $isSeksiRoot || in_array($loc->location_type, [self::TYPE_BALAI, self::TYPE_SEKSI], true)) {
                $type = $isBalaiRoot || $loc->location_type === self::TYPE_BALAI ? self::TYPE_BALAI : self::TYPE_SEKSI;
                $slug = $loc->code ?: self::canonicalUnitSlug($loc->name . ' ' . $loc->unit_kerja);
                if (! $slug && $type === self::TYPE_SEKSI) {
                    $slug = Str::slug($loc->name);
                }

                $driveUnitId = $loc->drive_unit_id ?: ($slug ? ($unitIdsBySlug[$slug] ?? null) : null);

                $updates = ['location_type' => $type, 'parent_id' => null];
                if ($slug && ! $loc->code && ! static::where('code', $slug)->where('id', '!=', $loc->id)->exists()) {
                    $updates['code'] = $slug;
                }
                if ($driveUnitId && ! $loc->drive_unit_id) {
                    $updates['drive_unit_id'] = $driveUnitId;
                }
                $loc->update($updates);

                if ($slug) {
                    $parentsBySlug[$slug] = $loc;
                }
                if ($lowerUk !== '') {
                    $parentsByUnitKerja[$lowerUk] = $loc;
                }
                $parentsByUnitKerja[$lowerName] = $loc;
            }
        }

        // 2. Hubungkan Level-2 (room / resor) ke parent Level-1 & kode kanoniknya
        foreach ($locations as $loc) {
            if (in_array($loc->location_type, [self::TYPE_BALAI, self::TYPE_SEKSI], true) && ! $loc->parent_id) {
                continue;
            }

            $lowerName = strtolower(trim((string) $loc->name));
            $lowerUk = strtolower(trim((string) $loc->unit_kerja));
            $resorCode = self::extractResorCode($loc->code ?: $loc->name);
            $isResor = $loc->location_type === self::TYPE_RESOR || $resorCode !== null || str_starts_with($lowerName, 'resor ');

            $parent = $loc->parent_id ? $locations->firstWhere('id', $loc->parent_id) : null;
            if (! $parent && $resorCode && isset(BksdaConstants::RESORS[$resorCode])) {
                $parent = $parentsBySlug[BksdaConstants::RESORS[$resorCode]['skw_slug']] ?? null;
            }
            if (! $parent && $lowerUk !== '') {
                $parent = $parentsByUnitKerja[$lowerUk] ?? null;
                if (! $parent) {
                    $slug = self::canonicalUnitSlug($loc->unit_kerja);
                    $parent = $slug ? ($parentsBySlug[$slug] ?? null) : null;
                }
            }

            $code = $loc->code;
            if (! $code) {
                $code = $resorCode
                    ?: (self::KNOWN_ROOM_CODES[$lowerName]
                        ?? ($isResor || $lowerName === '' ? null : str_replace('-', '_', Str::slug($lowerName))));
            }

            $updates = [
                'location_type' => $isResor ? self::TYPE_RESOR : self::TYPE_ROOM,
            ];
            if ($parent && ! $loc->parent_id) {
                $updates['parent_id'] = $parent->id;
            }
            $effectiveParent = $parent;
            if ($effectiveParent && $effectiveParent->drive_unit_id && ! $loc->drive_unit_id) {
                $updates['drive_unit_id'] = $effectiveParent->drive_unit_id;
            }
            if ($code && ! $loc->code && ! static::where('code', $code)->where('id', '!=', $loc->id)->exists()) {
                $updates['code'] = $code;
            }
            if ($isResor && ! $loc->is_restricted) {
                $updates['is_restricted'] = true;
            }

            $loc->update($updates);
        }

        // 3. Backfill drive_folders.location_id & turunan folder
        if (Schema::hasTable('drive_folders') && Schema::hasColumn('drive_folders', 'location_id')) {
            $freshLocations = static::all();
            $byCode = $freshLocations->whereNotNull('code')->keyBy(fn ($l) => strtolower((string) $l->code));
            $byName = $freshLocations->keyBy(fn ($l) => strtolower(trim((string) $l->name)));

            $rootFolders = DB::table('drive_folders')->whereNull('parent_id')->get();
            foreach ($rootFolders as $folder) {
                if ($folder->location_id) {
                    continue;
                }
                $matched = null;
                if ($folder->resor_code) {
                    $matched = $byCode->get(strtolower((string) $folder->resor_code));
                }
                if (! $matched && $folder->room_code) {
                    $matched = $byCode->get(strtolower((string) $folder->room_code));
                }
                if (! $matched) {
                    $matched = $byName->get(strtolower(trim((string) $folder->name)));
                }
                if (! $matched && str_starts_with(strtolower((string) $folder->name), 'berkas umum & koordinasi')) {
                    $matched = $freshLocations->firstWhere('drive_unit_id', $folder->unit_id);
                }

                if ($matched) {
                    DB::table('drive_folders')->where('id', $folder->id)->update(['location_id' => $matched->id]);
                    $descIds = DriveFolder::collectDescendantIds((int) $folder->id, withTrashed: true);
                    if (! empty($descIds)) {
                        DB::table('drive_folders')->whereIn('id', $descIds)->update([
                            'location_id' => $matched->id,
                            'is_restricted' => (bool) $folder->is_restricted,
                            'folder_scope' => $folder->folder_scope,
                            'resor_code' => $folder->resor_code,
                            'room_code' => $folder->room_code,
                        ]);
                    }
                }
            }

            // Pastikan Berkas Umum & Koordinasi Balai tersedia jika Balai DriveUnit ada
            $balaiUnitId = $unitIdsBySlug['balai-samarinda'] ?? null;
            $balaiLoc = $freshLocations->firstWhere('code', 'balai-samarinda');
            $ownerId = self::resolveSystemOwnerId();
            if ($balaiUnitId && $ownerId && ! DB::table('drive_folders')->where('unit_id', $balaiUnitId)->where('name', 'Berkas Umum & Koordinasi Balai')->exists()) {
                DB::table('drive_folders')->insert([
                    'unit_id' => $balaiUnitId,
                    'location_id' => $balaiLoc?->id,
                    'user_id' => $ownerId,
                    'parent_id' => null,
                    'name' => 'Berkas Umum & Koordinasi Balai',
                    'is_restricted' => false,
                    'folder_scope' => 'umum',
                    'resor_code' => null,
                    'room_code' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 4. Backfill kpg_employees.location_id
        if (Schema::hasTable('kpg_employees') && Schema::hasColumn('kpg_employees', 'location_id') && $locations->isNotEmpty()) {
            $employees = DB::table('kpg_employees')->whereNull('location_id')->select(['id', 'satuan_kerja', 'resor'])->get();
            foreach ($employees as $emp) {
                $resolved = self::resolveForPlacement(null, $emp->satuan_kerja, $emp->resor);
                if ($resolved) {
                    DB::table('kpg_employees')->where('id', $emp->id)->update(['location_id' => $resolved->id]);
                }
            }
        }
    }
}
