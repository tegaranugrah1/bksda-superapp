<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ImportStaging extends Model
{
    use HasUuids;

    protected $table = 'bmn_import_staging';

    protected $fillable = [
        'batch_id',
        'existing_asset_id',
        'diff_status',
        'imported_data',
        'changed_fields',
        'selected',
    ];

    protected $casts = [
        'imported_data' => 'array',
        'changed_fields' => 'array',
        'selected' => 'boolean',
    ];

    public function batch()
    {
        return $this->belongsTo(ImportBatch::class, 'batch_id');
    }

    public function existingAsset()
    {
        return $this->belongsTo(Asset::class, 'existing_asset_id');
    }
}
