<?php

namespace Tests\Feature;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeSeksiTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_is_seksi_and_seksi_wilayah_calculation(): void
    {
        $balai = Employee::create([
            'nip' => '198501012010011001',
            'nama_lengkap' => 'Pegawai Kantor Balai',
            'jabatan' => 'Analis Data',
            'satuan_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);

        $seksi1 = Employee::create([
            'nip' => '198501012010011002',
            'nama_lengkap' => 'Pegawai Seksi I',
            'jabatan' => 'Polisi Kehutanan',
            'satuan_kerja' => 'Seksi KSDA Wilayah I Berau',
            'is_active' => true,
        ]);

        $seksi2 = Employee::create([
            'nip' => '198501012010011003',
            'nama_lengkap' => 'Pegawai Seksi II',
            'jabatan' => 'Pengendali Ekosistem',
            'satuan_kerja' => 'Seksi KSDA Wilayah II Tenggarong',
            'is_active' => true,
        ]);

        $seksi3 = Employee::create([
            'nip' => '198501012010011004',
            'nama_lengkap' => 'Pegawai Seksi III',
            'jabatan' => 'Penyuluh Kehutanan',
            'satuan_kerja' => 'Seksi KSDA Wilayah III Balikpapan',
            'is_active' => true,
        ]);

        $this->assertFalse($balai->is_seksi);
        $this->assertNull($balai->seksi_wilayah);

        $this->assertTrue($seksi1->is_seksi);
        $this->assertEquals('I', $seksi1->seksi_wilayah);

        $this->assertTrue($seksi2->is_seksi);
        $this->assertEquals('II', $seksi2->seksi_wilayah);

        $this->assertTrue($seksi3->is_seksi);
        $this->assertEquals('III', $seksi3->seksi_wilayah);
    }

    public function test_employees_select_endpoint_returns_is_seksi_and_seksi_wilayah(): void
    {
        $user = \App\Models\User::factory()->create();

        Employee::create([
            'nip' => '198501012010011005',
            'nama_lengkap' => 'Budi Santoso',
            'jabatan' => 'Polisi Kehutanan',
            'satuan_kerja' => 'Seksi KSDA Wilayah II Tenggarong',
            'is_active' => true,
        ]);

        $res = $this->actingAs($user)->getJson('/api/kepegawaian/employees/select?q=Budi');

        $res->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Budi Santoso')
            ->assertJsonPath('data.0.is_seksi', true)
            ->assertJsonPath('data.0.seksi_wilayah', 'II');
    }

    public function test_employees_select_endpoint_defaults_to_large_limit_covering_all_employees(): void
    {
        $user = \App\Models\User::factory()->create();

        // Create 60 active employees
        for ($i = 1; $i <= 60; $i++) {
            Employee::create([
                'nip' => '19900101202001' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'nama_lengkap' => 'Pegawai Nomor ' . str_pad($i, 3, '0', STR_PAD_LEFT),
                'is_active' => true,
            ]);
        }

        // Default request without limit should return all 60 (not cut at 50)
        $res = $this->actingAs($user)->getJson('/api/kepegawaian/employees/select');
        $res->assertStatus(200);
        $this->assertGreaterThanOrEqual(60, count($res->json('data')));
    }
}
