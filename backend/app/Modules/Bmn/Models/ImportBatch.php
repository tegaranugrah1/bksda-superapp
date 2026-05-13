<?php

namespace App\Modules\Bmn\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use HasUuids;

    protected $table = 'bmn_import_batches';

    protected $fillable = [
        'uploaded_by',
        'filename',
        'total_rows',
        'new_rows',
        'updated_rows',
        'unchanged_rows',
        'status',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function stagingRows()
    {
        return $this->hasMany(ImportStaging::class, 'batch_id');
    }
}
