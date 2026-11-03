<?php

namespace App\Modules\Agent\Services;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Facades\DB;

class PhoneSanitizerService
{
    /**
     * Membersihkan string telepon dan menyisakan angka saja.
     */
    public static function cleanDigits(string $phone): string
    {
        // Hapus akhiran WhatsApp JID jika ada
        $phone = preg_replace('/@.*$/', '', $phone);
        // Hapus semua karakter non-angka
        return preg_replace('/[^0-9]/', '', $phone) ?? '';
    }

    /**
     * Konversi ke format kanonikal E.164 (+628xxxxxxxxxx).
     */
    public static function toCanonicalE164(string $phone): string
    {
        $digits = self::cleanDigits($phone);

        if (str_starts_with($digits, '08')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62' . $digits;
        }

        return '+' . $digits;
    }

    /**
     * Ambil 9-10 digit terakhir untuk pencocokan fleksibel jika database menyimpan format strip/spasi.
     */
    public static function getTrailingDigits(string $phone, int $len = 9): string
    {
        $digits = self::cleanDigits($phone);
        return strlen($digits) >= $len ? substr($digits, -$len) : $digits;
    }

    /**
     * Cari pegawai berdasarkan nomor WhatsApp dengan toleransi format.
     */
    public static function findEmployeeByPhone(string $phone): ?Employee
    {
        $clean = self::cleanDigits($phone);
        if (empty($clean) || strlen($clean) < 7) {
            return null;
        }

        $canonical = self::toCanonicalE164($phone);
        $canonicalWithoutPlus = ltrim($canonical, '+');
        $trailing = self::getTrailingDigits($phone, 9);

        // 1. Coba pencocokan langsung di kpg_employees
        $employee = Employee::where('is_active', true)
            ->where(function ($q) use ($phone, $canonical, $canonicalWithoutPlus, $trailing) {
                $q->where('telepon', $phone)
                  ->orWhere('telepon', $canonical)
                  ->orWhere('telepon', $canonicalWithoutPlus)
                  ->orWhere('telepon', 'LIKE', '%' . $trailing . '%');
            })
            ->first();

        if ($employee) {
            return $employee;
        }

        // 2. Fallback: Cari di riwayat permohonan cuti terakhir yang pernah diajukan
        $leaveRow = DB::table('kpg_employee_leave_requests')
            ->where(function ($q) use ($phone, $canonical, $canonicalWithoutPlus, $trailing) {
                $q->where('telepon', $phone)
                  ->orWhere('telepon', $canonical)
                  ->orWhere('telepon', $canonicalWithoutPlus)
                  ->orWhere('telepon', 'LIKE', '%' . $trailing . '%');
            })
            ->orderBy('id', 'desc')
            ->first();

        if ($leaveRow && !empty($leaveRow->employee_id)) {
            $found = Employee::where('id', $leaveRow->employee_id)->where('is_active', true)->first();
            if ($found) {
                // Auto-sync nomor ke kpg_employees jika masih null
                if (empty($found->telepon)) {
                    $found->update(['telepon' => $canonical]);
                }
                return $found;
            }
        }

        return null;
    }

    /**
     * Mengaitkan atau memperbarui nomor telepon WhatsApp ke profil pegawai via NIP.
     */
    public static function linkPhoneToEmployee(string $nip, string $phone): ?Employee
    {
        $employee = Employee::where('nip', trim($nip))->where('is_active', true)->first();
        if (!$employee) {
            return null;
        }

        $canonical = self::toCanonicalE164($phone);
        $employee->update(['telepon' => $canonical]);

        return $employee;
    }
}
