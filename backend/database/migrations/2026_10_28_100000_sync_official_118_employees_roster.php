<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Data 4 personil PNS resmi sesuai daftar mutasi/pemutakhiran terbaru kepegawaian
     * BKSDA Kalimantan Timur (Total 118 ASN: 97 PNS + 21 PPPK, dan 33 MMP = 151 personil):
     * 1. Dwi Suriyanto (197504192007101002) - No. 57
     * 2. Didimus (197509192006041011) - No. 63
     * 3. Djunaib Ahmad (198007132000031002) - No. 67
     * 4. Khairul Falah (197708081998031004) - No. 70
     */
    protected array $officialRoster = [
        [
            'nip' => '197504192007101002',
            'nama_lengkap' => 'Dwi Suriyanto',
            'jabatan' => 'Polisi Kehutanan Mahir',
            'pangkat_golongan' => 'Penata Muda Tingkat I (III/b)',
            'satuan_kerja' => 'Seksi Konservasi Sumber Daya Alam Wilayah II',
        ],
        [
            'nip' => '197509192006041011',
            'nama_lengkap' => 'Didimus',
            'jabatan' => 'Pengolah Data dan Informasi',
            'pangkat_golongan' => 'Penata Muda (III/a)',
            'satuan_kerja' => 'Seksi Konservasi Sumber Daya Alam Wilayah II',
        ],
        [
            'nip' => '198007132000031002',
            'nama_lengkap' => 'Djunaib Ahmad',
            'jabatan' => 'Pengendali Ekosistem Hutan Mahir',
            'pangkat_golongan' => 'Pengatur Tingkat I (II/d)',
            'satuan_kerja' => 'Seksi Konservasi Sumber Daya Alam Wilayah I',
        ],
        [
            'nip' => '197708081998031004',
            'nama_lengkap' => 'Khairul Falah',
            'jabatan' => 'Pengolah Data dan Informasi',
            'pangkat_golongan' => 'Pengatur Tingkat I (II/d)',
            'satuan_kerja' => 'Seksi Konservasi Sumber Daya Alam Wilayah II',
        ],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = Carbon::now();

        foreach ($this->officialRoster as $row) {
            $existing = DB::table('kpg_employees')
                ->where('nip', $row['nip'])
                ->first();

            if ($existing) {
                DB::table('kpg_employees')
                    ->where('id', $existing->id)
                    ->update([
                        'nama_lengkap' => $row['nama_lengkap'],
                        'jabatan' => $row['jabatan'],
                        'pangkat_golongan' => $row['pangkat_golongan'],
                        'satuan_kerja' => $row['satuan_kerja'],
                        'is_active' => true,
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);
            } else {
                DB::table('kpg_employees')->insert([
                    'nip' => $row['nip'],
                    'nama_lengkap' => $row['nama_lengkap'],
                    'jabatan' => $row['jabatan'],
                    'pangkat_golongan' => $row['pangkat_golongan'],
                    'satuan_kerja' => $row['satuan_kerja'],
                    'is_active' => true,
                    'foto_profil' => null,
                    'resor' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                    'deleted_at' => null,
                ]);
            }

            // Pastikan akun user jika ada diaktifkan
            DB::table('users')
                ->where('username', $row['nip'])
                ->orWhere('name', $row['nama_lengkap'])
                ->update([
                    'is_active' => true,
                    'updated_at' => $now,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $now = Carbon::now();
        $nips = array_column($this->officialRoster, 'nip');

        DB::table('kpg_employees')
            ->whereIn('nip', $nips)
            ->update([
                'is_active' => false,
                'deleted_at' => $now,
                'updated_at' => $now,
            ]);
    }
};
