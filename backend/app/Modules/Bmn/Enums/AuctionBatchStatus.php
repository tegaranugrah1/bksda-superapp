<?php

namespace App\Modules\Bmn\Enums;

enum AuctionBatchStatus: string
{
    case DRAFT = 'DRAFT';
    case DIAJUKAN = 'DIAJUKAN';
    case JADWAL_DITETAPKAN = 'JADWAL_DITETAPKAN';
    case LELANG_ULANG = 'LELANG_ULANG';
    case REALISASI = 'REALISASI';
    case BATAL = 'BATAL';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draft',
            self::DIAJUKAN => 'Diajukan',
            self::JADWAL_DITETAPKAN => 'Jadwal Ditetapkan',
            self::LELANG_ULANG => 'Lelang Ulang',
            self::REALISASI => 'Realisasi',
            self::BATAL => 'Batal',
        };
    }

    public function isActive(): bool
    {
        return in_array($this, self::active(), true);
    }

    public function isFinal(): bool
    {
        return in_array($this, self::final(), true);
    }

    /**
     * @return list<self>
     */
    public static function active(): array
    {
        return [
            self::DRAFT,
            self::DIAJUKAN,
            self::JADWAL_DITETAPKAN,
            self::LELANG_ULANG,
        ];
    }

    /**
     * @return list<self>
     */
    public static function final(): array
    {
        return [
            self::REALISASI,
            self::BATAL,
        ];
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return list<string>
     */
    public static function activeValues(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::active());
    }

    /**
     * @return list<string>
     */
    public static function finalValues(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::final());
    }
}
