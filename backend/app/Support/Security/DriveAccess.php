<?php

namespace App\Support\Security;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Bmn\Models\Location;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Facades\DB;

/**
 * Pengatur Hak Akses (RBAC) BKSDA Drive.
 * Mendukung hirarki: super_admin / Admin Drive -> folder owner/admin resor -> anggota eksplisit -> auto-match satuan kerja/resor.
 */
class DriveAccess
{
    private static ?\WeakMap $employeeCache = null;
    private static ?\WeakMap $unitIdsCache = null;

    public static function clearCache(?User $user = null): void
    {
        if ($user) {
            if (self::$employeeCache !== null) unset(self::$employeeCache[$user]);
            if (self::$unitIdsCache !== null) unset(self::$unitIdsCache[$user]);
        } else {
            self::$employeeCache = new \WeakMap();
            self::$unitIdsCache = new \WeakMap();
        }
    }

    /**
     * Memoize pencarian profil pegawai per instance user untuk menghindari N+1 query.
     */
    public static function getEmployee(User $user): ?Employee
    {
        if (self::$employeeCache === null) {
            self::$employeeCache = new \WeakMap();
        }
        if (! isset(self::$employeeCache[$user])) {
            self::$employeeCache[$user] = Employee::with('location.parent')
                ->where('nip', $user->username)
                ->effectiveActive()
                ->first();
        }
        return self::$employeeCache[$user];
    }

