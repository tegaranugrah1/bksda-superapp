<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\StTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StTemplateTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;
    private User $admin;
    private Employee $signer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->create([
            'role' => 'super_admin',
            'username' => 'superadmin_template_test',
            'access_modules' => ['kepegawaian'],
        ]);
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'username' => 'admin_template_test',
            'access_modules' => ['kepegawaian'],
        ]);
        $this->signer = Employee::create([
            'nip' => '197405141999031001',
            'nama_lengkap' => 'M. Ari Wibawanto',
            'jabatan' => 'Kepala Balai',
            'satuan_kerja' => 'Kantor Balai',
            'is_active' => true,
        ]);
    }

    public function test_only_superadmin_can_create_template(): void
    {
        $payload = $this->payload();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/kepegawaian/st-templates', $payload)
            ->assertForbidden();

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson('/api/kepegawaian/st-templates', $payload)
            ->assertCreated();

        $response->assertJsonPath('data.code', 'perjalanan-dinas')
            ->assertJsonPath('data.default_signer.name', 'M. Ari Wibawanto');
    }

    public function test_superadmin_can_update_default_and_duplicate_template(): void
    {
        $template = StTemplate::create(array_merge($this->payload(), [
            'is_active' => true,
            'is_default' => false,
            'is_system' => false,
            'default_signer_employee_id' => $this->signer->id,
            'default_signer_name' => $this->signer->nama_lengkap,
            'default_signer_nip' => $this->signer->nip,
        ]));

        $this->actingAs($this->superadmin, 'sanctum')
            ->putJson("/api/kepegawaian/st-templates/{$template->id}", [
                'name' => 'Perjalanan Dinas Revisi',
                'code' => 'perjalanan-dinas',
                'type' => 'custom',
                'menimbang' => [['id' => 'm1', 'text' => 'Menimbang revisi;']],
                'dasar' => [],
                'default_signer_employee_id' => $this->signer->id,
                'is_active' => true,
                'is_default' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.version', 2);

        $this->actingAs($this->superadmin, 'sanctum')
            ->postJson("/api/kepegawaian/st-templates/{$template->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.is_default', false);
    }

    public function test_inactive_templates_are_hidden_from_regular_users(): void
    {
        $template = StTemplate::create(array_merge($this->payload(), [
            'is_active' => false,
            'is_default' => false,
            'is_system' => false,
        ]));

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/kepegawaian/st-templates')
            ->assertOk()
            ->assertJsonMissing(['id' => $template->id]);

        $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/kepegawaian/st-templates?include_inactive=true')
            ->assertOk()
            ->assertJsonFragment(['id' => $template->id]);
    }

    public function test_system_template_cannot_be_deleted(): void
    {
        $template = StTemplate::create(array_merge($this->payload(), [
            'code' => 'system-template',
            'is_active' => true,
            'is_default' => false,
            'is_system' => true,
        ]));

        $this->actingAs($this->superadmin, 'sanctum')
            ->deleteJson("/api/kepegawaian/st-templates/{$template->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Template sistem tidak dapat dihapus. Nonaktifkan template jika tidak digunakan.');
    }

    private function payload(): array
    {
        return [
            'name' => 'Perjalanan Dinas',
            'code' => 'perjalanan-dinas',
            'description' => 'Template test',
            'type' => 'custom',
            'menimbang' => [['id' => 'm1', 'text' => 'Menimbang test;']],
            'dasar' => [['id' => 'd1', 'text' => 'Dasar test;']],
            'default_signer_employee_id' => $this->signer->id,
            'is_active' => true,
            'is_default' => false,
        ];
    }
}
