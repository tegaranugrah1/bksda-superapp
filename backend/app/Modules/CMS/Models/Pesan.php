<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pesan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_pesan';

    protected $fillable = [
        'nama',
        'email',
        'subjek',
        'isi',
        // ip_address dan is_read diisi oleh sistem, bukan user
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    /** Scope: Pesan yang belum dibaca */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }
}
