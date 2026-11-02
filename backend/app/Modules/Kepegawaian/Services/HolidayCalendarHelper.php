<?php

namespace App\Modules\Kepegawaian\Services;

use Carbon\Carbon;

class HolidayCalendarHelper
{
    /**
     * Known Indonesian National Holidays (SKB 3 Menteri) for 2025-2027.
     * Format: 'YYYY-MM-DD' => 'Nama Libur'
     */
    protected static array $holidays = [
        // 2025
        '2025-01-01' => 'Tahun Baru 2025 Masehi',
        '2025-01-27' => 'Isra Mikraj Nabi Muhammad SAW',
        '2025-01-29' => 'Tahun Baru Imlek 2576 Kongzili',
        '2025-03-29' => 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
        '2025-03-31' => 'Idul Fitri 1446 Hijriah',
        '2025-04-01' => 'Idul Fitri 1446 Hijriah',
        '2025-04-18' => 'Wafat Yesus Kristus',
        '2025-04-20' => 'Kebangkitan Yesus Kristus (Paskah)',
        '2025-05-01' => 'Hari Buruh Internasional',
        '2025-05-12' => 'Hari Raya Waisak 2569 BE',
        '2025-05-29' => 'Kenaikan Yesus Kristus',
        '2025-06-01' => 'Hari Lahir Pancasila',
        '2025-06-07' => 'Hari Raya Idul Adha 1446 Hijriah',
        '2025-06-27' => '1 Muharam Tahun Baru Islam 1447 Hijriah',
        '2025-08-17' => 'Proklamasi Kemerdekaan RI',
        '2025-09-05' => 'Maulid Nabi Muhammad SAW',
        '2025-12-25' => 'Kelahiran Yesus Kristus (Natal)',

        // 2026
        '2026-01-01' => 'Tahun Baru 2026 Masehi',
        '2026-01-16' => 'Isra Mikraj Nabi Muhammad SAW',
        '2026-02-17' => 'Tahun Baru Imlek 2577 Kongzili',
        '2026-03-19' => 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
        '2026-03-20' => 'Idul Fitri 1447 Hijriah',
        '2026-03-21' => 'Idul Fitri 1447 Hijriah',
        '2026-04-03' => 'Wafat Yesus Kristus',
        '2026-05-01' => 'Hari Buruh Internasional',
        '2026-05-14' => 'Kenaikan Yesus Kristus',
        '2026-05-31' => 'Hari Raya Waisak 2570 BE',
        '2026-06-01' => 'Hari Lahir Pancasila',
        '2026-06-16' => 'Tahun Baru Islam 1448 Hijriah',
        '2026-08-17' => 'Hari Kemerdekaan RI ke-81',
        '2026-08-25' => 'Maulid Nabi Muhammad SAW',
        '2026-12-25' => 'Hari Raya Natal',

        // 2027
        '2027-01-01' => 'Tahun Baru 2027 Masehi',
        '2027-02-06' => 'Tahun Baru Imlek 2578 Kongzili',
        '2027-03-09' => 'Hari Suci Nyepi (Tahun Baru Saka 1949)',
        '2027-03-10' => 'Idul Fitri 1448 Hijriah',
        '2027-03-11' => 'Idul Fitri 1448 Hijriah',
        '2027-03-26' => 'Wafat Yesus Kristus',
        '2027-05-01' => 'Hari Buruh Internasional',
        '2027-05-06' => 'Kenaikan Yesus Kristus',
        '2027-05-20' => 'Hari Raya Waisak 2571 BE',
        '2027-06-01' => 'Hari Lahir Pancasila',
        '2027-08-17' => 'Hari Kemerdekaan RI',
        '2027-12-25' => 'Hari Raya Natal',
    ];

    /**
     * Cek apakah tanggal bersangkutan adalah tanggal merah / libur nasional resmi.
     */
    public static function isHoliday(string|Carbon $date): bool
    {
        $dStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
        return isset(self::$holidays[$dStr]);
    }

    /**
     * Ambil nama libur nasional jika ada.
     */
    public static function getHolidayName(string|Carbon $date): ?string
    {
        $dStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
        return self::$holidays[$dStr] ?? null;
    }

    /**
     * Cek apakah tanggal merupakan akhir pekan (Sabtu atau Minggu).
     */
    public static function isWeekend(string|Carbon $date): bool
    {
        $c = $date instanceof Carbon ? $date : Carbon::parse($date);
        return $c->isSaturday() || $c->isSunday();
    }
}
