<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('st_expense_templates') && !Schema::hasColumn('st_expense_templates', 'dasar_text')) {
            Schema::table('st_expense_templates', function (Blueprint $table) {
                $table->text('dasar_text')->nullable()->after('biaya_text');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('st_expense_templates') && Schema::hasColumn('st_expense_templates', 'dasar_text')) {
            Schema::table('st_expense_templates', function (Blueprint $table) {
                $table->dropColumn('dasar_text');
            });
        }
    }
};
