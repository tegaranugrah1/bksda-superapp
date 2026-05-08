<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Website extends Model
{
    use HasFactory, HasUuids;

    // Singleton — no SoftDeletes needed
    protected $table = 'cms_website';

    protected $fillable = [
        'nama_instansi',
        'alamat',
        'telepon',
        'email',
        'fax',
        'tentang',
        'logo_path',
        'favicon_path',
        'facebook',
        'instagram',
        'youtube',
        'twitter',
    ];
}
