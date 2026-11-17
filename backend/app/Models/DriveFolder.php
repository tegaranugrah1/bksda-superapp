<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DriveFolder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'unit_id',
        'location_id',
        'user_id',
        'parent_id',
        'name',
        'color',
        'is_starred',
        'is_restricted',
        'folder_scope',
        'resor_code',
        'room_code',
    ];

    protected function casts(): array
    {
        return [
            'is_starred' => 'boolean',
            'is_restricted' => 'boolean',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(DriveUnit::class, 'unit_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Bmn\Models\Location::class, 'location_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(DriveFolder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(DriveFolder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DriveFile::class, 'folder_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(DriveShare::class, 'folder_id');
    }

    /**
     * Kumpulkan semua ID subfolder turunan (BFS) agar DriveController, LocationController, & DriveAccess berbagi satu helper.
     */
    public static function collectDescendantIds(int|array $rootIds, bool $withTrashed = false): array
    {
        $queue = array_values(array_unique(array_filter(array_map('intval', (array) $rootIds))));
        $descendants = [];

        while (! empty($queue)) {
            $query = $withTrashed ? static::withTrashed() : static::query();
            $childIds = $query->whereIn('parent_id', $queue)->pluck('id')->all();
            $nextQueue = [];

            foreach ($childIds as $cid) {
                $cidInt = (int) $cid;
                if (! in_array($cidInt, $descendants, true)) {
                    $descendants[] = $cidInt;
                    $nextQueue[] = $cidInt;
                }
            }

            $queue = $nextQueue;
        }

        return $descendants;
    }
}
