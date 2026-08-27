<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('st_expense_templates') && Schema::hasColumn('st_expense_templates', 'biaya_text')) {
            Schema::table('st_expense_templates', function (Blueprint $table) {
                $table->text('biaya_text')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('st_expense_templates') && Schema::hasColumn('st_expense_templates', 'biaya_text')) {
            Schema::table('st_expense_templates', function (Blueprint $table) {
                $table->text('biaya_text')->nullable(false)->change();
            });
        }
    }
};
