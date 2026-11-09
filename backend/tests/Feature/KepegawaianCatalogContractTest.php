<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\Kepegawaian\Services\StTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KepegawaianCatalogContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleted_codes_are_reserved_on_create_and_update(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'super_admin']), 'sanctum');
        foreach ([
            ['st-task-types', ['nama' => 'Dummy task', 'kode' => 'dummy-reserved', 'mode_lokasi' => 'tempat_saja', 'aturan_durasi' => 'fleksibel'], 'kode'],
            ['st-expense-templates', ['name' => 'Dummy expense', 'code' => 'dummy-reserved'], 'code'],
        ] as [$resource, $payload, $key]) {
            $url = '/api/kepegawaian/'.$resource;
            $id = $this->postJson($url, $payload)->assertCreated()->json('data.id');
            $this->deleteJson($url.'/'.$id)->assertOk();
            $this->postJson($url, $payload)->assertUnprocessable()->assertJsonValidationErrors($key);
            $payload[$key] = 'dummy-other';
            $otherId = $this->postJson($url, $payload)->assertCreated()->json('data.id');
            $this->putJson($url.'/'.$otherId, [$key => 'dummy-reserved'])->assertUnprocessable()->assertJsonValidationErrors($key);
            $this->putJson($url.'/'.$otherId, [$key => 'dummy-other'])->assertOk();
        }
    }

    public function test_generated_task_code_accounts_for_soft_deleted_rows(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'super_admin']), 'sanctum');
        $payload = ['nama' => 'Dummy Task Reuse', 'mode_lokasi' => 'tempat_saja', 'aturan_durasi' => 'fleksibel'];
        $id = $this->postJson('/api/kepegawaian/st-task-types', $payload)->assertCreated()->json('data.id');
        $this->deleteJson('/api/kepegawaian/st-task-types/'.$id)->assertOk();
        $this->postJson('/api/kepegawaian/st-task-types', $payload)->assertCreated()->assertJsonPath('data.kode', 'dummy_task_reuse_1');
    }

    public function test_expense_default_stays_active_across_all_writers(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'super_admin']), 'sanctum');
        $url = '/api/kepegawaian/st-expense-templates';
        $this->postJson($url, ['name' => 'Dummy invalid default', 'is_default' => true, 'is_active' => false])->assertUnprocessable();
        $id = $this->postJson($url, ['name' => 'Dummy active default', 'is_default' => true])->assertCreated()->json('data.id');
        $this->putJson($url.'/'.$id, ['is_active' => false])->assertUnprocessable();
        $this->patchJson($url.'/'.$id.'/toggle-active', ['is_active' => false])->assertUnprocessable();
        $this->assertTrue(StExpenseTemplate::findOrFail($id)->is_active);
        $other = $this->postJson($url, ['name' => 'Dummy inactive option', 'is_active' => false])->assertCreated()->json('data.id');
        $this->postJson($url.'/'.$other.'/set-default')->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertFalse(StExpenseTemplate::findOrFail($id)->is_default);
    }

    public function test_standalone_document_default_change_rolls_back_on_save_failure(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $old = StTemplate::create(['name' => 'Dummy old', 'code' => 'dummy-old', 'type' => 'custom', 'is_active' => true, 'is_default' => true]);
        $next = StTemplate::create(['name' => 'Dummy next', 'code' => 'dummy-next', 'type' => 'custom', 'is_active' => true, 'is_default' => false]);
        StTemplate::updating(function ($model) use ($next) {
            if ($model->id === $next->id && $model->is_default) throw new \RuntimeException('Dummy save failure');
        });
        try {
            app(StTemplateService::class)->setDefault($next, $admin->id);
            $this->fail('Dummy failing save should throw.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Dummy save failure', $exception->getMessage());
            $this->assertTrue($old->fresh()->is_default, 'The previous default must survive a failed replacement.');
            $this->assertFalse($next->fresh()->is_default);
        }
    }
}
