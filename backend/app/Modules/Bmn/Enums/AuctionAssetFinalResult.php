<?php

namespace App\Modules\Bmn\Enums;

enum AuctionAssetFinalResult: string
{
    case SOLD_FIRST = 'SOLD_FIRST';
    case SOLD_REAUCTION = 'SOLD_REAUCTION';
    case UNSOLD = 'UNSOLD';
    case CANCELED = 'CANCELED';

    public function label(): string
    {
        return match ($this) {
            self::SOLD_FIRST => 'Terjual Lelang Pertama',
            self::SOLD_REAUCTION => 'Terjual Lelang Ulang',
            self::UNSOLD => 'Tidak Terjual',
            self::CANCELED => 'Dibatalkan',
        };
    }

    public function isSold(): bool
    {
        return in_array($this, [self::SOLD_FIRST, self::SOLD_REAUCTION], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
