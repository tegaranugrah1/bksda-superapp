<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('st_templates')
            ->whereNull('version')
            ->update(['version' => 1]);

        DB::table('st_template_versions')
            ->whereNull('version')
            ->update(['version' => 1]);
    }

    public function down(): void
    {
        // Do not reintroduce invalid NULL versions on rollback.
    }
};
