<?php

namespace App\Modules\Agent\Services;

use App\Modules\Kepegawaian\Models\Employee;

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
     * Cari pegawai berdasarkan nomor WhatsApp dengan toleransi format.
     */
    public static function findEmployeeByPhone(string $phone): ?Employee
    {
        $canonical = self::toCanonicalE164($phone);
        if (! preg_match('/^\+[1-9][0-9]{7,14}$/', $canonical)) {
            return null;
        }
        $match = null;
        // ponytail: linear scan of the staff roster; use an indexed canonical phone
        // column if roster size makes this measured lookup cost significant.
        foreach (Employee::where('is_active', true)->whereNotNull('telepon')->cursor() as $employee) {
            if (self::toCanonicalE164($employee->telepon) === $canonical) {
                if ($match) return null; // Ambiguous phone ownership cannot authenticate either employee.
                $match = $employee;
            }
        }
        return $match;
    }

    /**
     * Compatibility confirmation only: NIP is not proof for replacing a phone.
     */
    public static function linkPhoneToEmployee(string $nip, string $phone): ?Employee
    {
        $employee = self::findEmployeeByPhone($phone);
        return $employee && $employee->nip === trim($nip) ? $employee : null;
    }
}
