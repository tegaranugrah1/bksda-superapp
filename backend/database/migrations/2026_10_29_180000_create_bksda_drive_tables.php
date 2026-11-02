<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Kolom kuota per user pada tabel users (default 5 GB)
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'drive_quota_bytes')) {
                $table->bigInteger('drive_quota_bytes')->default(5368709120)->after('email'); // 5 GB
            }
        });

        // 2. Drive Units (Ruang Kerja Tim / Drive Bersama)
        Schema::create('drive_units', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name', 128);
            $table->bigInteger('storage_quota_bytes')->default(53687091200); // 50 GB
            $table->timestamps();
        });

        // 3. Anggota Unit & Hak Akses (Manager, Editor, Viewer)
        Schema::create('drive_unit_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drive_unit_id')->constrained('drive_units')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['manager', 'editor', 'viewer'])->default('viewer');
            $table->timestamps();

            $table->unique(['drive_unit_id', 'user_id']);
        });

        // 4. Folder Drive (Bisa di Drive Saya atau Drive Bersama)
        Schema::create('drive_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->nullable()->constrained('drive_units')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('drive_folders')->nullOnDelete();
            $table->string('name', 255);
            $table->string('color', 32)->nullable();
            $table->boolean('is_starred')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['unit_id', 'parent_id']);
            $table->index(['user_id', 'parent_id']);
        });

        // 5. Berkas Drive
        Schema::create('drive_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->nullable()->constrained('drive_units')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('drive_folders')->nullOnDelete();
            $table->string('name', 255);
            $table->string('s3_key', 512);
            $table->bigInteger('size_bytes');
            $table->string('mime_type', 128);
            $table->boolean('is_starred')->default(false);
            $table->string('source_module', 64)->nullable(); // auto-archive (surat_tugas, cuti, bmn)
            $table->string('source_id', 128)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['unit_id', 'folder_id']);
            $table->index(['user_id', 'folder_id']);
            $table->unique(['source_module', 'source_id']);
        });

        // 6. Sesi Reservasi / Multipart Upload
        Schema::create('drive_uploads', function (Blueprint $table) {
            $table->string('id', 64)->primary(); // Unique UUID
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('drive_units')->nullOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('drive_folders')->nullOnDelete();
            $table->string('filename', 255);
            $table->string('s3_key', 512);
            $table->string('upload_id', 255)->nullable(); // S3 Multipart UploadId
            $table->bigInteger('total_size_bytes');
            $table->integer('parts_count')->default(1);
            $table->string('status', 32)->default('initiated'); // initiated, completed, aborted
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['expires_at', 'status']);
        });

        // Seed 9 Official Units (D7)
        $units = [
            ['slug' => 'balai-samarinda', 'name' => 'Balai BKSDA Samarinda', 'storage_quota_bytes' => 107374182400], // 100 GB
            ['slug' => 'skw-1-berau', 'name' => 'Seksi Konservasi Wilayah I Berau', 'storage_quota_bytes' => 53687091200],
            ['slug' => 'skw-2-tenggarong', 'name' => 'Seksi Konservasi Wilayah II Tenggarong', 'storage_quota_bytes' => 53687091200],
            ['slug' => 'skw-3-balikpapan', 'name' => 'Seksi Konservasi Wilayah III Balikpapan', 'storage_quota_bytes' => 53687091200],
            ['slug' => 'resor-bontang', 'name' => 'Resor Konservasi Wilayah Bontang', 'storage_quota_bytes' => 21474836480],
            ['slug' => 'resor-kutim', 'name' => 'Resor Konservasi Wilayah Kutai Timur', 'storage_quota_bytes' => 21474836480],
            ['slug' => 'resor-ppu', 'name' => 'Resor Konservasi Wilayah Penajam Paser Utara', 'storage_quota_bytes' => 21474836480],
            ['slug' => 'resor-kubar', 'name' => 'Resor Konservasi Wilayah Kutai Barat', 'storage_quota_bytes' => 21474836480],
            ['slug' => 'resor-paser', 'name' => 'Resor Konservasi Wilayah Paser', 'storage_quota_bytes' => 21474836480],
        ];

        foreach ($units as $u) {
            DB::table('drive_units')->insertOrIgnore([
                'slug' => $u['slug'],
                'name' => $u['name'],
                'storage_quota_bytes' => $u['storage_quota_bytes'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drive_uploads');
        Schema::dropIfExists('drive_files');
        Schema::dropIfExists('drive_folders');
        Schema::dropIfExists('drive_unit_members');
        Schema::dropIfExists('drive_units');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'drive_quota_bytes')) {
                $table->dropColumn('drive_quota_bytes');
            }
        });
    }
};
