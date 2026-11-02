<?php

namespace App\Support\Security;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

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
            self::$employeeCache[$user] = Employee::where('nip', $user->username)->first();
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

        // 2. Cek kecocokan otomatis berdasarkan Satuan Kerja Pegawai
        $employee = self::getEmployee($user);
        if ($employee && ! empty($employee->satuan_kerja)) {
            $sk = strtolower((string) $employee->satuan_kerja);
            $slug = strtolower((string) $unit->slug);

            if (
                ($slug === 'balai-samarinda' && (str_contains($sk, 'balai') || str_contains($sk, 'samarinda'))) ||
                ($slug === 'skw-1-berau' && (str_contains($sk, 'wilayah i') || str_contains($sk, 'skw i') || str_contains($sk, 'berau'))) ||
                ($slug === 'skw-2-tenggarong' && (str_contains($sk, 'wilayah ii') || str_contains($sk, 'skw ii') || str_contains($sk, 'tenggarong'))) ||
                ($slug === 'skw-3-balikpapan' && (str_contains($sk, 'wilayah iii') || str_contains($sk, 'skw iii') || str_contains($sk, 'balikpapan')))
            ) {
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
     * Otorisasi Membaca Folder (dengan isolasi folder resor/ruangan dan anti-bypass)
     */
    public static function canReadFolder(User $user, DriveFolder $folder): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        // Pemilik / Admin Resor yang ditunjuk berhak membaca
        if ($folder->user_id === $user->id) {
            return true;
        }

        // Jika folder terisolasi (Resor / Ruangan Tertutup)
        if ($folder->is_restricted) {
            // 1. Cek izin eksplisit di tabel drive_shares
            $userUnitIds = self::getUserUnitIds($user);
            $hasShare = DriveShare::where('folder_id', $folder->id)
                ->where(function ($q) use ($user, $userUnitIds) {
                    $q->where('user_id', $user->id)->orWhereIn('unit_id', $userUnitIds);
                })
                ->exists();

            if ($hasShare) {
                return true;
            }

            // 2. Cek kecocokan otomatis penempatan resor pegawai
            if ($folder->resor_code) {
                $employee = self::getEmployee($user);
                return $employee && (string) $employee->resor === (string) $folder->resor_code;
            }

            return false;
        }

        // Folder umum: warisi hak akses unit
        if ($folder->unit_id) {
            $unit = $folder->unit ?? DriveUnit::find($folder->unit_id);
            return $unit ? self::canRead($user, $unit) : false;
        }

        // Folder drive pribadi: hanya milik user
        return $folder->user_id === $user->id;
    }

    /**
     * Otorisasi Menulis Folder (dengan isolasi folder resor/ruangan)
     */
    public static function canWriteFolder(User $user, DriveFolder $folder): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        if ($folder->user_id === $user->id) {
            return true;
        }

        if ($folder->is_restricted) {
            $userUnitIds = self::getUserUnitIds($user);
            $share = DriveShare::where('folder_id', $folder->id)
                ->where(function ($q) use ($user, $userUnitIds) {
                    $q->where('user_id', $user->id)->orWhereIn('unit_id', $userUnitIds);
                })
                ->first();

            if ($share && in_array($share->role, ['manager', 'editor'], true)) {
                return true;
            }

            if ($folder->resor_code) {
                $employee = self::getEmployee($user);
                return $employee && (string) $employee->resor === (string) $folder->resor_code;
            }

            return false;
        }

        if ($folder->unit_id) {
            $unit = $folder->unit ?? DriveUnit::find($folder->unit_id);
            return $unit ? self::canWrite($user, $unit) : false;
        }

        return $folder->user_id === $user->id;
    }

    /**
     * Otorisasi Membaca Berkas (Anti-IDOR: memeriksa folder induk jika terisolasi)
     */
    public static function canReadFile(User $user, DriveFile $file): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        // Pemilik berkas selalu berhak membaca berkasnya
        if ($file->user_id === $user->id) {
            return true;
        }

        // Anti-IDOR: Jika berkas berada di dalam folder, wajib memvalidasi izin folder induknya!
        if ($file->folder_id) {
            $folder = $file->folder ?? DriveFolder::find($file->folder_id);
            if ($folder) {
                if (! self::canReadFolder($user, $folder)) {
                    return false;
                }
                return true;
            }
        }

        if ($file->unit_id) {
            $unit = $file->unit ?? DriveUnit::find($file->unit_id);
            return $unit ? self::canRead($user, $unit) : false;
        }

        return $file->shares()->where('user_id', $user->id)->exists();
    }

    /**
     * Otorisasi Menulis/Mengelola Berkas (Anti-IDOR: memeriksa folder induk jika terisolasi)
     */
    public static function canWriteFile(User $user, DriveFile $file): bool
    {
        if (self::isDriveAdmin($user)) {
            return true;
        }

        if ($file->user_id === $user->id) {
            return true;
        }

        if ($file->folder_id) {
            $folder = $file->folder ?? DriveFolder::find($file->folder_id);
            if ($folder) {
                return self::canWriteFolder($user, $folder);
            }
        }

        if ($file->unit_id) {
            $unit = $file->unit ?? DriveUnit::find($file->unit_id);
            return $unit ? self::canWrite($user, $unit) : false;
        }

        return false;
    }
}
