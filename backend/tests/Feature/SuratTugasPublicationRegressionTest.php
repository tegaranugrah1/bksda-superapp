<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\StTaskType;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuratTugasPublicationRegressionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (! app()->environment('testing') || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:'
            || ! empty(config('database.connections.sqlite.url'))) {
            throw new \LogicException('This fixture requires a disposable SQLite memory database.');
        }
        $this->artisan('migrate:fresh', ['--force' => true]);
        config(['auth.two_factor_enforce' => false, 'queue.default' => 'sync']);
        Storage::fake('local');
        Storage::fake('public');
        Bus::fake([ArchiveOfficialDocument::class]);
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
    }

    private function actor(string $role = 'admin', array $modules = ['surat_tugas'], array $permissions = []): array
    {
        static $sequence = 0;
        $nip = '90000000000000'.str_pad((string) ++$sequence, 4, '0', STR_PAD_LEFT);
        $employee = Employee::create(['nip' => $nip, 'nama_lengkap' => 'Dummy Person '.$sequence, 'is_active' => true]);
        $user = User::factory()->create([
            'name' => 'Dummy '.$sequence, 'username' => $nip, 'email' => $nip.'@example.test',
            'password' => 'DummyPassword123!', 'must_change_password' => false,
            'role' => $role, 'access_modules' => $modules, 'permissions' => $permissions, 'is_active' => true,
        ]);

        return [$user, $employee];
    }

    private function payload(Employee $employee, array $overrides = []): array
    {
        return array_replace([
            'nomor_surat' => 'ST/DUMMY/001', 'maksud_tujuan' => 'Dummy conservation assignment',
            'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-21',
            'sumber_dana' => 'dipa', 'employees' => [['id' => $employee->id]],
        ], $overrides);
    }

    private function letter(Employee $employee, array $overrides = []): AssignmentLetter
    {
        $data = $this->payload($employee, $overrides);
        unset($data['employees']);
        $letter = AssignmentLetter::create(array_replace(['status' => 'pending'], $data));
        $letter->employees()->attach($employee->id, ['peran' => 'Dummy original role']);

        return $letter;
    }

    private function state(): array
    {
        return [
            DB::table('st_assignment_letters')->orderBy('id')->get()->toJson(),
            DB::table('st_assignment_letter_employees')->orderBy('id')->get()->toJson(),
            DB::table('portal_notifications')->orderBy('id')->get()->toJson(),
            Storage::disk('local')->allFiles(),
        ];
    }

    public function test_public_submit_forces_pending_for_two_users_even_with_draft_or_approved_input(): void
    {
        foreach (['approved', 'draft'] as $status) {
            [$user, $employee] = $this->actor('user', []);
            Sanctum::actingAs($user);
            $response = $this->postJson('/api/surat-tugas/submit', $this->payload($employee, [
                'status' => $status, 'nomor_surat' => null,
            ]))->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.approved_by', null);
            $this->assertSame($user->id, $response->json('data.created_by'));
        }
        $this->assertSame(2, AssignmentLetter::where('status', 'pending')->count());
    }

    public function test_all_publication_writers_reject_missing_blank_or_placeholder_number_without_side_effects(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['store', 'update', 'approve', 'status'] as $writer) {
            foreach ([null, '   ', '${nomor_naskah}', 'ST.../K.18/TU/2026', 'ST.001/{klasifikasi}/2026', 'ST.…/DUMMY/2026'] as $number) {
                [, $employee] = $this->actor('user', []);
                $letter = $writer === 'store' ? null : $this->letter($employee, ['nomor_surat' => null]);
                $before = $this->state();
                $full = $this->payload($employee, ['status' => 'approved', 'nomor_surat' => $number]);
                $response = match ($writer) {
                    'store' => $this->postJson('/api/surat-tugas', $full),
                    'update' => $this->putJson('/api/surat-tugas/'.$letter->id, $full),
                    default => $this->putJson('/api/surat-tugas/'.$letter->id.'/'.$writer, [
                        'status' => 'approved', 'nomor_surat' => $number,
                    ]),
                };
                $response->assertUnprocessable()->assertJsonValidationErrors('nomor_surat');
                if (is_string($number) && trim($number) !== '') {
                    $response->assertJsonPath('errors.nomor_surat.0', 'Nomor surat harus diisi lengkap tanpa placeholder.');
                }
                $this->assertSame($before, $this->state(), $writer.' must not change document state');
                $this->assertSame(0, DB::transactionLevel());
            }
        }
        Event::assertNotDispatched(AdminInboxChanged::class);
        Event::assertNotDispatched(PortalNotificationCreated::class);
        Bus::assertNotDispatched(ArchiveOfficialDocument::class);
    }

    public function test_status_only_shortcuts_cannot_publish_missing_or_placeholder_numbers_already_stored(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach ([null, '${nomor_naskah}', 'ST.../DUMMY/2026'] as $number) {
            [, $employee] = $this->actor('user', []);
            $letter = $this->letter($employee, ['nomor_surat' => $number]);
            $before = $this->state();
            foreach (['approve' => 'approved', 'status' => 'completed'] as $endpoint => $status) {
                $this->putJson('/api/surat-tugas/'.$letter->id.'/'.$endpoint, ['status' => $status])
                    ->assertUnprocessable()->assertJsonValidationErrors('nomor_surat');
                $this->assertSame($before, $this->state());
            }
        }
    }

    public function test_all_writers_publish_complete_numbered_documents(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['store', 'update', 'approve', 'status'] as $writer) {
            [$forgedActor, $employee] = $this->actor('user', []);
            $letter = $writer === 'store' ? null : $this->letter($employee);
            $full = $this->payload($employee, ['status' => 'approved', 'approved_by' => $forgedActor->id]);
            $response = match ($writer) {
                'store' => $this->postJson('/api/surat-tugas', $full)->assertCreated(),
                'update' => $this->putJson('/api/surat-tugas/'.$letter->id, $full)->assertOk(),
                default => $this->putJson('/api/surat-tugas/'.$letter->id.'/'.$writer, [
                    'status' => 'APPROVED', 'approved_by' => $forgedActor->id,
                ])->assertOk(),
            };
            $response->assertJsonPath('data.status', 'approved')->assertJsonPath('data.nomor_surat', 'ST/DUMMY/001')
                ->assertJsonPath('data.approved_by', $admin->id);
            if ($writer === 'approve') {
                $response->assertJsonPath('message', 'Surat Tugas berhasil diterbitkan.');
            }
            $this->assertSame($admin->id, AssignmentLetter::findOrFail($response->json('data.id'))->approved_by);
        }
        $this->assertSame(4, AssignmentLetter::where('status', 'approved')->count());
        $this->putJson('/api/surat-tugas/'.$letter->id.'/status', ['status' => 'completed'])
            ->assertOk()->assertJsonPath('data.status', 'completed');
    }

    public function test_update_preserves_publication_actor_on_ordinary_edits_and_records_actor_on_explicit_completion(): void
    {
        [$originalApprover, $employee] = $this->actor();
        [$editor] = $this->actor();
        Sanctum::actingAs($editor);
        $letter = $this->letter($employee, ['status' => 'approved', 'approved_by' => $originalApprover->id]);
        $this->putJson('/api/surat-tugas/'.$letter->id, $this->payload($employee, ['approved_by' => $editor->id]))
            ->assertOk()->assertJsonPath('data.approved_by', $originalApprover->id);
        $this->assertSame($originalApprover->id, $letter->fresh()->approved_by);
        $this->putJson('/api/surat-tugas/'.$letter->id, $this->payload($employee, [
            'status' => 'completed', 'approved_by' => $originalApprover->id,
        ]))->assertOk()->assertJsonPath('data.approved_by', $editor->id);
        $this->assertSame($editor->id, $letter->fresh()->approved_by);
    }

    public function test_approval_checks_existing_required_document_fields_and_employee_membership(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach ([
            ['maksud_tujuan' => '    '], ['maksud_tujuan' => 'tiny'], ['sumber_dana' => null],
            ['tanggal_selesai' => '2026-11-19'], ['employees' => []],
        ] as $invalid) {
            [, $employee] = $this->actor('user', []);
            $letter = $this->letter($employee, array_diff_key($invalid, ['employees' => true]));
            if (array_key_exists('employees', $invalid)) {
                $letter->employees()->detach();
            }
            foreach (['approve', 'status'] as $endpoint) {
                $before = $this->state();
                $this->putJson('/api/surat-tugas/'.$letter->id.'/'.$endpoint, ['status' => 'approved'])
                    ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($invalid));
                $this->assertSame($before, $this->state());
            }
        }
    }

    public function test_approval_rejects_explicit_required_field_clears_against_the_merged_document(): void
    {
        [$admin, $employee] = $this->actor();
        Sanctum::actingAs($admin);
        $letter = $this->letter($employee);
        $before = $this->state();
        foreach (['maksud_tujuan', 'tanggal_mulai', 'tanggal_selesai', 'sumber_dana', 'employees'] as $field) {
            $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved', $field => null])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertSame($before, $this->state());
        }
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved', 'employees' => []])
            ->assertUnprocessable()->assertJsonValidationErrors('employees');
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', [
            'status' => 'approved', 'employees' => [['id' => 999999999]],
        ])->assertUnprocessable()->assertJsonValidationErrors('employees.0.id');
        $this->assertSame($before, $this->state());
    }

    public function test_approve_persists_canonical_builder_fields_and_replaces_employee_dates(): void
    {
        [$admin, $employee] = $this->actor();
        [, $replacement] = $this->actor('user', []);
        Sanctum::actingAs($admin);
        $letter = $this->letter($employee);
        $template = StTemplate::create([
            'name' => 'Dummy template', 'code' => 'dummy-publication', 'type' => 'custom',
            'version' => 3, 'is_active' => true, 'configuration' => ['keep' => 'default'],
        ]);
        $task = StTaskType::create(['nama' => 'Dummy task', 'kode' => 'dummy-publication']);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', $this->payload($replacement, [
            'status' => 'approved', 'maksud_tujuan' => 'Canonical builder activity', 'nama_kegiatan' => 'Legacy must lose',
            'template_id' => $template->id, 'task_type_id' => $task->id, 'sertakan_laporan' => false,
            'jumlah_buruh' => 2, 'keterangan' => 'Dummy note',
            'template_snapshot' => ['configuration' => ['untuk' => [['id' => 'one', 'text' => 'Dummy content']]]],
            'employees' => [[
                'id' => $replacement->id, 'peran' => 'Dummy replacement',
                'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-21',
            ]],
        ]))->assertOk();
        $letter->refresh()->load('employees');
        $this->assertSame('Canonical builder activity', $letter->maksud_tujuan);
        $this->assertEquals($template->id, $letter->template_id);
        $this->assertEquals(3, $letter->template_version);
        $this->assertEquals($task->id, $letter->task_type_id);
        $this->assertFalse($letter->sertakan_laporan);
        $this->assertSame(2, $letter->jumlah_buruh);
        $this->assertSame('Dummy note', $letter->keterangan);
        $this->assertSame('default', $letter->template_snapshot['configuration']['keep']);
        $this->assertSame('Dummy content', $letter->template_snapshot['configuration']['untuk'][0]['text']);
        $this->assertEquals([$replacement->id], $letter->employees->modelKeys());
        $this->assertSame('2026-11-20', $letter->employees->sole()->pivot->tanggal_mulai->format('Y-m-d'));
        $this->assertSame($admin->id, $letter->approved_by);
    }

    public function test_update_and_approve_preserve_omissions_and_accept_false_zero_and_explicit_null_clears(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['update', 'approve'] as $writer) {
            [, $employee] = $this->actor('user', []);
            $task = StTaskType::firstOrFail();
            $template = StTemplate::create(['name' => 'Dummy '.$writer, 'code' => 'dummy-'.$writer, 'is_active' => true]);
            $letter = $this->letter($employee, [
                'template_id' => $template->id, 'template_version' => 1, 'task_type_id' => $task->id,
                'sertakan_laporan' => true, 'has_seksi_employee' => true, 'jumlah_buruh' => 4,
                'keterangan' => 'Clear me', 'tempat_tujuan' => 'Dummy destination',
                'tembusan' => ['Dummy copy'], 'penandatangan_nama' => 'Keep omitted signer',
                'template_snapshot' => ['configuration' => ['untuk' => [['id' => 'old', 'text' => 'Old item']]]],
            ]);
            $url = '/api/surat-tugas/'.$letter->id.($writer === 'approve' ? '/approve' : '');
            $changes = [
                'sertakan_laporan' => false, 'has_seksi_employee' => false, 'jumlah_buruh' => 0,
                'template_id' => null, 'template_type' => 'standard', 'task_type_id' => null, 'keterangan' => null,
                'tempat_tujuan' => null, 'tembusan' => null,
                'template_snapshot' => ['configuration' => ['untuk' => [], 'show_departure_column' => false]],
            ];
            $this->putJson($url, $writer === 'update' ? $this->payload($employee, $changes) : $changes)->assertOk();
            $letter->refresh();
            $this->assertFalse($letter->sertakan_laporan);
            $this->assertFalse($letter->has_seksi_employee);
            $this->assertSame(0, $letter->jumlah_buruh);
            foreach (['template_id', 'template_version', 'task_type_id', 'keterangan', 'tempat_tujuan', 'tembusan'] as $field) {
                $this->assertNull($letter->$field, $writer.' must clear '.$field);
            }
            $this->assertSame('Keep omitted signer', $letter->penandatangan_nama);
            $this->assertSame([], $letter->template_snapshot['configuration']['untuk']);
            $this->assertFalse($letter->template_snapshot['configuration']['show_departure_column']);
            $clear = ['template_snapshot' => null];
            $this->putJson($url, $writer === 'update' ? $this->payload($employee, $clear) : $clear)->assertOk();
            $this->assertNull($letter->fresh()->template_snapshot);
        }
    }

    public function test_legacy_alias_is_accepted_but_cannot_override_an_explicit_canonical_clear(): void
    {
        [$admin, $employee] = $this->actor();
        Sanctum::actingAs($admin);
        $letter = $this->letter($employee);
        $url = '/api/surat-tugas/'.$letter->id.'/approve';
        $this->putJson($url, ['nama_kegiatan' => 'Legacy activity compatibility'])->assertOk();
        $this->assertSame('Legacy activity compatibility', $letter->fresh()->maksud_tujuan);
        $before = $this->state();
        $this->putJson($url, [
            'status' => 'approved', 'maksud_tujuan' => null, 'nama_kegiatan' => 'Do not restore this alias',
        ])->assertUnprocessable()->assertJsonValidationErrors('maksud_tujuan');
        $this->assertSame($before, $this->state());
    }

    public function test_failed_publication_does_not_change_fields_pivots_uploads_or_notifications(): void
    {
        [$admin, $employee] = $this->actor();
        [, $replacement] = $this->actor('user', []);
        Sanctum::actingAs($admin);
        $letter = $this->letter($employee, ['nomor_surat' => null, 'file_surat_path' => 'dummy/original.pdf']);
        Storage::disk('local')->put('dummy/original.pdf', 'DUMMY ORIGINAL');
        $before = $this->state();
        $this->post('/api/surat-tugas/'.$letter->id, $this->payload($replacement, [
            '_method' => 'PUT', 'status' => 'approved', 'nomor_surat' => null,
            'maksud_tujuan' => 'Must not be persisted', 'jumlah_buruh' => 9,
            'file_surat' => UploadedFile::fake()->createWithContent('replacement.pdf', "%PDF-1.4\nDUMMY\n%%EOF"),
        ]), ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('nomor_surat');
        $this->assertSame($before, $this->state());
        $this->assertSame('DUMMY ORIGINAL', Storage::disk('local')->get('dummy/original.pdf'));
        Bus::assertNotDispatched(ArchiveOfficialDocument::class);
        Event::assertNotDispatched(AdminInboxChanged::class);
        Event::assertNotDispatched(PortalNotificationCreated::class);
    }

    public function test_published_documents_cannot_be_made_drafts_or_have_their_number_cleared(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['approved', 'completed', 'published', 'diterbitkan', 'APPROVED'] as $status) {
            [, $employee] = $this->actor('user', []);
            $letter = $this->letter($employee, ['status' => $status]);
            $before = $this->state();
            $this->putJson('/api/surat-tugas/'.$letter->id, $this->payload($employee, ['status' => 'draft']))
                ->assertUnprocessable()->assertJsonValidationErrors('status');
            foreach (['', '/approve'] as $suffix) {
                $changes = ['nomor_surat' => null];
                $this->putJson('/api/surat-tugas/'.$letter->id.$suffix, $suffix === '' ? $this->payload($employee, $changes) : $changes)
                    ->assertUnprocessable()->assertJsonValidationErrors('nomor_surat');
            }
            $this->assertSame($before, $this->state());
        }
    }

    public function test_drafts_notify_employees_only_after_explicit_submission_or_publication(): void
    {
        [$admin] = $this->actor();
        [$recipient, $employee] = $this->actor('user', []);
        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/surat-tugas', $this->payload($employee, ['status' => 'draft', 'nomor_surat' => null]))
            ->assertCreated()->assertJsonPath('data.status', 'draft');
        $id = $response->json('data.id');
        $this->assertDatabaseMissing('portal_notifications', ['reference_id' => $id]);
        Event::assertNotDispatched(PortalNotificationCreated::class);
        Event::assertDispatched(AdminInboxChanged::class);
        $this->putJson('/api/surat-tugas/'.$id, $this->payload($employee, ['status' => 'draft', 'nomor_surat' => null]))
            ->assertOk()->assertJsonPath('data.status', 'draft');
        $this->assertDatabaseMissing('portal_notifications', ['reference_id' => $id]);
        $this->putJson('/api/surat-tugas/'.$id.'/approve', ['status' => 'pending'])
            ->assertOk()->assertJsonPath('data.status', 'pending');
        $notices = DB::table('portal_notifications')->where('reference_id', $id)->orderBy('id')->get();
        $this->assertCount(1, $notices);
        $this->assertSame($recipient->id, $notices->sole()->user_id);
        $this->assertSame($employee->id, $notices->sole()->employee_id);
        $this->assertSame('pending', json_decode($notices->sole()->data, true)['status']);
        $this->putJson('/api/surat-tugas/'.$id.'/approve', ['status' => 'approved', 'nomor_surat' => 'ST/DUMMY/001'])
            ->assertOk()->assertJsonPath('data.status', 'approved');
        $notices = DB::table('portal_notifications')->where('reference_id', $id)->orderBy('id')->get();
        $this->assertCount(2, $notices);
        $this->assertSame($recipient->id, $notices->last()->user_id);
        $this->assertSame('Surat Tugas Diterbitkan', $notices->last()->title);
        $this->assertSame('approved', json_decode($notices->last()->data, true)['status']);
    }

    public function test_partial_approval_save_of_a_draft_does_not_notify_employees(): void
    {
        [$admin] = $this->actor();
        [, $employee] = $this->actor('user', []);
        Sanctum::actingAs($admin);
        $letter = $this->letter($employee, ['status' => 'DRAFT', 'nomor_surat' => null]);

        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['keterangan' => 'Private draft edit'])
            ->assertOk()->assertJsonPath('data.status', 'DRAFT');

        $this->assertSame('Private draft edit', $letter->fresh()->keterangan);
        $this->assertDatabaseCount('portal_notifications', 0);
        Event::assertNotDispatched(PortalNotificationCreated::class);
        Event::assertDispatched(AdminInboxChanged::class);
        Bus::assertNotDispatched(ArchiveOfficialDocument::class);
    }

    public function test_partial_snapshot_signer_edits_preserve_omissions_and_allow_explicit_clears(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['update', 'approve'] as $writer) {
            [, $employee] = $this->actor('user', []);
            $letter = $this->letter($employee, ['template_snapshot' => [
                'signer' => ['name' => 'Original signer', 'nip' => '900000000000000001', 'employee_id' => $employee->id],
                'menimbang' => [['id' => 'old', 'text' => 'Old consideration']],
                'configuration' => ['untuk' => [['id' => 'old', 'text' => 'Old task']], 'keep' => true],
            ]]);
            $url = '/api/surat-tugas/'.$letter->id.($writer === 'approve' ? '/approve' : '');
            foreach ([
                ['signer' => ['name' => 'Edited signer'], 'menimbang' => [], 'configuration' => ['untuk' => []]],
                ['signer' => ['nip' => null]],
                ['signer' => null],
                ['signer' => []],
                null,
            ] as $index => $snapshot) {
                $changes = ['template_snapshot' => $snapshot];
                $this->putJson($url, $writer === 'update' ? $this->payload($employee, $changes) : $changes)->assertOk();
                $actual = $letter->fresh()->template_snapshot;
                if ($index === 0) {
                    $this->assertSame(['name' => 'Edited signer', 'nip' => '900000000000000001', 'employee_id' => $employee->id], $actual['signer']);
                    $this->assertSame([], $actual['menimbang']);
                    $this->assertSame(['untuk' => [], 'keep' => true], $actual['configuration']);
                } elseif ($index === 1) {
                    $this->assertSame(['name' => 'Edited signer', 'nip' => null, 'employee_id' => $employee->id], $actual['signer']);
                } elseif ($index === 4) {
                    $this->assertNull($actual);
                } else {
                    $this->assertSame($snapshot['signer'], $actual['signer']);
                }
            }
        }
    }

    public function test_all_writers_block_intermediate_unpublication_and_subsequent_draft_or_number_clear(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['approved', 'completed', 'published', 'diterbitkan', 'APPROVED'] as $status) {
            foreach (['update', 'approve', 'status'] as $writer) {
                foreach (['PENDING', 'REJECTED'] as $intermediate) {
                    [, $employee] = $this->actor('user', []);
                    $letter = $this->letter($employee, ['status' => $status]);
                    $before = $this->state();
                    $changes = ['status' => $intermediate];
                    $url = '/api/surat-tugas/'.$letter->id.($writer === 'update' ? '' : '/'.$writer);
                    $this->putJson($url, $writer === 'update' ? $this->payload($employee, $changes) : $changes)
                        ->assertUnprocessable()->assertJsonValidationErrors('status');
                    $this->assertSame($before, $this->state());

                    $this->putJson('/api/surat-tugas/'.$letter->id, $this->payload($employee, ['status' => 'draft']))
                        ->assertUnprocessable()->assertJsonValidationErrors('status');
                    foreach (['update', 'approve', 'status'] as $nextWriter) {
                        $clear = ['nomor_surat' => null];
                        if ($nextWriter === 'status') {
                            $clear['status'] = 'approved';
                        }
                        $nextUrl = '/api/surat-tugas/'.$letter->id.($nextWriter === 'update' ? '' : '/'.$nextWriter);
                        $this->putJson($nextUrl, $nextWriter === 'update' ? $this->payload($employee, $clear) : $clear)
                            ->assertUnprocessable()->assertJsonValidationErrors('nomor_surat');
                        $this->assertSame($before, $this->state());
                    }
                    $this->assertSame(0, DB::transactionLevel());
                }
            }
        }
        Event::assertNotDispatched(AdminInboxChanged::class);
        Event::assertNotDispatched(PortalNotificationCreated::class);
        Bus::assertNotDispatched(ArchiveOfficialDocument::class);
    }

    public function test_pending_and_rejected_documents_remain_revisable_and_can_be_resubmitted(): void
    {
        [$admin] = $this->actor();
        Sanctum::actingAs($admin);
        foreach (['pending', 'rejected'] as $status) {
            [, $employee] = $this->actor('user', []);
            $letter = $this->letter($employee, ['status' => $status]);
            $url = '/api/surat-tugas/'.$letter->id;
            $this->putJson($url, $this->payload($employee, ['status' => 'draft', 'nomor_surat' => null]))
                ->assertOk()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.nomor_surat', null);
            $this->putJson($url.'/approve', ['status' => 'pending'])->assertOk()->assertJsonPath('data.status', 'pending');
            $this->putJson($url.'/status', ['status' => 'rejected'])->assertOk()->assertJsonPath('data.status', 'rejected');
            $this->putJson($url, $this->payload($employee, ['status' => 'pending', 'nomor_surat' => null]))
                ->assertOk()->assertJsonPath('data.status', 'pending');
            $this->putJson($url.'/approve', ['status' => 'approved', 'nomor_surat' => 'ST/DUMMY/REVISION'])
                ->assertOk()->assertJsonPath('data.status', 'approved');
        }
    }

    public function test_non_admin_update_cannot_publish_and_permission_approver_still_can(): void
    {
        [$creator, $employee] = $this->actor('user', ['surat_tugas']);
        Sanctum::actingAs($creator);
        $letter = $this->letter($employee, ['created_by' => $creator->id]);
        $before = $this->state();
        $this->putJson('/api/surat-tugas/'.$letter->id, $this->payload($employee, ['status' => 'approved']))
            ->assertForbidden();
        $this->assertSame($before, $this->state());
        $this->assertSame(0, DB::transactionLevel());
        [$approver] = $this->actor('user', ['surat_tugas'], ['surat_tugas.approve']);
        Sanctum::actingAs($approver);
        $this->putJson('/api/surat-tugas/'.$letter->id.'/approve', ['status' => 'approved'])
            ->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertSame($approver->id, $letter->fresh()->approved_by);
    }

    public function test_status_publication_keeps_conflict_checks_and_permission_scoped_privacy(): void
    {
        [$approver] = $this->actor('user', ['surat_tugas'], ['surat_tugas.approve']);
        [, $employee] = $this->actor('user', []);
        Sanctum::actingAs($approver);
        $letter = $this->letter($employee);
        EmployeeLeaveRequest::create([
            'employee_id' => $employee->id, 'jenis_cuti' => 'Cuti Sakit', 'alasan_cuti' => 'DUMMY PRIVATE REASON',
            'tanggal_pengajuan' => '2026-11-01', 'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-21', 'jumlah_hari' => 2, 'status' => 'approved',
            'alamat_menjalankan_cuti' => 'Dummy address',
        ]);
        $before = $this->state();
        $this->putJson('/api/surat-tugas/'.$letter->id.'/status', ['status' => 'approved'])
            ->assertUnprocessable()->assertJsonPath('conflicts.0.type', 'cuti');
        $this->assertSame($before, $this->state());
        [$unprivileged] = $this->actor('user', ['surat_tugas']);
        Sanctum::actingAs($unprivileged);
        foreach (['approve', 'status'] as $endpoint) {
            $this->putJson('/api/surat-tugas/'.$letter->id.'/'.$endpoint, ['status' => 'approved'])->assertForbidden();
        }
        $public = $this->postJson('/api/surat-tugas/check-conflicts', [
            'employees' => [$employee->id], 'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-21',
        ])->assertOk();
        $this->assertStringNotContainsString('DUMMY PRIVATE REASON', $public->getContent());
        $this->assertSame($before, $this->state());
    }

    /**
     * EXT-03: DIPA, FOLU, dan anggaran non-DIPA/lainnya dengan persistensi snapshot template.
     */
    public function test_ext03_budget_source_resolution_dipa_folu_and_other_with_snapshot(): void
    {
        [$admin, $employee] = $this->actor('admin', ['surat_tugas']);
        Sanctum::actingAs($admin);

        $budgets = [
            ['source' => 'dipa', 'other' => null, 'number' => 'ST/DIPA/001', 'start' => '2026-11-20', 'end' => '2026-11-21'],
            ['source' => 'folu', 'other' => null, 'number' => 'ST/FOLU/002', 'start' => '2026-11-22', 'end' => '2026-11-23'],
            ['source' => 'other', 'other' => 'Swadana Mitra RHO', 'number' => 'ST/OTHER/003', 'start' => '2026-11-24', 'end' => '2026-11-25'],
        ];

        foreach ($budgets as $b) {
            $response = $this->postJson('/api/surat-tugas', $this->payload($employee, [
                'nomor_surat' => $b['number'],
                'sumber_dana' => $b['source'],
                'sumber_dana_other' => $b['other'],
                'tanggal_mulai' => $b['start'],
                'tanggal_selesai' => $b['end'],
                'status' => 'pending',
                'maksud_tujuan' => "Kegiatan dengan anggaran {$b['source']}",
            ]))->assertCreated();

            $id = $response->json('data.id');
            $letter = AssignmentLetter::findOrFail($id);
            $this->assertSame($b['source'], $letter->sumber_dana);
            $this->assertSame($b['other'], $letter->sumber_dana_other);

            // Periksa via GET show endpoint
            $getRes = $this->getJson("/api/surat-tugas/{$id}")->assertOk();
            $this->assertSame($b['source'], $getRes->json('data.sumber_dana'));
            $this->assertSame($b['other'], $getRes->json('data.sumber_dana_other'));
        }
    }

    /**
     * EXT-04: Edit builder, simpan, reload, dan verifikasi kesesuaian seluruh field dokumen.
     */
    public function test_ext04_edit_builder_save_resubmit_reload_and_full_field_comparison(): void
    {
        [$admin, $emp1] = $this->actor('admin', ['surat_tugas']);
        [, $emp2] = $this->actor('user', []);
        Sanctum::actingAs($admin);

        $template = StTemplate::create([
            'name' => 'Template Audit Lapangan',
            'code' => 'tmpl-audit-lapangan',
            'type' => 'custom',
            'version' => 1,
            'is_active' => true,
        ]);
        $task = StTaskType::create(['nama' => 'Patroli Khusus', 'kode' => 'patroli-khusus']);

        $initial = $this->postJson('/api/surat-tugas', $this->payload($emp1, [
            'status' => 'pending',
            'nomor_surat' => 'ST/INIT/001',
            'maksud_tujuan' => 'Kegiatan awal sebelum diedit',
        ]))->assertCreated();

        $id = $initial->json('data.id');

        $fullPayload = [
            'nomor_surat' => 'ST.456/K.18/TU/KAP.03.02/B/11/2026',
            'kode_surat' => 'K.18/TU/KAP.03.02/B',
            'tanggal_surat' => '2026-11-15',
            'maksud_tujuan' => 'Melaksanakan patroli SMART RBM dan inventarisasi flora fauna kawasan konservasi',
            'dasar_hukum' => 'DIPA BKSDA Kalimantan Timur TA 2026',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-25',
            'tempat_tujuan' => 'Cagar Alam Teluk Adang',
            'sumber_dana' => 'dipa',
            'sumber_dana_other' => null,
            'template_type' => 'custom',
            'template_id' => $template->id,
            'task_type_id' => $task->id,
            'sertakan_laporan' => true,
            'has_seksi_employee' => true,
            'jumlah_buruh' => 4,
            'menimbang' => [
                ['id' => 'm1', 'text' => 'Menimbang butir kesatu'],
                ['id' => 'm2', 'text' => 'Menimbang butir kedua'],
            ],
            'dasar' => [
                ['id' => 'd1', 'text' => 'Dasar hukum nomor satu'],
                ['id' => 'd2', 'text' => 'Dasar hukum nomor dua'],
            ],
            'tembusan' => ['Direktur Jenderal KSDAE', 'Sekretaris Ditjen KSDAE'],
            'penandatangan_nama' => 'Dr. M. Ari Wibowo, S.Hut., M.Sc.',
            'penandatangan_nip' => '197508152000031001',
            'nama_plh' => 'Pelaksana Harian Kasubag TU',
            'tanda_setuju' => 'Disetujui Kepala Balai',
            'keterangan' => 'Membawa logistik lapangan dan kamera jebak',
            'template_snapshot' => [
                'name' => 'Snapshot Template RBM',
                'configuration' => [
                    'tembusan_items' => ['Direktur Jenderal KSDAE', 'Sekretaris Ditjen KSDAE'],
                    'custom_klausul' => 'Wajib membuat laporan 3 hari pasca tugas',
                ],
            ],
            'employees' => [
                [
                    'id' => $emp1->id,
                    'peran' => 'Ketua Tim',
                    'tanggal_mulai' => '2026-11-20',
                    'tanggal_selesai' => '2026-11-25',
                ],
                [
                    'id' => $emp2->id,
                    'peran' => 'Anggota Tim Lapangan',
                    'tanggal_mulai' => '2026-11-20',
                    'tanggal_selesai' => '2026-11-23',
                ],
            ],
            'status' => 'approved',
        ];

        // Simpan edit dan ajukan penerbitan
        $this->putJson("/api/surat-tugas/{$id}", $fullPayload)->assertOk();

        // Reload data secara utuh via GET
        $getRes = $this->getJson("/api/surat-tugas/{$id}")->assertOk();
        $doc = $getRes->json('data');

        $this->assertSame($fullPayload['nomor_surat'], $doc['nomor_surat']);
        $this->assertSame($fullPayload['kode_surat'], $doc['kode_surat']);
        $this->assertSame($fullPayload['tanggal_surat'], $doc['tanggal_surat']);
        $this->assertSame($fullPayload['maksud_tujuan'], $doc['maksud_tujuan']);
        $this->assertSame($fullPayload['dasar_hukum'], $doc['dasar_hukum']);
        $this->assertSame($fullPayload['tanggal_mulai'], $doc['tanggal_mulai']);
        $this->assertSame($fullPayload['tanggal_selesai'], $doc['tanggal_selesai']);
        $this->assertSame($fullPayload['tempat_tujuan'], $doc['tempat_tujuan']);
        $this->assertSame($fullPayload['sumber_dana'], $doc['sumber_dana']);
        $this->assertSame($fullPayload['template_id'], $doc['template_id']);
        $this->assertSame($fullPayload['task_type_id'], $doc['task_type_id']);
        $this->assertTrue($doc['sertakan_laporan']);
        $this->assertTrue($doc['has_seksi_employee']);
        $this->assertSame(4, $doc['jumlah_buruh']);
        $this->assertSame($fullPayload['menimbang'], $doc['menimbang']);
        $this->assertSame($fullPayload['dasar'], $doc['dasar']);
        $this->assertSame($fullPayload['tembusan'], $doc['tembusan']);
        $this->assertSame($fullPayload['penandatangan_nama'], $doc['penandatangan_nama']);
        $this->assertSame($fullPayload['penandatangan_nip'], $doc['penandatangan_nip']);
        $this->assertSame($fullPayload['nama_plh'], $doc['nama_plh']);
        $this->assertSame($fullPayload['tanda_setuju'], $doc['tanda_setuju']);
        $this->assertSame($fullPayload['keterangan'], $doc['keterangan']);
        $this->assertSame('approved', $doc['status']);

        // Verifikasi kesesuaian pivot employees
        $this->assertCount(2, $doc['employees']);
        $emp1Found = collect($doc['employees'])->firstWhere('id', $emp1->id);
        $emp2Found = collect($doc['employees'])->firstWhere('id', $emp2->id);

        $this->assertNotNull($emp1Found);
        $this->assertSame('Ketua Tim', $emp1Found['pivot']['peran']);
        $this->assertSame('2026-11-20', substr((string)$emp1Found['pivot']['tanggal_mulai'], 0, 10));
        $this->assertSame('2026-11-25', substr((string)$emp1Found['pivot']['tanggal_selesai'], 0, 10));

        $this->assertNotNull($emp2Found);
        $this->assertSame('Anggota Tim Lapangan', $emp2Found['pivot']['peran']);
        $this->assertSame('2026-11-20', substr((string)$emp2Found['pivot']['tanggal_mulai'], 0, 10));
        $this->assertSame('2026-11-23', substr((string)$emp2Found['pivot']['tanggal_selesai'], 0, 10));
    }

    /**
     * EXT-07: Tanggal pivot berbeda per peserta, PLH, dan peran tenaga lapangan.
     */
    public function test_ext07_pivot_dates_per_employee_plh_and_tenaga_lapangan(): void
    {
        [$admin, $emp1] = $this->actor('admin', ['surat_tugas']);
        [, $emp2] = $this->actor('user', []);
        Sanctum::actingAs($admin);

        // Surat dibuat: Emp 1 aktif 20-22 Nov, Emp 2 aktif 23-25 Nov
        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST/DIFF/2026/001',
            'maksud_tujuan' => 'Kegiatan dengan jadwal bertahap',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-25',
            'sumber_dana' => 'dipa',
            'status' => 'approved',
            'nama_plh' => 'H. Rahmat, S.Hut',
            'created_by' => $admin->id,
            'approved_by' => $admin->id,
        ]);

        $letter->employees()->attach([
            $emp1->id => ['peran' => 'Ketua Tim', 'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-22'],
            $emp2->id => ['peran' => 'Tenaga Lapangan', 'tanggal_mulai' => '2026-11-23', 'tanggal_selesai' => '2026-11-25'],
        ]);

        $conflictService = app(\App\Modules\SuratTugas\Services\AssignmentLetterConflictService::class);

        // Emp 1 dicek tanggal 24 Nov (di luar jadwal pivotnya 20-22) -> TIDAK BENTROK
        $resEmp1Free = $conflictService->checkConflicts(
            [['id' => $emp1->id, 'tanggal_mulai' => '2026-11-24', 'tanggal_selesai' => '2026-11-25']],
            '2026-11-24',
            '2026-11-25'
        );
        $this->assertFalse($resEmp1Free['has_conflict']);

        // Emp 2 dicek tanggal 24 Nov (dalam jadwal pivotnya 23-25) -> BENTROK!
        $resEmp2Busy = $conflictService->checkConflicts(
            [['id' => $emp2->id, 'tanggal_mulai' => '2026-11-24', 'tanggal_selesai' => '2026-11-25']],
            '2026-11-24',
            '2026-11-25',
            null,
            true
        );
        $this->assertTrue($resEmp2Busy['has_conflict']);
        $this->assertSame($letter->nomor_surat, $resEmp2Busy['conflicts'][0]['nomor']);

        // Emp 1 dicek tanggal 21 Nov (dalam jadwal pivotnya) -> BENTROK!
        $resEmp1Busy = $conflictService->checkConflicts(
            [['id' => $emp1->id, 'tanggal_mulai' => '2026-11-21', 'tanggal_selesai' => '2026-11-21']],
            '2026-11-21',
            '2026-11-21'
        );
        $this->assertTrue($resEmp1Busy['has_conflict']);
    }

    /**
     * EXT-10: Notifikasi / Live inbox tanpa reload dan event broadcasting WebSocket.
     */
    public function test_ext10_live_inbox_and_websocket_broadcast_matrix(): void
    {
        [$admin, $emp1] = $this->actor('admin', ['surat_tugas']);
        [, $emp2] = $this->actor('user', []);
        Sanctum::actingAs($admin);

        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);

        // 1. Simpan Draft -> TIDAK memicu notifikasi pegawai, memicu AdminInboxChanged 'created'
        $createRes = $this->postJson('/api/surat-tugas', $this->payload($emp1, [
            'status' => 'draft',
            'nomor_surat' => null,
            'employees' => [['id' => $emp1->id], ['id' => $emp2->id]],
        ]))->assertCreated();

        $id = $createRes->json('data.id');
        Event::assertNotDispatched(PortalNotificationCreated::class);
        Event::assertDispatched(AdminInboxChanged::class, fn ($e) => $e->module === 'surat_tugas' && $e->action === 'created');

        // 2. Update Draft -> memicu AdminInboxChanged 'updated'
        $this->putJson("/api/surat-tugas/{$id}", [
            'maksud_tujuan' => 'Draft diperbarui oleh admin',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-21',
            'sumber_dana' => 'dipa',
            'employees' => [['id' => $emp1->id], ['id' => $emp2->id]],
        ])->assertOk();
        Event::assertDispatched(AdminInboxChanged::class, fn ($e) => $e->module === 'surat_tugas' && $e->action === 'updated');

        // 3. Terbitkan / Approve -> Memicu AdminInboxChanged 'approved' DAN PortalNotificationCreated ke SEMUA peserta
        $this->putJson("/api/surat-tugas/{$id}/approve", [
            'nomor_surat' => 'ST/LIVE/2026/001',
            'status' => 'approved',
            'employees' => [['id' => $emp1->id], ['id' => $emp2->id]],
        ])->assertOk();

        Event::assertDispatched(AdminInboxChanged::class, fn ($e) => $e->module === 'surat_tugas' && $e->action === 'approved');
        Event::assertDispatched(PortalNotificationCreated::class, 2); // 2 pegawai terdaftar

        // 4. Soft Delete -> memicu AdminInboxChanged 'deleted'
        $this->deleteJson("/api/surat-tugas/{$id}")->assertOk();
        Event::assertDispatched(AdminInboxChanged::class, fn ($e) => $e->module === 'surat_tugas' && $e->action === 'deleted');

        // 5. Restore -> memicu AdminInboxChanged 'restored'
        $this->postJson("/api/surat-tugas/{$id}/restore")->assertOk();
        Event::assertDispatched(AdminInboxChanged::class, fn ($e) => $e->module === 'surat_tugas' && $e->action === 'restored');
    }

    /**
     * EXT-11: Pagination riwayat surat tugas pegawai dengan jumlah >20 dokumen.
     */
    public function test_ext11_participant_history_pagination_over_twenty_letters(): void
    {
        [$owner, $empTarget] = $this->actor('user', ['surat_tugas']);
        [, $empOther] = $this->actor('user', []);
        [$admin] = $this->actor('admin', ['surat_tugas']);

        // Buat 25 surat tugas untuk empTarget
        for ($i = 1; $i <= 25; $i++) {
            $letter = AssignmentLetter::create([
                'nomor_surat' => "ST/PAGINATE/{$i}",
                'maksud_tujuan' => "Tugas Pegawai Ke-{$i}",
                'tanggal_mulai' => '2026-11-01',
                'tanggal_selesai' => '2026-11-02',
                'sumber_dana' => 'dipa',
                'status' => 'approved',
                'created_by' => $admin->id,
                'approved_by' => $admin->id,
            ]);
            $letter->employees()->attach($empTarget->id, ['peran' => 'Peserta']);
        }

        // Buat 5 surat untuk pegawai lain
        for ($j = 1; $j <= 5; $j++) {
            $letterOther = AssignmentLetter::create([
                'nomor_surat' => "ST/OTHER/{$j}",
                'maksud_tujuan' => "Tugas Pegawai Lain Ke-{$j}",
                'tanggal_mulai' => '2026-11-01',
                'tanggal_selesai' => '2026-11-02',
                'sumber_dana' => 'dipa',
                'status' => 'approved',
                'created_by' => $admin->id,
                'approved_by' => $admin->id,
            ]);
            $letterOther->employees()->attach($empOther->id, ['peran' => 'Peserta']);
        }

        Sanctum::actingAs($owner);

        // Halaman 1 (per_page = 10)
        $resP1 = $this->getJson('/api/surat-tugas/my?per_page=10&page=1')->assertOk();
        $this->assertCount(10, $resP1->json('data'));
        $this->assertSame(25, $resP1->json('meta.total') ?? $resP1->json('total'));
        $this->assertSame(1, $resP1->json('meta.current_page') ?? $resP1->json('current_page'));

        // Halaman 2 (per_page = 10)
        $resP2 = $this->getJson('/api/surat-tugas/my?per_page=10&page=2')->assertOk();
        $this->assertCount(10, $resP2->json('data'));
        $this->assertSame(2, $resP2->json('meta.current_page') ?? $resP2->json('current_page'));

        // Halaman 3 (sisa 5 item)
        $resP3 = $this->getJson('/api/surat-tugas/my?per_page=10&page=3')->assertOk();
        $this->assertCount(5, $resP3->json('data'));
        $this->assertSame(3, $resP3->json('meta.current_page') ?? $resP3->json('current_page'));

        // Pastikan tidak ada surat milik pegawai lain yang bocor ke daftar empTarget
        $allIds = collect($resP1->json('data'))
            ->merge($resP2->json('data'))
            ->merge($resP3->json('data'))
            ->pluck('maksud_tujuan');
        $this->assertFalse($allIds->contains(fn ($txt) => str_contains((string)$txt, 'Pegawai Lain')));
    }

    /**
     * EXT-15: Proteksi transaksi database atomik dan pencegahan bentrok double-submit.
     */
    public function test_ext15_double_submit_protection_and_atomic_transactions(): void
    {
        [$admin, $emp] = $this->actor('admin', ['surat_tugas']);
        Sanctum::actingAs($admin);

        // Submit pertama
        $payload = $this->payload($emp, [
            'nomor_surat' => 'ST/ATOMIC/001',
            'maksud_tujuan' => 'Kegiatan Konservasi Bersama',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-22',
            'status' => 'approved',
        ]);

        $first = $this->postJson('/api/surat-tugas', $payload)->assertCreated();
        $this->assertNotNull($first->json('data.id'));

        // Double submit pada rentang tanggal yang sama -> Ditahan oleh deteksi bentrok jadwal
        $second = $this->postJson('/api/surat-tugas', $payload);
        $second->assertUnprocessable();
        $this->assertNotEmpty($second->json('conflicts'));
        $this->assertSame(1, AssignmentLetter::where('nomor_surat', 'ST/ATOMIC/001')->count());

        // Simulasi error transaksi: jika callback model gagal, database di-rollback utuh
        $beforeCount = AssignmentLetter::count();
        AssignmentLetter::saving(function ($m) {
            if ($m->nomor_surat === 'ST/FAIL/ROLLBACK') {
                throw new \RuntimeException('Simulasi kegagalan atomik database');
            }
        });

        try {
            $this->postJson('/api/surat-tugas', $this->payload($emp, [
                'nomor_surat' => 'ST/FAIL/ROLLBACK',
                'status' => 'pending',
                'tanggal_mulai' => '2026-12-01',
                'tanggal_selesai' => '2026-12-02',
            ]))->assertStatus(500);
        } finally {
            AssignmentLetter::flushEventListeners();
        }

        $this->assertSame($beforeCount, AssignmentLetter::count(), 'Surat tidak boleh tersimpan jika transaksi gagal');
    }

    /**
     * EXT-16: Keterkaitan akun dan format NIP semua kategori: PNS, PPPK, dan MMP.
     */
    public function test_ext16_account_and_nip_linkage_pns_pppk_and_mmp(): void
    {
        [$admin] = $this->actor('admin', ['surat_tugas']);
        Sanctum::actingAs($admin);

        // 1. Buat PNS (NIP 18 digit)
        $pns = Employee::create([
            'nip' => '198501012010011003',
            'nama_lengkap' => 'Ahmad Fauzi, S.Hut (PNS)',
            'jabatan' => 'Polisi Kehutanan Ahli Muda',
            'satuan_kerja' => 'SKW II Tenggarong',
            'is_active' => true,
        ]);

        // 2. Buat PPPK (NI PPPK 18 digit)
        $pppk = Employee::create([
            'nip' => '199511202023212005',
            'nama_lengkap' => 'Siti Nurhaliza, S.Hut (PPPK)',
            'jabatan' => 'Pengendali Ekosistem Hutan Pertama',
            'satuan_kerja' => 'Balai KSDA Kaltim',
            'is_active' => true,
        ]);

        // 3. Buat MMP (Masyarakat Mitra Polhut / Tenaga Lapangan)
        $mmp = Employee::create([
            'nip' => 'MMP-027',
            'nama_lengkap' => 'Bambang Irawan (MMP)',
            'jabatan' => 'Tenaga Lapangan / MMP',
            'satuan_kerja' => 'Resor Samboja',
            'is_active' => true,
        ]);

        // Verifikasi endpoint select pegawai mengembalikan ketiga kategori secara valid
        $selectRes = $this->getJson('/api/kepegawaian/employees/select')->assertOk();
        $selectList = collect($selectRes->json('data'));

        $this->assertTrue($selectList->contains('nip', '198501012010011003'));
        $this->assertTrue($selectList->contains('nip', '199511202023212005'));
        $this->assertTrue($selectList->contains('nip', 'MMP-027'));

        // Buat Surat Tugas yang melibatkan ketiga kategori pegawai sekaligus
        $response = $this->postJson('/api/surat-tugas', [
            'nomor_surat' => 'ST/TRI-CAT/2026/001',
            'maksud_tujuan' => 'Patroli Terpadu Melibatkan PNS, PPPK, dan MMP',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-22',
            'sumber_dana' => 'dipa',
            'status' => 'approved',
            'employees' => [
                ['id' => $pns->id, 'peran' => 'Penanggung Jawab / Ketua Tim'],
                ['id' => $pppk->id, 'peran' => 'Pelaksana Teknis Lapangan'],
                ['id' => $mmp->id, 'peran' => 'Pemandu Jalur / Tenaga Lapangan'],
            ],
        ])->assertCreated();

        $id = $response->json('data.id');
        $letter = AssignmentLetter::with('employees')->findOrFail($id);

        $this->assertCount(3, $letter->employees);
        $this->assertSame('198501012010011003', $letter->employees->firstWhere('id', $pns->id)->nip);
        $this->assertSame('199511202023212005', $letter->employees->firstWhere('id', $pppk->id)->nip);
        $this->assertSame('MMP-027', $letter->employees->firstWhere('id', $mmp->id)->nip);

        // Periksa API show mengembalikan relasi dengan struktur presisi
        $showRes = $this->getJson("/api/surat-tugas/{$id}")->assertOk();
        $docEmps = collect($showRes->json('data.employees'));

        $this->assertSame('Penanggung Jawab / Ketua Tim', $docEmps->firstWhere('id', $pns->id)['pivot']['peran']);
        $this->assertSame('Pelaksana Teknis Lapangan', $docEmps->firstWhere('id', $pppk->id)['pivot']['peran']);
        $this->assertSame('Pemandu Jalur / Tenaga Lapangan', $docEmps->firstWhere('id', $mmp->id)['pivot']['peran']);
    }
}
