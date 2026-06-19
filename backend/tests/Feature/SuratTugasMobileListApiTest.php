<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuratTugasMobileListApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('user');
            $table->json('access_modules')->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('kpg_employees', function (Blueprint $table) {
            $table->id();
            $table->string('nip', 50)->unique();
            $table->string('nama_lengkap');
            $table->string('jabatan')->nullable();
            $table->string('pangkat_golongan')->nullable();
            $table->string('satuan_kerja')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('foto_profil')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('st_assignment_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_surat')->nullable()->unique();
            $table->string('kode_surat')->nullable();
            $table->string('template_type')->nullable();
            $table->text('dasar_hukum')->nullable();
            $table->text('maksud_tujuan');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->date('tanggal_surat')->nullable();
            $table->string('tempat_tujuan')->nullable();
            $table->string('status')->default('draft');
            $table->string('file_surat_path')->nullable();
            $table->string('sumber_dana')->nullable();
            $table->foreignId('created_by')->nullable();
            $table->foreignId('approved_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('st_assignment_letter_employees', function (Blueprint $table) {
            $table->id();
            $table->uuid('assignment_letter_id');
            $table->foreignId('employee_id');
            $table->string('peran')->nullable();
            $table->timestamps();
            $table->unique(['assignment_letter_id', 'employee_id'], 'st_al_employee_unique');
        });
    }

    public function test_management_list_returns_mobile_friendly_paginated_items(): void
    {
        $user = User::factory()->create([
            'username' => '198001012005011001',
            'role' => 'super_admin',
            'access_modules' => ['surat_tugas'],
        ]);
        $employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pegawai Satu',
            'jabatan' => 'Analis',
        ]);
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST.001/BKSDA/2026',
            'maksud_tujuan' => 'Patroli kawasan konservasi',
            'tanggal_mulai' => '2026-06-20',
            'tanggal_selesai' => '2026-06-21',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Samarinda',
            'status' => 'approved',
            'file_surat_path' => 'surat-tugas/st-001.pdf',
            'created_by' => $user->id,
        ]);
        $letter->employees()->sync([$employee->id]);

        Sanctum::actingAs($user);

        $this->getJson('/api/surat-tugas?mobile=true&page=1&per_page=20')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $letter->id)
            ->assertJsonPath('data.0.nomor', 'ST.001/BKSDA/2026')
            ->assertJsonPath('data.0.kegiatan', 'Patroli kawasan konservasi')
            ->assertJsonPath('data.0.tujuan', 'Samarinda')
            ->assertJsonPath('data.0.tanggal_mulai', '2026-06-20')
            ->assertJsonPath('data.0.tanggal_selesai', '2026-06-21')
            ->assertJsonPath('data.0.status', 'approved')
            ->assertJsonPath('data.0.personel_summary', 'Pegawai Satu')
            ->assertJsonPath('data.0.has_file', true)
            ->assertJsonPath('data.0.allowed_actions.can_view', true);
    }

    public function test_personal_list_returns_only_authenticated_employee_letters(): void
    {
        $employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pegawai Satu',
            'jabatan' => 'Analis',
        ]);
        $otherEmployee = Employee::create([
            'nip' => '199001012020011002',
            'nama_lengkap' => 'Pegawai Dua',
            'jabatan' => 'Pengendali Ekosistem Hutan',
        ]);
        $user = User::factory()->create([
            'username' => $employee->nip,
            'role' => 'user',
            'access_modules' => [],
        ]);
        $myLetter = AssignmentLetter::create([
            'nomor_surat' => 'ST.002/BKSDA/2026',
            'maksud_tujuan' => 'Monitoring satwa',
            'tanggal_mulai' => '2026-06-22',
            'tanggal_selesai' => '2026-06-23',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Balikpapan',
            'status' => 'approved',
            'file_surat_path' => 'surat-tugas/st-002.pdf',
            'created_by' => $user->id,
        ]);
        $otherLetter = AssignmentLetter::create([
            'nomor_surat' => 'ST.003/BKSDA/2026',
            'maksud_tujuan' => 'Rapat koordinasi',
            'tanggal_mulai' => '2026-06-24',
            'tanggal_selesai' => '2026-06-24',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Berau',
            'status' => 'approved',
            'created_by' => $user->id,
        ]);
        $myLetter->employees()->sync([$employee->id]);
        $otherLetter->employees()->sync([$otherEmployee->id]);

        Sanctum::actingAs($user);

        $this->getJson('/api/surat-tugas/my?page=1&per_page=20', ['X-Client' => 'mobile'])
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $myLetter->id)
            ->assertJsonPath('data.0.nomor', 'ST.002/BKSDA/2026')
            ->assertJsonPath('data.0.allowed_actions.can_download', true);
    }

    public function test_management_detail_returns_mobile_ready_payload(): void
    {
        $user = User::factory()->create([
            'username' => '198001012005011001',
            'role' => 'super_admin',
            'access_modules' => ['surat_tugas'],
        ]);
        $employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pegawai Satu',
            'jabatan' => 'Analis',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
        ]);
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST.004/BKSDA/2026',
            'kode_surat' => 'ST',
            'maksud_tujuan' => 'Pemeriksaan lapangan',
            'dasar_hukum' => 'Surat permohonan pemeriksaan',
            'tanggal_mulai' => '2026-06-25',
            'tanggal_selesai' => '2026-06-26',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Kutai Kartanegara',
            'status' => 'pending',
            'file_surat_path' => 'surat-tugas/st-004.pdf',
            'sumber_dana' => 'dipa',
            'created_by' => $user->id,
        ]);
        $letter->employees()->sync([$employee->id => ['peran' => 'Ketua Tim']]);

        Sanctum::actingAs($user);

        $this->getJson("/api/surat-tugas/{$letter->id}?mobile=true")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id)
            ->assertJsonPath('data.nomor', 'ST.004/BKSDA/2026')
            ->assertJsonPath('data.kegiatan', 'Pemeriksaan lapangan')
            ->assertJsonPath('data.dasar_hukum', 'Surat permohonan pemeriksaan')
            ->assertJsonPath('data.tujuan', 'Kutai Kartanegara')
            ->assertJsonPath('data.tanggal_mulai', '2026-06-25')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.personel.0.name', 'Pegawai Satu')
            ->assertJsonPath('data.personel.0.peran', 'Ketua Tim')
            ->assertJsonPath('data.file.available', true)
            ->assertJsonPath('data.file.download_url', "/api/surat-tugas/{$letter->id}/download")
            ->assertJsonPath('data.allowed_actions.can_approve', true);
    }

    public function test_personal_detail_returns_assigned_published_letter(): void
    {
        $employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pegawai Satu',
            'jabatan' => 'Analis',
        ]);
        $user = User::factory()->create([
            'username' => $employee->nip,
            'role' => 'user',
            'access_modules' => [],
        ]);
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST.005/BKSDA/2026',
            'maksud_tujuan' => 'Pendampingan kegiatan',
            'tanggal_mulai' => '2026-06-27',
            'tanggal_selesai' => '2026-06-28',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Bontang',
            'status' => 'approved',
            'file_surat_path' => 'surat-tugas/st-005.pdf',
            'created_by' => $user->id,
        ]);
        $letter->employees()->sync([$employee->id => ['peran' => 'Anggota']]);

        Sanctum::actingAs($user);

        $this->getJson("/api/surat-tugas/my/{$letter->id}", ['X-Client' => 'mobile'])
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id)
            ->assertJsonPath('data.personel.0.name', 'Pegawai Satu')
            ->assertJsonPath('data.file.download_url', "/api/surat-tugas/my/{$letter->id}/download")
            ->assertJsonPath('data.allowed_actions.can_update', false)
            ->assertJsonPath('data.allowed_actions.can_download', true);
    }

    public function test_personal_detail_returns_forbidden_for_unassigned_existing_letter(): void
    {
        $employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pegawai Satu',
            'jabatan' => 'Analis',
        ]);
        $otherEmployee = Employee::create([
            'nip' => '199001012020011002',
            'nama_lengkap' => 'Pegawai Dua',
            'jabatan' => 'Polhut',
        ]);
        $user = User::factory()->create([
            'username' => $employee->nip,
            'role' => 'user',
            'access_modules' => [],
        ]);
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST.006/BKSDA/2026',
            'maksud_tujuan' => 'Kegiatan terbatas',
            'tanggal_mulai' => '2026-06-29',
            'tanggal_selesai' => '2026-06-29',
            'tanggal_surat' => '2026-06-19',
            'tempat_tujuan' => 'Sangatta',
            'status' => 'approved',
            'created_by' => $user->id,
        ]);
        $letter->employees()->sync([$otherEmployee->id]);

        Sanctum::actingAs($user);

        $this->getJson("/api/surat-tugas/my/{$letter->id}", ['X-Client' => 'mobile'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak memiliki akses ke Surat Tugas ini.');
    }
}
