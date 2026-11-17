<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Surat\Exports\SuratMasukExport;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Models\SuratKeluar;
use App\Modules\Surat\Models\SuratDisposisi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratModuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create([
            'username' => 'admin_surat',
            'role' => 'admin',
            'access_modules' => ['surat'],
        ]);

        $this->regularUser = User::factory()->create([
            'username' => 'staff_surat',
            'role' => 'pegawai',
            'access_modules' => ['surat'],
        ]);
    }

    public function test_can_list_surat_masuk(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1000',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.100/2026',
            'isi_ringkas' => 'Undangan Rapat',
            'asal_surat' => 'Dirjen KSDAE',
            'created_by' => $this->adminUser->id,
        ]);

        $this->actingAs($this->regularUser)
            ->getJson('/api/surat/surat-masuk')
            ->assertStatus(403);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonCount(1, 'data');
    }

    public function test_can_list_surat_masuk_with_pagination(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1002',
            'tanggal_agenda' => '2026-07-24',
            'no_surat' => 'S.102/2026',
            'isi_ringkas' => 'Surat Paginasi',
            'asal_surat' => 'Dirjen',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk?per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10);
    }

    public function test_regular_user_cannot_export_excel(): void
    {
        $response = $this->actingAs($this->regularUser)
            ->get('/api/surat/surat-masuk/export/excel');

        $response->assertStatus(403);
    }

    public function test_regular_user_cannot_create_surat_masuk(): void
    {
        $payload = [
            'no_agenda' => '999',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.999/2026',
            'isi_ringkas' => 'Unauthorized Surat',
        ];

        $response = $this->actingAs($this->regularUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_surat_masuk_with_disposisi(): void
    {
        $payload = [
            'no_agenda' => '1001',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.101/2026',
            'isi_ringkas' => 'Laporan Konservasi',
            'asal_surat' => 'Balai KSDA Jatim',
            'sifat_json' => ['Penting'],
            'disposisi' => [
                'catatan' => 'Segera tindaklanjuti',
            ],
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.no_agenda', '1001');

        $this->assertDatabaseHas('surat_masuk', [
            'no_agenda' => '1001',
        ]);
        $this->assertDatabaseHas('surat_disposisi', [
            'catatan' => 'Segera tindaklanjuti',
        ]);
    }

    public function test_cannot_create_duplicate_no_agenda(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1050',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1050/2026',
            'isi_ringkas' => 'Surat Pertama',
            'created_by' => $this->adminUser->id,
        ]);

        $payload = [
            'no_agenda' => '1050', // Duplikat
            'tanggal_agenda' => '2026-07-24',
            'no_surat' => 'S.1051/2026',
            'isi_ringkas' => 'Surat Kedua Yang Mencoba Menimpa',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        // Wajib menolak dengan 422 Unprocessable Content, bukan menimpa surat pertama
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['no_agenda']);

        // Data pertama tetap utuh
        $this->assertDatabaseHas('surat_masuk', [
            'no_agenda' => '1050',
            'isi_ringkas' => 'Surat Pertama',
        ]);
    }

    public function test_next_agenda_endpoint(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1099',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1099/2026',
            'created_by' => $this->adminUser->id,
        ]);

        $this->actingAs($this->regularUser)
            ->getJson('/api/surat/surat-masuk/next-agenda?year=2026')
            ->assertStatus(403);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk/next-agenda?year=2026');

        $response->assertStatus(200)
            ->assertJsonPath('next_agenda', '1100');
    }

    public function test_cascading_soft_delete_disposisi(): void
    {
        $surat = SuratMasuk::create([
            'no_agenda' => '1088',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1088/2026',
            'created_by' => $this->adminUser->id,
        ]);

        $disposisi = SuratDisposisi::create([
            'surat_masuk_id' => $surat->id,
            'catatan' => 'Catatan Disposisi Cascase',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/surat/surat-masuk/{$surat->id}");

        $response->assertStatus(200);

        // Keduanya wajib ter-soft-delete
        $this->assertSoftDeleted('surat_masuk', ['id' => $surat->id]);
        $this->assertSoftDeleted('surat_disposisi', ['id' => $disposisi->id]);
    }

    public function test_admin_can_create_surat_keluar(): void
    {
        $payload = [
            'no_surat' => 'S.500/K.18/TU/2026',
            'tanggal_surat' => '2026-07-23',
            'tujuan_surat' => 'Kepala BBKSDA Jatim',
            'perihal' => 'Koordinasi Data',
            'sifat' => 'Biasa',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-keluar', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.no_surat', 'S.500/K.18/TU/2026');

        $this->assertDatabaseHas('surat_keluar', [
            'no_surat' => 'S.500/K.18/TU/2026',
        ]);
    }

    public function test_can_fetch_surat_masuk_locations_with_surat_view(): void
    {
        $this->actingAs($this->regularUser)
            ->getJson('/api/surat-masuk/locations')
            ->assertStatus(403);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/surat-masuk/locations');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_surat_keluar_accepts_terdaftar_status_json_payload_and_rejects_oversized_payload(): void
    {
        $createRes = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-keluar', [
                'no_surat' => 'S.501/K.18/TU/2026',
                'tanggal_surat' => '2026-11-17',
                'tujuan_surat' => 'Kepala BKSDA',
                'perihal' => 'Uji Status Terdaftar',
                'status' => 'terdaftar',
                'document_payload' => json_encode(['templateType' => 'surat_dinas', 'perihal' => 'Uji']),
            ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.status', 'terdaftar')
            ->assertJsonPath('data.document_payload.templateType', 'surat_dinas');

        $id = $createRes->json('data.id');

        $this->actingAs($this->adminUser)
            ->putJson("/api/surat/surat-keluar/{$id}", [
                'no_surat' => 'S.501/K.18/TU/2026',
                'tanggal_surat' => '2026-11-17',
                'tujuan_surat' => 'Kepala BKSDA',
                'perihal' => 'Uji Status Terdaftar Revisi',
                'status' => 'terdaftar',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'terdaftar');

        $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-keluar', [
                'no_surat' => 'S.502/K.18/TU/2026',
                'tanggal_surat' => '2026-11-17',
                'tujuan_surat' => 'Kepala BKSDA',
                'perihal' => 'Uji Payload Terlalu Besar',
                'document_payload' => ['blob' => str_repeat('A', 600000)],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['document_payload']);
    }

    public function test_surat_masuk_export_validates_filters_and_search_escapes_wildcards(): void
    {
        SuratMasuk::create([
            'no_agenda' => '2001',
            'tanggal_agenda' => '2026-11-17',
            'no_surat' => '100%Literal_Test!',
            'isi_ringkas' => 'Exact wildcard check',
            'created_by' => $this->adminUser->id,
        ]);
        SuratMasuk::create([
            'no_agenda' => '2002',
            'tanggal_agenda' => '2026-11-17',
            'no_surat' => 'NormalLetter',
            'isi_ringkas' => 'Other letter',
            'created_by' => $this->adminUser->id,
        ]);

        // Unescaped '%' and '!'/'_' must NOT match unrelated NormalLetter
        $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk?search=%25')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.no_surat', '100%Literal_Test!');

        $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk?search=Literal_Test!')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.no_surat', '100%Literal_Test!');

        // Non-string sifat query must not crash Postgres JSON containment
        $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk?sifat[]=Penting')
            ->assertOk();

        // Valid Excel export with escaped search filter succeeds
        $this->actingAs($this->adminUser)
            ->get('/api/surat/surat-masuk/export/excel?search=%25')
            ->assertOk();

        // Malformed date in export Excel filter returns 422 cleanly instead of SQL 500
        $this->actingAs($this->adminUser)
            ->getJson('/api/surat/surat-masuk/export/excel?start_date=not-a-date')
            ->assertStatus(422);
    }

    public function test_surat_template_slug_collision_returns_422_and_non_numeric_route_is_rejected(): void
    {
        $superAdmin = User::factory()->create([
            'username' => 'superadmin_tpl_sec',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->actingAs($superAdmin)
            ->postJson('/api/surat/templates', [
                'key' => 'custom_surat',
                'nama' => 'Custom Surat',
            ])
            ->assertCreated();

        // Slugified duplicate ('Custom-Surat' -> 'custom_surat') must return 422 rather than SQL 500
        $this->actingAs($superAdmin)
            ->postJson('/api/surat/templates', [
                'key' => 'Custom-Surat',
                'nama' => 'Duplicate Slug',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['key']);

        // Punctuation-only key ('---' -> '') must return 422
        $this->actingAs($superAdmin)
            ->postJson('/api/surat/templates', [
                'key' => '---',
                'nama' => 'Empty Slug',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['key']);

        // Non-numeric mutation parameter is rejected at router (405 via GET key route) instead of TypeError 500
        $this->actingAs($superAdmin)
            ->deleteJson('/api/surat/templates/not-an-id')
            ->assertStatus(405);

        $this->actingAs($superAdmin)
            ->putJson('/api/surat/templates/not-an-id', ['nama' => 'Bypass'])
            ->assertStatus(405);
    }

    public function test_malformed_array_inputs_non_integer_fk_and_excel_formula_cells_are_handled_safely(): void
    {
        // Array search parameters must not trigger Array-to-string HTTP 500
        $this->actingAs($this->adminUser)->getJson('/api/surat/surat-masuk?search[]=abc')->assertOk();
        $this->actingAs($this->adminUser)->getJson('/api/surat/surat-keluar?search[]=abc')->assertOk();
        $this->actingAs($this->adminUser)->getJson('/api/surat/templates?search[]=abc')->assertOk();

        // Array scalar fields & non-integer FK strings must return 422 cleanly (never 500)
        $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-masuk', [
                'no_agenda' => '2099',
                'tanggal_agenda' => '2026-11-17',
                'no_surat' => ['nested-array'],
                'isi_ringkas' => str_repeat('x', 10001),
                'disposisi' => ['kepala_balai_id' => 'not-an-integer'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['no_surat', 'isi_ringkas', 'disposisi.kepala_balai_id']);

        $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-keluar', [
                'no_surat' => ['nested-array'],
                'tanggal_surat' => '2026-11-17',
                'tujuan_surat' => 'Kepala BKSDA',
                'perihal' => 'Uji array scalar & FK integer',
                'penandatangan_id' => 'not-an-integer',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['no_surat', 'penandatangan_id']);

        // Formula injection cells with leading control whitespace or formula triggers are prefixed with apostrophe
        $export = new SuratMasukExport();
        $row = new SuratMasuk([
            'no_agenda' => '=CMD()',
            'no_surat' => "\tfoo",
            'asal_surat' => "\n=1+1",
            'lampiran' => '-',
            'isi_ringkas' => 'Aman',
        ]);
        $mapped = $export->map($row);
        $this->assertSame("'=CMD()", $mapped[0]);
        $this->assertSame("'\tfoo", $mapped[2]);
        $this->assertSame("'\n=1+1", $mapped[4]);
        $this->assertSame('-', $mapped[5]);
        $this->assertSame('Aman', $mapped[6]);
    }
}
