<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AssetLoan extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_loans';

    protected $fillable = [
        'asset_id', 'employee_id', 'tanggal_pinjam',
        'tanggal_kembali', 'status', 'keterangan',
    ];

    protected $casts = [
        'tanggal_pinjam' => 'date',
        'tanggal_kembali' => 'date',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function borrower()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
