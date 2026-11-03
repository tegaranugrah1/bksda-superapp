<?php

namespace App\Modules\Kepegawaian\Services;

use App\Modules\Kepegawaian\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class HolidayCalendarHelper
{
    /**
     * Known Indonesian National Holidays & Cuti Bersama (SKB 3 Menteri) for 2025-2027.
     * Format: 'YYYY-MM-DD' => 'Nama Libur'
     */
    protected static array $holidays = [
        // 2025 - Hari Libur Nasional & Cuti Bersama (SKB 3 Menteri)
        '2025-01-01' => 'Tahun Baru 2025 Masehi',
        '2025-01-27' => 'Isra Mikraj Nabi Muhammad SAW',
        '2025-01-28' => 'Cuti Bersama Tahun Baru Imlek 2576 Kongzili',
        '2025-01-29' => 'Tahun Baru Imlek 2576 Kongzili',
        '2025-03-28' => 'Cuti Bersama Hari Suci Nyepi',
        '2025-03-29' => 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
        '2025-03-31' => 'Idul Fitri 1446 Hijriah',
        '2025-04-01' => 'Idul Fitri 1446 Hijriah',
        '2025-04-02' => 'Cuti Bersama Idul Fitri 1446 Hijriah',
        '2025-04-03' => 'Cuti Bersama Idul Fitri 1446 Hijriah',
        '2025-04-04' => 'Cuti Bersama Idul Fitri 1446 Hijriah',
        '2025-04-07' => 'Cuti Bersama Idul Fitri 1446 Hijriah',
        '2025-04-18' => 'Wafat Yesus Kristus',
        '2025-04-20' => 'Kebangkitan Yesus Kristus (Paskah)',
        '2025-05-01' => 'Hari Buruh Internasional',
        '2025-05-12' => 'Hari Raya Waisak 2569 BE',
        '2025-05-13' => 'Cuti Bersama Hari Raya Waisak',
        '2025-05-29' => 'Kenaikan Yesus Kristus',
        '2025-05-30' => 'Cuti Bersama Kenaikan Yesus Kristus',
        '2025-06-01' => 'Hari Lahir Pancasila',
        '2025-06-07' => 'Hari Raya Idul Adha 1446 Hijriah',
        '2025-06-09' => 'Cuti Bersama Hari Raya Idul Adha',
        '2025-06-27' => '1 Muharam Tahun Baru Islam 1447 Hijriah',
        '2025-08-17' => 'Proklamasi Kemerdekaan RI',
        '2025-09-05' => 'Maulid Nabi Muhammad SAW',
        '2025-12-25' => 'Kelahiran Yesus Kristus (Natal)',
        '2025-12-26' => 'Cuti Bersama Hari Raya Natal',

        // 2026 - Hari Libur Nasional & Cuti Bersama (SKB 3 Menteri)
        '2026-01-01' => 'Tahun Baru 2026 Masehi',
        '2026-01-16' => 'Isra Mikraj Nabi Muhammad SAW',
        '2026-02-16' => 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili',
        '2026-02-17' => 'Tahun Baru Imlek 2577 Kongzili',
        '2026-03-18' => 'Cuti Bersama Hari Suci Nyepi',
        '2026-03-19' => 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
        '2026-03-20' => 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah',
        '2026-03-21' => 'Idul Fitri 1447 Hijriah',
        '2026-03-22' => 'Idul Fitri 1447 Hijriah',
        '2026-03-23' => 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah',
        '2026-03-24' => 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah',
        '2026-04-03' => 'Wafat Yesus Kristus',
        '2026-04-05' => 'Kebangkitan Yesus Kristus (Paskah)',
        '2026-05-01' => 'Hari Buruh Internasional',
        '2026-05-14' => 'Kenaikan Yesus Kristus',
        '2026-05-15' => 'Cuti Bersama Kenaikan Yesus Kristus',
        '2026-05-27' => 'Hari Raya Idul Adha 1447 Hijriah',
        '2026-05-28' => 'Cuti Bersama Hari Raya Idul Adha',
        '2026-05-31' => 'Hari Raya Waisak 2570 BE',
        '2026-06-01' => 'Hari Lahir Pancasila',
        '2026-06-16' => 'Tahun Baru Islam 1448 Hijriah',
        '2026-08-17' => 'Hari Kemerdekaan RI ke-81',
        '2026-08-25' => 'Maulid Nabi Muhammad SAW',
        '2026-12-24' => 'Cuti Bersama Hari Raya Natal',
        '2026-12-25' => 'Hari Raya Natal',

        // 2027 - Hari Libur Nasional & Cuti Bersama
        '2027-01-01' => 'Tahun Baru 2027 Masehi',
        '2027-02-06' => 'Tahun Baru Imlek 2578 Kongzili',
        '2027-02-08' => 'Cuti Bersama Tahun Baru Imlek',
        '2027-03-09' => 'Hari Suci Nyepi (Tahun Baru Saka 1949)',
        '2027-03-10' => 'Idul Fitri 1448 Hijriah',
        '2027-03-11' => 'Idul Fitri 1448 Hijriah',
        '2027-03-12' => 'Cuti Bersama Idul Fitri 1448 Hijriah',
        '2027-03-15' => 'Cuti Bersama Idul Fitri 1448 Hijriah',
        '2027-03-26' => 'Wafat Yesus Kristus',
        '2027-05-01' => 'Hari Buruh Internasional',
        '2027-05-06' => 'Kenaikan Yesus Kristus',
        '2027-05-20' => 'Hari Raya Waisak 2571 BE',
        '2027-06-01' => 'Hari Lahir Pancasila',
        '2027-08-17' => 'Hari Kemerdekaan RI',
        '2027-12-24' => 'Cuti Bersama Hari Raya Natal',
        '2027-12-25' => 'Hari Raya Natal',
    ];

    /**
     * Hari Libur Nasional Tetap (Fixed Date) setiap tahun tanpa batas.
     * Format: 'MM-DD' => 'Nama Libur'
     */
    protected static array $fixedAnnualHolidays = [
        '01-01' => 'Tahun Baru Masehi',
        '05-01' => 'Hari Buruh Internasional',
        '06-01' => 'Hari Lahir Pancasila',
        '08-17' => 'Hari Kemerdekaan RI',
        '12-25' => 'Hari Raya Natal',
    ];

    /**
     * Cek apakah tanggal bersangkutan adalah tanggal merah / libur nasional resmi.
     */
    public static function isHoliday(string|Carbon $date): bool
    {
        $dStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
        if (isset(self::$holidays[$dStr])) {
            return true;
        }
        $md = substr($dStr, 5, 5);
        if (isset(self::$fixedAnnualHolidays[$md])) {
            return true;
        }
        try {
            if (Schema::hasTable('kpg_holidays')) {
                return Holiday::where('tanggal', $dStr)->exists();
            }
        } catch (\Throwable) {}
        return false;
    }

    /**
     * Ambil nama libur nasional jika ada.
     */
    public static function getHolidayName(string|Carbon $date): ?string
    {
        $dStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
        if (isset(self::$holidays[$dStr])) {
            return self::$holidays[$dStr];
        }
        $md = substr($dStr, 5, 5);
        if (isset(self::$fixedAnnualHolidays[$md])) {
            return self::$fixedAnnualHolidays[$md];
        }
        try {
            if (Schema::hasTable('kpg_holidays')) {
                return Holiday::where('tanggal', $dStr)->value('nama');
            }
        } catch (\Throwable) {}
        return null;
    }

    /**
     * Cek apakah tanggal merupakan akhir pekan (Sabtu atau Minggu).
     */
    public static function isWeekend(string|Carbon $date): bool
    {
        $c = $date instanceof Carbon ? $date : Carbon::parse($date);
        return $c->isSaturday() || $c->isSunday();
    }

    /**
     * Ambil seluruh hari libur nasional & cuti bersama pada bulan dan tahun tertentu.
     *
     * @param int $year
     * @param int $month
     * @return array<int, array{day: int, date: string, name: string, is_cuti_bersama: bool}>
     */
    public static function getHolidaysForMonth(int $year, int $month): array
    {
        $prefix = sprintf('%04d-%02d-', $year, $month);
        $result = [];
        foreach (self::$holidays as $date => $name) {
            if (str_starts_with($date, $prefix)) {
                $day = (int) substr($date, 8, 2);
                $isCutiBersama = stripos($name, 'cuti bersama') !== false;
                $result[$day] = [
                    'id' => null,
                    'day' => $day,
                    'date' => $date,
                    'name' => $name,
                    'is_cuti_bersama' => $isCutiBersama,
                    'is_custom' => false,
                ];
            }
        }

        // Fallback untuk hari libur tahunan bertanggal tetap (2028, 2029, dst.)
        $mPrefix = sprintf('%02d-', $month);
        foreach (self::$fixedAnnualHolidays as $md => $name) {
            if (str_starts_with($md, $mPrefix)) {
                $day = (int) substr($md, 3, 2);
                if (!isset($result[$day])) {
                    $result[$day] = [
                        'id' => null,
                        'day' => $day,
                        'date' => sprintf('%04d-%s', $year, $md),
                        'name' => $name,
                        'is_cuti_bersama' => false,
                        'is_custom' => false,
                    ];
                }
            }
        }

        // Merge dari database kpg_holidays jika ada
        try {
            if (Schema::hasTable('kpg_holidays')) {
                $dbHolidays = Holiday::where('tahun', $year)
                    ->whereMonth('tanggal', $month)
                    ->get();
                foreach ($dbHolidays as $dbh) {
                    $d = Carbon::parse($dbh->tanggal);
                    $day = (int) $d->format('d');
                    $result[$day] = [
                        'id' => $dbh->id,
                        'day' => $day,
                        'date' => $dbh->tanggal,
                        'name' => $dbh->nama,
                        'is_cuti_bersama' => (bool) $dbh->is_cuti_bersama,
                        'is_custom' => true,
                    ];
                }
            }
        } catch (\Throwable) {}

        ksort($result);
        return $result;
    }

    /**
     * Ambil seluruh hari libur (static + DB) untuk tahun tertentu (untuk tampilan Setting).
     */
    public static function getAllHolidaysForYear(int $year): array
    {
        $prefix = sprintf('%04d-', $year);
        $items = [];

        // 1. Static SKB
        foreach (self::$holidays as $date => $name) {
            if (str_starts_with($date, $prefix)) {
                $items[$date] = [
                    'id' => null,
                    'tanggal' => $date,
                    'tahun' => $year,
                    'nama' => $name,
                    'is_cuti_bersama' => stripos($name, 'cuti bersama') !== false,
                    'is_custom' => false,
                ];
            }
        }

        // 2. Fixed annual
        foreach (self::$fixedAnnualHolidays as $md => $name) {
            $fullDate = sprintf('%04d-%s', $year, $md);
            if (!isset($items[$fullDate])) {
                $items[$fullDate] = [
                    'id' => null,
                    'tanggal' => $fullDate,
                    'tahun' => $year,
                    'nama' => $name,
                    'is_cuti_bersama' => false,
                    'is_custom' => false,
                ];
            }
        }

        // 3. Database custom holidays
        try {
            if (Schema::hasTable('kpg_holidays')) {
                $dbItems = Holiday::where('tahun', $year)->get();
                foreach ($dbItems as $dbh) {
                    $items[$dbh->tanggal] = [
                        'id' => $dbh->id,
                        'tanggal' => $dbh->tanggal,
                        'tahun' => $dbh->tahun,
                        'nama' => $dbh->nama,
                        'is_cuti_bersama' => (bool) $dbh->is_cuti_bersama,
                        'is_custom' => true,
                    ];
                }
            }
        } catch (\Throwable) {}

        ksort($items);
        return array_values($items);
    }
}
