<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class NotificationSetting extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'enabled',
        'description',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Cek apakah pengiriman email diaktifkan secara global dan spesifik per event.
     * Menggunakan cache 60 detik untuk performa tinggi tanpa query berulang.
     */
    public static function emailEnabled(?string $eventKey = null): bool
    {
        $masterEnabled = Cache::remember('setting.email_master_enabled', 60, function () {
            $row = static::find('email_master_enabled');
            return $row ? (bool) $row->enabled : true;
        });

        if (! $masterEnabled) {
            return false;
        }

        if ($eventKey === null) {
            return true;
        }

        return Cache::remember("setting.{$eventKey}", 60, function () use ($eventKey) {
            $row = static::find($eventKey);
            return $row ? (bool) $row->enabled : true;
        });
    }

    public static function clearSettingCache(?string $key = null): void
    {
        if ($key) {
            Cache::forget("setting.{$key}");
        } else {
            Cache::forget('setting.email_master_enabled');
        }
    }
}
