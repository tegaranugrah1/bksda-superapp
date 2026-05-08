<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\Kepegawaian\Models\Employee;

class Office extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_offices';

    protected $fillable = [
        'nama_kantor',
        'lokasi',
        'penanggung_jawab_id'
    ];

    public function penanggungJawab(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'penanggung_jawab_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(InventoryStock::class, 'office_id');
    }
}
