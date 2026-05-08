<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

class StockTransaction extends Model
{
    use HasUuids;

    protected $table = 'inv_stock_transactions';

    protected $fillable = [
        'office_id',
        'item_id',
        'type',             // 'in', 'out', 'adjustment'
        'quantity',
        'remaining_stock',  // WAJIB: Mencatat jumlah sisa saat itu
        'keterangan',
        'user_id',          // Siapa admin yang klik simpan
        'employee_id'       // Siapa pegawai yang minta barang
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
