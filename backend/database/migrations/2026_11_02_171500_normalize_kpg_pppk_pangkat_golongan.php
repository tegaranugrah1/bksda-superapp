<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Map of legacy roman PPPK notation to official standard format.
     */
    protected array $pppkMapping = [
        '(I)' => 'PPPK Golongan I',
        '(II)' => 'PPPK Golongan II',
        '(III)' => 'PPPK Golongan III',
        '(IV)' => 'PPPK Golongan IV',
        '(V)' => 'PPPK Golongan V',
        '(VI)' => 'PPPK Golongan VI',
        '(VII)' => 'PPPK Golongan VII',
        '(VIII)' => 'PPPK Golongan VIII',
        '(IX)' => 'PPPK Golongan IX',
        '(X)' => 'PPPK Golongan X',
        '(XI)' => 'PPPK Golongan XI',
        '(XII)' => 'PPPK Golongan XII',
        '(XIII)' => 'PPPK Golongan XIII',
        '(XIV)' => 'PPPK Golongan XIV',
        '(XV)' => 'PPPK Golongan XV',
        '(XVI)' => 'PPPK Golongan XVI',
        '(XVII)' => 'PPPK Golongan XVII',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->pppkMapping as $legacy => $standard) {
            DB::table('kpg_employees')
                ->where('pangkat_golongan', $legacy)
                ->update(['pangkat_golongan' => $standard]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->pppkMapping as $legacy => $standard) {
            DB::table('kpg_employees')
                ->where('pangkat_golongan', $standard)
                ->update(['pangkat_golongan' => $legacy]);
        }
    }
};
