<?php

use Database\Seeders\StExpenseTemplateSeeder;
use Database\Seeders\StTemplateSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        (new StTemplateSeeder)->run();
        (new StExpenseTemplateSeeder)->run();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep templates intact on rollback to avoid losing data
    }
};
