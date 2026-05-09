<?php

namespace App\Modules\Bmn\Enums;

enum AssetCondition: string
{
    case Baik = 'Baik';
    case RusakRingan = 'Rusak Ringan';
    case RusakBerat = 'Rusak Berat';

    public function label(): string
    {
        return match ($this) {
            self::Baik => 'Baik',
            self::RusakRingan => 'Rusak Ringan',
            self::RusakBerat => 'Rusak Berat',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