    public static function isDriveAdmin(User $user): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        $modules = $user->access_modules ?? [];
        return is_array($modules) && in_array('drive', $modules, true);
    }

    public static function unitRole(User $user, DriveUnit $unit): ?string
    {
        if (self::isDriveAdmin($user)) {
            return 'manager';
        }

        // 1. Cek penugasan eksplisit di tabel drive_unit_members
        $member = $unit->members()->where('user_id', $user->id)->first();
        if ($member && $member->pivot?->role) {
            return $member->pivot->role;
        }

        // 2. Cek kecocokan otomatis berdasarkan penempatan Master Lokasi / Satuan Kerja Pegawai
        $employee = self::getEmployee($user);
        if ($employee) {
            $empUnitId = self::resolveEmployeeDriveUnitId($employee);
            if ($empUnitId && (int) $empUnitId === (int) $unit->id) {
                return 'editor';
            }

            $empSlug = self::resolveEmployeeUnitSlug($employee);
            if ($empSlug !== null && strtolower((string) $unit->slug) === $empSlug) {
                return 'editor';
            }
        }

        return null;
    }

    public static function canRead(User $user, DriveUnit $unit): bool
    {
        return self::unitRole($user, $unit) !== null;
    }

    public static function canWrite(User $user, DriveUnit $unit): bool
    {
        $role = self::unitRole($user, $unit);
        return in_array($role, ['manager', 'editor'], true);
    }

    public static function canManage(User $user, DriveUnit $unit): bool
    {
        return self::unitRole($user, $unit) === 'manager';
    }

    /**
     * Memoize ID unit kerja yang dapat diakses pengguna.
     */
    public static function getUserUnitIds(User $user): \Illuminate\Support\Collection
    {
        if (self::$unitIdsCache === null) {
            self::$unitIdsCache = new \WeakMap();
        }
        if (! isset(self::$unitIdsCache[$user])) {
            self::$unitIdsCache[$user] = DriveUnit::all()->filter(fn($u) => self::unitRole($user, $u) !== null)->pluck('id');
        }
        return self::$unitIdsCache[$user];
    }

    /**
     * Otorisasi Membaca Folder (dengan isolasi folder resor/ruangan dan anti-bypass).
     */
    public static function canReadFolder(User $user, DriveFolder $folder): bool
    {
        return self::checkFolderAccess($user, $folder, write: false);
    }

    /**
     * Otorisasi Menulis Folder (dengan isolasi folder resor/ruangan).
     */
    public static function canWriteFolder(User $user, DriveFolder $folder): bool
    {
        return self::checkFolderAccess($user, $folder, write: true);
    }

    private static function checkFolderAccess(User $user, DriveFolder $folder, bool $write): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        if (self::canUseCreatorOwnershipBypass($user, (int) $folder->user_id, $folder->unit_id ? (int) $folder->unit_id : null, $folder)) {
            return true;
        }

        // Personal My Drive (unit_id null): hanya pemilik atau penerima share langsung
        if ($folder->unit_id === null) {
            return self::hasInternalFolderShare($user, $folder, $write);
        }

        $unit = $folder->unit ?? DriveUnit::find($folder->unit_id);
        $isExplicitManager = $unit && $unit->members()
            ->where('user_id', $user->id)
            ->wherePivot('role', 'manager')
            ->exists();

        if ($folder->is_restricted) {
            if ($isExplicitManager) {
                return true;
            }

            if (self::hasInternalFolderShare($user, $folder, $write)) {
                return true;
            }

            $employee = self::getEmployee($user);
            if (! $employee) {
                return false;
            }

            // Penempatan Master Lokasi sebagai sumber utama RBAC ruangan/resor terbatas
            if ($folder->location_id && $employee->location_id) {
                return (string) $employee->location_id === (string) $folder->location_id;
            }

            if ($folder->resor_code) {
                $empResorCode = Location::extractResorCode($employee->resor) ?? trim((string) $employee->resor);
                return $empResorCode !== '' && strcasecmp($empResorCode, (string) $folder->resor_code) === 0;
            }

            if ($folder->room_code) {
                $empRoomCode = $employee->location?->code;
                return $empRoomCode !== null && strcasecmp((string) $empRoomCode, (string) $folder->room_code) === 0;
            }

            return false;
        }

        if ($unit && ($write ? self::canWrite($user, $unit) : self::canRead($user, $unit))) {
            return true;
        }

        return self::hasInternalFolderShare($user, $folder, $write);
    }

    private static function hasInternalFolderShare(User $user, DriveFolder $folder, bool $write): bool
    {
        $userUnitIds = self::getUserUnitIds($user);

        return DriveShare::where('folder_id', $folder->id)
            ->where('share_type', 'internal')
            ->when($write, fn ($q) => $q->whereIn('role', ['manager', 'editor']))
            ->where(function ($q) use ($user, $userUnitIds) {
                $q->where('user_id', $user->id);
                if ($userUnitIds->isNotEmpty()) {
                    $q->orWhereIn('unit_id', $userUnitIds);
                }
            })
            ->exists();
    }

    /**
     * Otorisasi Membaca Berkas (Anti-IDOR: memeriksa folder induk jika terisolasi).
     */
    public static function canReadFile(User $user, DriveFile $file): bool
    {
        return self::checkFileAccess($user, $file, write: false);
    }

    /**
     * Otorisasi Menulis/Mengelola Berkas (Anti-IDOR: memeriksa folder induk jika terisolasi).
     */
    public static function canWriteFile(User $user, DriveFile $file): bool
    {
        return self::checkFileAccess($user, $file, write: true);
    }

    private static function checkFileAccess(User $user, DriveFile $file, bool $write): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        $folder = $file->folder_id ? ($file->folder ?? DriveFolder::withTrashed()->find($file->folder_id)) : null;

        if (self::canUseCreatorOwnershipBypass(
            $user,
            (int) $file->user_id,
            $file->unit_id ? (int) $file->unit_id : ($folder?->unit_id ? (int) $folder->unit_id : null),
            $folder
        )) {
            return true;
        }

        $userUnitIds = self::getUserUnitIds($user);
        $hasDirectShare = $file->shares()
            ->where('share_type', 'internal')
            ->when($write, fn ($q) => $q->whereIn('role', ['manager', 'editor']))
            ->where(function ($q) use ($user, $userUnitIds) {
                $q->where('user_id', $user->id);
                if ($userUnitIds->isNotEmpty()) {
                    $q->orWhereIn('unit_id', $userUnitIds);
                }
            })
            ->exists();

        if ($hasDirectShare) {
            return true;
        }

        if ($folder) {
            return self::checkFolderAccess($user, $folder, $write);
        }

        if ($file->unit_id) {
            $unit = $file->unit ?? DriveUnit::find($file->unit_id);
            return $unit ? ($write ? self::canWrite($user, $unit) : self::canRead($user, $unit)) : false;
        }

        return false;
    }

    /**
     * Kepemilikan user_id berlaku penuh di My Drive pribadi, serta untuk akun tanpa profil pegawai konflik.
     * Bagi pegawai aktif/nonaktif, mutasi penempatan atau lokasi terbatas tetap mencabut akses organisasi lama.
     */
    private static function canUseCreatorOwnershipBypass(User $user, int $ownerUserId, ?int $unitId, ?DriveFolder $scopeFolder = null): bool
    {
        if ($ownerUserId !== (int) $user->id || ! $user->is_active) {
            return false;
        }

        if ($unitId === null && $scopeFolder === null) {
            return true;
        }

        $employeeExists = ! empty($user->username) && Employee::where('nip', $user->username)->exists();
        if (! $employeeExists) {
            return true;
        }

        $activeEmployee = self::getEmployee($user);
        if (! $activeEmployee) {
            return false;
        }

        if ($scopeFolder && $scopeFolder->is_restricted
            && ($scopeFolder->location_id || $scopeFolder->resor_code || $scopeFolder->room_code)) {
            return false;
        }

        if ($unitId !== null) {
            $empUnitId = self::resolveEmployeeDriveUnitId($activeEmployee);
            if ($empUnitId !== null && $empUnitId !== $unitId) {
                return false;
            }

            $empSlug = self::resolveEmployeeUnitSlug($activeEmployee);
            $unitSlug = strtolower((string) DriveUnit::where('id', $unitId)->value('slug'));
            if ($empSlug !== null && $unitSlug !== '' && $empSlug !== $unitSlug) {
                return false;
            }
        }

        return true;
    }

    /**
     * Sinkronkan hak akses & cabut akses lama secara atomik saat pegawai dimutasi/dinonaktifkan.
     */
    public static function syncEmployeePlacement(Employee $employee, array $oldPlacement = [], ?User $explicitUser = null): void
    {
        $employee->loadMissing('location.parent');
        $nip = trim((string) $employee->nip);
        $user = $explicitUser ?? ($nip !== '' ? User::where('username', $nip)->first() : null);

        self::clearCache();

        if (! $user) {
            return;
        }

        $isActive = $employee->isEffectiveActive();
        $newUnitId = $isActive ? self::resolveEmployeeDriveUnitId($employee) : null;
        if ($isActive && ! $newUnitId && ($slug = self::resolveEmployeeUnitSlug($employee))) {
            $newUnitId = DriveUnit::where('slug', $slug)->value('id');
        }
        $newLocationId = $isActive ? $employee->location_id : null;

        $oldLocationId = $oldPlacement['location_id'] ?? null;
        $oldResor = $oldPlacement['resor'] ?? null;
        $oldSatker = $oldPlacement['satuan_kerja'] ?? null;
        $oldUnitId = $oldPlacement['drive_unit_id'] ?? null;
        if (! $oldUnitId && $oldLocationId) {
            $oldUnitId = Location::with('parent')->find($oldLocationId)?->effectiveDriveUnitId();
        }
        if (! $oldUnitId && ($oldSlug = Location::canonicalUnitSlug($oldResor) ?? Location::canonicalUnitSlug($oldSatker))) {
            $oldUnitId = DriveUnit::where('slug', $oldSlug)->value('id');
        }

        if (! $isActive) {
            DB::table('drive_unit_members')->where('user_id', $user->id)->delete();
            self::revokeUserOrgSharesAndFolderOwnership($user->id, null, null);
            self::clearCache();
            return;
        }

        $unitChanged = $oldUnitId && (int) $oldUnitId !== (int) $newUnitId;
        $locChanged = ($oldLocationId && (string) $oldLocationId !== (string) $newLocationId)
            || ($oldResor && strcasecmp((string) $oldResor, (string) $employee->resor) !== 0);

        if ($unitChanged) {
            DB::table('drive_unit_members')
                ->where('user_id', $user->id)
                ->where('drive_unit_id', (int) $oldUnitId)
                ->delete();
        }

        if ($unitChanged || $locChanged) {
            self::revokeUserOrgSharesAndFolderOwnership(
                $user->id,
                $unitChanged ? (int) $oldUnitId : null,
                $oldLocationId ? (string) $oldLocationId : null,
                $oldResor ? (string) $oldResor : null
            );
        }

        self::clearCache();
    }

    private static function revokeUserOrgSharesAndFolderOwnership(
        int $userId,
        ?int $oldUnitId,
        ?string $oldLocationId,
        ?string $oldResor = null
    ): void {
        if ($oldUnitId === null && $oldLocationId === null && $oldResor === null) {
            // Nonaktif penuh: cabut seluruh share internal & ownership folder organisasi (unit_id IS NOT NULL)
            $orgFolderIds = DriveFolder::withTrashed()->whereNotNull('unit_id')->pluck('id')->all();
            if (! empty($orgFolderIds)) {
                DriveShare::where('user_id', $userId)->whereIn('folder_id', $orgFolderIds)->delete();
                if ($ownerId = Location::resolveSystemOwnerId()) {
                    DriveFolder::withTrashed()
                        ->whereIn('id', $orgFolderIds)
                        ->where('user_id', $userId)
                        ->update(['user_id' => $ownerId]);
                }
            }
            $orgFileIds = DriveFile::withTrashed()->whereNotNull('unit_id')->pluck('id')->all();
            if (! empty($orgFileIds)) {
                DriveShare::where('user_id', $userId)->whereIn('file_id', $orgFileIds)->delete();
            }
            return;
        }

        $rootQuery = DriveFolder::withTrashed()->whereNotNull('unit_id');
        $rootQuery->where(function ($q) use ($oldUnitId, $oldLocationId, $oldResor) {
            if ($oldUnitId) {
                $q->orWhere('unit_id', $oldUnitId);
            }
            if ($oldLocationId) {
                $q->orWhere('location_id', $oldLocationId);
            }
            if ($oldResor) {
                $q->orWhere('resor_code', $oldResor);
            }
        });

        $rootIds = $rootQuery->pluck('id')->all();
        $descendantIds = ! empty($rootIds) ? DriveFolder::collectDescendantIds($rootIds, withTrashed: true) : [];
        $targetFolderIds = array_values(array_unique(array_merge($rootIds, $descendantIds)));

        if (! empty($targetFolderIds)) {
            DriveShare::where('user_id', $userId)->whereIn('folder_id', $targetFolderIds)->delete();
            if ($ownerId = Location::resolveSystemOwnerId()) {
                DriveFolder::withTrashed()
                    ->whereIn('id', $targetFolderIds)
                    ->where('user_id', $userId)
                    ->update(['user_id' => $ownerId]);
            }
        }

        $fileIds = [];
        if (! empty($targetFolderIds)) {
            $fileIds = DriveFile::withTrashed()->whereIn('folder_id', $targetFolderIds)->pluck('id')->all();
        }
        if ($oldUnitId) {
            $unitRootFileIds = DriveFile::withTrashed()
                ->where('unit_id', $oldUnitId)
                ->whereNull('folder_id')
                ->pluck('id')
                ->all();
            $fileIds = array_values(array_unique(array_merge($fileIds, $unitRootFileIds)));
        }

        if (! empty($fileIds)) {
            DriveShare::where('user_id', $userId)->whereIn('file_id', $fileIds)->delete();
        }
    }

    private static function resolveEmployeeDriveUnitId(Employee $employee): ?int
    {
        if ($employee->location_id) {
            $loc = $employee->relationLoaded('location')
                ? $employee->location
                : Location::with('parent')->find($employee->location_id);
            if ($loc) {
                return $loc->effectiveDriveUnitId();
            }
        }

        return null;
    }

    private static function resolveEmployeeUnitSlug(Employee $employee): ?string
    {
        if (! empty($employee->resor)) {
            $byResor = Location::canonicalUnitSlug($employee->resor);
            if ($byResor !== null) {
                return $byResor;
            }
        }

        return Location::canonicalUnitSlug($employee->satuan_kerja);
    }
}
