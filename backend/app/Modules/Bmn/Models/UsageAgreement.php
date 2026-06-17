<?php

namespace App\Modules\Bmn\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UsageAgreement extends Model
{
    use HasUuids;

    protected $table = 'bmn_usage_agreements';

    protected $fillable = [
        'employee_id',
        'generated_by',
        'number',
        'kap',
        'document_date',
        'first_party_snapshot',
        'second_party_snapshot',
        'assets_snapshot',
        'asset_ids',
        'notes',
    ];

    protected $casts = [
        'document_date' => 'date',
        'first_party_snapshot' => 'array',
        'second_party_snapshot' => 'array',
        'assets_snapshot' => 'array',
        'asset_ids' => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
