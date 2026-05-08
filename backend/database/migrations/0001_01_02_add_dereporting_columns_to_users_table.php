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
        Schema::table('users', function (Blueprint $table) {
            $table->string('dereporting_role')->nullable()->after('access_modules')->comment('operator, null = bukan operator');
            $table->uuid('dereporting_bidang_id')->nullable()->after('dereporting_role');
            $table->foreign('dereporting_bidang_id')->references('id')->on('dr_bidang')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['dereporting_bidang_id']);
            $table->dropColumn(['dereporting_role', 'dereporting_bidang_id']);
        });
    }
};
