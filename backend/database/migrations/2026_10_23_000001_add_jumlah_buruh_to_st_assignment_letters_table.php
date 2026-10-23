<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            if (! Schema::hasColumn('st_assignment_letters', 'jumlah_buruh')) {
                $table->unsignedSmallInteger('jumlah_buruh')->default(0)->after('has_seksi_employee');
            }
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            if (Schema::hasColumn('st_assignment_letters', 'jumlah_buruh')) {
                $table->dropColumn('jumlah_buruh');
            }
        });
    }
};
