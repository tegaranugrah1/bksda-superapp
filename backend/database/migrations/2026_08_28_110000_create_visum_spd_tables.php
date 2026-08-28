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
        Schema::create('visum_spd_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('visum_spd_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('auto_today_date')->default(true);
            $table->json('data');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        // Seed initial global officials & PPK settings
        DB::table('visum_spd_settings')->insert([
            'key' => 'officials_and_ppk',
            'value' => json_encode([
                'samarinda' => [
                    'place' => 'Samarinda',
                    'official_name' => 'Dheny Mardiono, S.Hut., MSc.',
                    'official_nip' => '19750314 199903 1 004',
                    'depart_position' => "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                    'return_position' => 'Kepala Subbagian Tata Usaha',
                ],
                'berau' => [
                    'place' => 'Berau',
                    'official_name' => 'Yulian Sadono, S.Hut., M.T.',
                    'official_nip' => '19800707 200604 1 003',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                ],
                'tenggarong' => [
                    'place' => 'Tenggarong',
                    'official_name' => 'Suriawati Halim, S.Hut., M.P.',
                    'official_nip' => '19751127 200003 2 001',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                ],
                'balikpapan' => [
                    'place' => 'Balikpapan',
                    'official_name' => 'Bambang Hari Trimarsito, S.Si., M.P.',
                    'official_nip' => '19740626 200112 1 004',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                ],
                'ppk' => [
                    'name' => 'Ahmad Hidayat, S.PKP., M.Ling',
                    'nip' => '19820301 200012 1 001',
                    'position' => 'Pejabat Pembuat Komitmen,',
                    'statement' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                ],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Seed initial "Suaka Badak Kelian" template
        DB::table('visum_spd_templates')->insert([
            'name' => 'Suaka Badak Kelian',
            'description' => 'Template perjalanan dinas monitoring ke Suaka Badak Kelian, Kab. Kutai Barat.',
            'is_default' => true,
            'auto_today_date' => true,
            'data' => json_encode([
                'asal_tempat' => 'Samarinda',
                'asal_tanggal' => '',
                'tujuan_awal' => 'Kabupaten Kutai Barat',
                'asal_jabatan_pengesah' => "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                'asal_nama_pejabat' => 'Dheny Mardiono, S.Hut., MSc.',
                'asal_nip_pejabat' => '19750314 199903 1 004',

                'tujuan_1_tempat' => 'Kabupaten Kutai Barat',
                'tujuan_1_tiba_tanggal' => '',
                'tujuan_1_kepala_jabatan' => 'Plt. Manager Camp PT. HLKL',
                'tujuan_1_kepala_nama' => 'Theodorus Dedi',
                'tujuan_1_kepala_nip' => '',
                'tujuan_1_id_type' => 'NIP',
                'tujuan_1_berangkat_dari' => 'Kabupaten Kutai Barat',
                'tujuan_1_berangkat_ke' => 'Samarinda',
                'tujuan_1_berangkat_tanggal' => '',
                'tujuan_1_berangkat_kepala_jabatan' => 'Plt. Manager Camp PT. HLKL',
                'tujuan_1_berangkat_kepala_nama' => 'Theodorus Dedi',
                'tujuan_1_berangkat_kepala_nip' => '',
                'tujuan_1_berangkat_id_type' => 'NIP',

                'transit_3' => [],
                'transit_4' => [],
                'transit_5' => [],

                'kembali_tempat' => 'Samarinda',
                'kembali_tanggal' => '',
                'kembali_jabatan_pengesah' => 'Kepala Subbagian Tata Usaha',
                'kembali_nama_pejabat' => 'Dheny Mardiono, S.Hut., MSc.',
                'kembali_nip_pejabat' => '19750314 199903 1 004',

                'ppk_keterangan' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                'ppk_jabatan' => 'Pejabat Pembuat Komitmen,',
                'ppk_nama' => 'Ahmad Hidayat, S.PKP., M.Ling',
                'ppk_nip' => '19820301 200012 1 001',

                'catatan_lain' => '',
                'perhatian_text' => 'PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealphaannya.',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visum_spd_templates');
        Schema::dropIfExists('visum_spd_settings');
    }
};
