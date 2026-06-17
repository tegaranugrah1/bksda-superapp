<?php

namespace App\Modules\Bmn\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class HandoverAgreement extends Model
{
    use HasUuids;

    protected $table = 'bmn_handover_agreements';

    protected $fillable = [
        'variant',
        'first_party_employee_id',
        'second_party_employee_id',
        'generated_by',
        'title',
        'number',
        'kap',
        'document_date',
        'first_party_snapshot',
        'second_party_snapshot',
        'witness_snapshot',
        'items_snapshot',
        'asset_ids',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'document_date' => 'date',
        'first_party_snapshot' => 'array',
        'second_party_snapshot' => 'array',
        'witness_snapshot' => 'array',
        'items_snapshot' => 'array',
        'asset_ids' => 'array',
        'metadata' => 'array',
    ];

    public function firstPartyEmployee()
    {
        return $this->belongsTo(Employee::class, 'first_party_employee_id');
    }

    public function secondPartyEmployee()
    {
        return $this->belongsTo(Employee::class, 'second_party_employee_id');
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
