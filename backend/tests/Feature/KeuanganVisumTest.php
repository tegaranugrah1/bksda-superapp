<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KeuanganVisumTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_visum_templates_or_settings(): void
    {
        $this->getJson('/api/keuangan/visum/templates')->assertStatus(401);
        $this->getJson('/api/keuangan/visum/settings')->assertStatus(401);
    }

    public function test_regular_portal_employee_can_read_visum_templates_and_settings(): void
    {
        $employeeUser = User::factory()->create([
            'username' => '199901012025061001',
            'role' => 'user',
            'access_modules' => ['kepegawaian'], // No 'keuangan' module
        ]);

        Sanctum::actingAs($employeeUser);

        $resTemplates = $this->getJson('/api/keuangan/visum/templates');
        $resTemplates->assertStatus(200);
        $resTemplates->assertJsonPath('success', true);

        $resSettings = $this->getJson('/api/keuangan/visum/settings');
        $resSettings->assertStatus(200);
        $resSettings->assertJsonPath('success', true);
    }

    public function test_regular_portal_employee_cannot_mutate_visum_templates_or_settings(): void
    {
        $employeeUser = User::factory()->create([
            'username' => '199901012025061002',
            'role' => 'user',
            'access_modules' => ['kepegawaian'], // No 'keuangan' module
        ]);

        Sanctum::actingAs($employeeUser);

        // Cannot update settings
        $this->postJson('/api/keuangan/visum/settings', [
            'ppk' => ['name' => 'Hacked PPK'],
        ])->assertStatus(403);

        // Cannot create template
        $this->postJson('/api/keuangan/visum/templates', [
            'name' => 'Unauthorized Template',
        ])->assertStatus(403);
    }
}
