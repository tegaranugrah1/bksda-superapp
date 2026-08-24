<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_templates', function (Blueprint $table) {
            $table->string('code', 100)->nullable()->unique()->after('name');
            $table->text('description')->nullable()->after('code');
            $table->string('type', 30)->default('custom')->after('description');
            $table->foreignId('default_signer_employee_id')->nullable()->after('dasar')->constrained('kpg_employees')->nullOnDelete();
            $table->string('default_signer_name')->nullable()->after('default_signer_employee_id');
            $table->string('default_signer_nip', 50)->nullable()->after('default_signer_name');
            $table->json('configuration')->nullable()->after('default_signer_nip');
            $table->boolean('is_system')->default(false)->after('configuration');
            $table->boolean('is_active')->default(true)->index()->after('is_system');
            $table->boolean('is_default')->default(false)->index()->after('is_active');
            $table->unsignedInteger('version')->default(1)->after('is_default');
            $table->foreignId('created_by')->nullable()->after('version')->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('st_templates', function (Blueprint $table) {
            $table->dropForeign(['default_signer_employee_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropUnique(['code']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['is_default']);
            $table->dropSoftDeletes();
            $table->dropColumn([
                'code', 'description', 'type', 'default_signer_employee_id',
                'default_signer_name', 'default_signer_nip', 'configuration',
                'is_system', 'is_active', 'is_default', 'version', 'created_by', 'updated_by',
            ]);
        });
    }
};
