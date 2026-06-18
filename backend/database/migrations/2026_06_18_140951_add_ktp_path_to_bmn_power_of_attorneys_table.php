<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bmn_power_of_attorneys', function (Blueprint $table) {
            $table->string('ktp_path', 255)->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bmn_power_of_attorneys', function (Blueprint $table) {
            $table->dropColumn('ktp_path');
        });
    }
};
