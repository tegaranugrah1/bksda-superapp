<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasUuids;

    protected $table = 'bmn_locations';

    protected $fillable = [
        'unit_kerja',
        'name',
        'description',
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class, 'lokasi_ruang', 'name');
    }
}
