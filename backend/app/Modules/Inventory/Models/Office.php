<?php

namespace App\Modules\Inventory\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Office extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_offices';

    protected $fillable = [
        'nama_kantor',
        'lokasi',
        'penanggung_jawab_id',
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
