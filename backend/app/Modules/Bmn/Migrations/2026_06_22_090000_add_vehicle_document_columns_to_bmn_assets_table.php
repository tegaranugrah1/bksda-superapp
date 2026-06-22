<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->string('bpkb_document_path')->nullable()->after('foto_stnk_2_path');
            $table->string('bpkb_document_mime', 120)->nullable()->after('bpkb_document_path');
            $table->string('bpkb_document_original_name')->nullable()->after('bpkb_document_mime');
            $table->string('bpkb_preview_path')->nullable()->after('bpkb_document_original_name');
            $table->string('stnk_document_path')->nullable()->after('bpkb_preview_path');
            $table->string('stnk_document_mime', 120)->nullable()->after('stnk_document_path');
            $table->string('stnk_document_original_name')->nullable()->after('stnk_document_mime');
            $table->string('stnk_preview_path')->nullable()->after('stnk_document_original_name');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn([
                'bpkb_document_path',
                'bpkb_document_mime',
                'bpkb_document_original_name',
                'bpkb_preview_path',
                'stnk_document_path',
                'stnk_document_mime',
                'stnk_document_original_name',
                'stnk_preview_path',
            ]);
        });
    }
};
