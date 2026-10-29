<?php

namespace App\Support\Security;

use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

/**
 * Pengatur Hak Akses (RBAC) BKSDA Drive.
 * Mendukung hirarki: super_admin (manager di semua unit) -> anggota eksplisit -> auto-match satuan kerja.
 */
class DriveAccess
{
    public static function unitRole(User $user, DriveUnit $unit): ?string
    {
        if ($user->role === 'super_admin') {
            return 'manager';
        }

        // 1. Cek penugasan eksplisit di tabel drive_unit_members
        $member = $unit->members()->where('user_id', $user->id)->first();
        if ($member && $member->pivot?->role) {
            return $member->pivot->role;
        }

        // 2. Cek kecocokan otomatis berdasarkan Satuan Kerja Pegawai
        $employee = Employee::where('nip', $user->username)->first();
        if ($employee && ! empty($employee->satuan_kerja)) {
            $sk = strtolower((string) $employee->satuan_kerja);
            $slug = strtolower((string) $unit->slug);

            if (
                ($slug === 'balai-samarinda' && (str_contains($sk, 'balai') || str_contains($sk, 'samarinda'))) ||
                ($slug === 'skw-1-berau' && (str_contains($sk, 'wilayah i') || str_contains($sk, 'skw i') || str_contains($sk, 'berau'))) ||
                ($slug === 'skw-2-tenggarong' && (str_contains($sk, 'wilayah ii') || str_contains($sk, 'skw ii') || str_contains($sk, 'tenggarong'))) ||
                ($slug === 'skw-3-balikpapan' && (str_contains($sk, 'wilayah iii') || str_contains($sk, 'skw iii') || str_contains($sk, 'balikpapan'))) ||
                ($slug === 'resor-bontang' && str_contains($sk, 'bontang')) ||
                ($slug === 'resor-kutim' && (str_contains($sk, 'kutim') || str_contains($sk, 'kutai timur'))) ||
                ($slug === 'resor-ppu' && (str_contains($sk, 'ppu') || str_contains($sk, 'penajam'))) ||
                ($slug === 'resor-kubar' && (str_contains($sk, 'kubar') || str_contains($sk, 'kutai barat'))) ||
                ($slug === 'resor-paser' && str_contains($sk, 'paser'))
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

    public static function canReadFile(User $user, \App\Models\DriveFile $file): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($file->unit_id) {
            $unit = $file->unit ?? DriveUnit::find($file->unit_id);
            return $unit ? self::canRead($user, $unit) : false;
        }

        if ($file->user_id === $user->id) {
            return true;
        }

        return $file->shares()->where('user_id', $user->id)->exists();
    }

    public static function canWriteFile(User $user, \App\Models\DriveFile $file): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($file->unit_id) {
            $unit = $file->unit ?? DriveUnit::find($file->unit_id);
            return $unit ? self::canWrite($user, $unit) : false;
        }

        return $file->user_id === $user->id;
    }
}
