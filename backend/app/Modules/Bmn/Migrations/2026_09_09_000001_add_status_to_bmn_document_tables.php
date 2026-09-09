<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'bmn_usage_agreements',
            'bmn_handover_agreements',
            'bmn_power_of_attorneys',
            'bmn_covering_letters',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'status')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->string('status', 20)->default('draft')->after('number');
                });

                // Set existing documents with valid numbers to 'published'
                DB::table($tableName)
                    ->whereNotNull('number')
                    ->where('number', '!=', '')
                    ->where('number', '!=', '-')
                    ->where('number', 'not like', "%\u{00A0}%")
                    ->where('number', 'not like', '%.   /%')
                    ->where('number', 'not like', '%. /%')
                    ->update(['status' => 'published']);
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'bmn_usage_agreements',
            'bmn_handover_agreements',
            'bmn_power_of_attorneys',
            'bmn_covering_letters',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'status')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('status');
                });
            }
        }
    }
};
