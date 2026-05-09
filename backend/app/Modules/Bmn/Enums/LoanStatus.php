<?php

namespace App\Modules\Bmn\Enums;

enum LoanStatus: string
{
    case Dipinjam = 'dipinjam';
    case Dikembalikan = 'dikembalikan';

    public function label(): string
    {
        return match($this) {
            self::Dipinjam => 'Dipinjam',
            self::Dikembalikan => 'Dikembalikan',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
