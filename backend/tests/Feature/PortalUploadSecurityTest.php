<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Jobs\ArchiveOfficialDocument;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Dummy data, real HTTP kernel and MIME detection; execute only in the audit sandbox. */
class PortalUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 1;
    private array $temporaryFiles = [];
    private const PDF = "%PDF-1.4\nDUMMY PRIVATE LEAVE SCAN\n%%EOF\n";
    private const FIELDS = ['file_scan_formulir', 'file_scan_surat_izin', 'file_scan'];
    private const WRITERS = ['upload-scan', 'approve', 'create-record', 'update-record'];
    private const SCANS = ['scan', 'scan-formulir', 'scan-surat-izin'];

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.default' => 'local', 'auth.two_factor_enforce' => false]);
        Storage::fake('local');
        Storage::fake('public');
        Storage::fake('drive');
        Mail::fake();
        Notification::fake();
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        Bus::fake([ArchiveOfficialDocument::class]);
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        parent::tearDown();
    }

    private function actor(string $name, string $role = 'user', array $modules = []): array
    {
        $nip = '900000000000'.str_pad((string) $this->sequence++, 6, '0', STR_PAD_LEFT);
        $employee = Employee::create([
            'nip' => $nip, 'nama_lengkap' => $name, 'jabatan' => 'Dummy PNS',
            'pangkat_golongan' => 'Dummy Rank', 'satuan_kerja' => 'Dummy Unit', 'is_active' => true,
        ]);
        $user = User::factory()->create([
            'name' => $name, 'username' => $nip, 'email' => $nip.'@example.test',
            'role' => $role, 'access_modules' => $modules, 'permissions' => null,
            'is_active' => true, 'must_change_password' => false,
        ]);
        return [$user, $employee];
    }

    private function png(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
    }

    private function upload(string $name, string $bytes, string $claimedMime = 'application/pdf'): UploadedFile
    {
        // Laravel's Testing\File guesses MIME from the filename; use an actual temporary file instead.
        $path = tempnam(sys_get_temp_dir(), 'portal-upload-');
        $this->temporaryFiles[] = $path;
        file_put_contents($path, $bytes);
        return new UploadedFile($path, $name, $claimedMime, null, true);
    }

    private function payload(): array
    {
        return [
            'tanggal_pengajuan' => '2026-10-31', 'jenis_cuti' => 'Cuti Sakit',
            'alasan_cuti' => 'Dummy medical leave', 'jumlah_hari' => 1,
            'tanggal_mulai' => '2026-11-02', 'tanggal_selesai' => '2026-11-02',
            'alamat_menjalankan_cuti' => 'Dummy address', 'telepon' => '080000000001',
            'status' => 'DISETUJUI',
        ];
    }

    private function leave(Employee $employee): EmployeeLeaveRequest
    {
        return EmployeeLeaveRequest::create(array_merge($this->payload(), ['employee_id' => $employee->id]));
    }

    private function writerUrl(string $writer, Employee $employee, EmployeeLeaveRequest $leave): string
    {
        return match ($writer) {
            'create-record' => "/api/kepegawaian/employees/{$employee->id}/leave-records",
            'update-record' => "/api/kepegawaian/employees/{$employee->id}/leave-records/{$leave->id}",
            default => "/api/kepegawaian/leave-requests/{$leave->id}/{$writer}",
        };
    }

    public function test_profile_photo_rejects_real_mime_extension_spoofs_and_oversize_on_both_endpoints(): void
    {
        [$admin, $employee] = $this->actor('Dummy Photo Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        $cases = [
            ['portrait.jpg', '<html><body>INERT HTML FIXTURE</body></html>'],
            ['portrait.png', '<svg xmlns="http://www.w3.org/2000/svg"><text>INERT SVG</text></svg>'],
            ['portrait.svg', '<svg xmlns="http://www.w3.org/2000/svg"><text>INERT SVG</text></svg>'],
            ['portrait.html', $this->png()],
            ['portrait.png', self::PDF],
            ['portrait.png', $this->png().str_repeat('0', 10240 * 1024)],
        ];
        foreach (['/api/me/update-photo', "/api/kepegawaian/employees/{$employee->id}/photo"] as $url) {
            foreach ($cases as [$name, $bytes]) {
                $file = $this->upload($name, $bytes, 'image/png');
                $this->post($url, ['foto' => $file], ['Accept' => 'application/json'])
                    ->assertStatus(422)->assertJsonValidationErrors('foto');
                unlink($file->getPathname());
            }
        }
        $this->assertNull($employee->fresh()->foto_profil);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_profile_photo_binds_employee_and_destination_to_authenticated_identity(): void
    {
        [$owner, $employee] = $this->actor('Dummy Photo Owner');
        [, $foreign] = $this->actor('Dummy Foreign Photo');
        Storage::disk('local')->put('sentinel/foreign-photo.png', 'FOREIGN PHOTO');
        $foreign->update(['foto_profil' => 'sentinel/foreign-photo.png']);
        Sanctum::actingAs($owner);
        $this->post('/api/me/update-photo', [
            'foto' => $this->upload('../../foreign.png', $this->png(), 'image/png'),
            'employee_id' => $foreign->id, 'nip' => $foreign->nip,
            'foto_profil' => 'sentinel/foreign-photo.png', 'path' => 'sentinel/foreign-photo.png', 'disk' => 'public',
        ], ['Accept' => 'application/json'])->assertOk();
        $path = $employee->fresh()->foto_profil;
        $this->assertStringStartsWith('employees/emp-'.$employee->id.'/foto-profil/', $path);
        $this->assertSame($this->png(), Storage::disk('local')->get($path));
        $this->assertSame('sentinel/foreign-photo.png', $foreign->fresh()->foto_profil);
        $this->assertSame('FOREIGN PHOTO', Storage::disk('local')->get('sentinel/foreign-photo.png'));
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_plain_employee_cannot_use_admin_photo_endpoint_even_for_own_employee(): void
    {
        [$user, $employee] = $this->actor('Dummy Employee With Module', 'user', ['kepegawaian']);
        Sanctum::actingAs($user);
        $this->post("/api/kepegawaian/employees/{$employee->id}/photo", [
            'foto' => $this->upload('portrait.png', $this->png(), 'image/png'),
        ], ['Accept' => 'application/json'])->assertForbidden();
        $this->assertNull($employee->fresh()->foto_profil);
    }

    public function test_admin_cannot_replace_protected_super_admin_photo_through_same_name_employee(): void
    {
        [$super, $protected] = $this->actor('Dummy Shared Full Name', 'super_admin');
        [, $ordinary] = $this->actor('Dummy Shared Full Name');
        [$admin] = $this->actor('Dummy Photo Operator', 'admin', ['kepegawaian']);
        Sanctum::actingAs($super);
        $this->post("/api/kepegawaian/employees/{$protected->id}/photo", [
            'foto' => $this->upload('original.png', $this->png(), 'image/png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $protectedPath = $protected->fresh()->foto_profil;
        $protectedBytes = Storage::disk('local')->get($protectedPath);
        Sanctum::actingAs($admin);
        $this->post("/api/kepegawaian/employees/{$protected->id}/photo", [
            'foto' => $this->upload('blocked.png', $this->png(), 'image/png'),
        ], ['Accept' => 'application/json'])->assertForbidden();
        $this->post("/api/kepegawaian/employees/{$ordinary->id}/photo", [
            'foto' => $this->upload('replacement.png', $this->png().'DUMMY DIFFERENT PHOTO', 'image/png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->assertSame($protectedBytes, Storage::disk('local')->get($protectedPath), 'Other employee upload must not overwrite the protected super admin photo.');
        $this->assertNotSame($protectedPath, $ordinary->fresh()->foto_profil);
    }

    public function test_create_and_full_update_photo_do_not_alias_same_name_protected_employee(): void
    {
        [, $protected] = $this->actor('Dummy Alternate Shared Name', 'super_admin');
        [$admin] = $this->actor('Dummy Alternate Photo Operator', 'admin', ['kepegawaian']);
        [, $ordinary] = $this->actor('Dummy Name Before Update');
        $oldPath = 'employees/dummy-alternate-shared-name/foto-profil/dummy-alternate-shared-name_profil.png';
        Storage::disk('local')->put($oldPath, $this->png().'PROTECTED ORIGINAL');
        $protected->update(['foto_profil' => $oldPath]);
        Sanctum::actingAs($admin);

        $newNip = '900000000000'.str_pad((string) $this->sequence++, 6, '0', STR_PAD_LEFT);
        $created = $this->post('/api/kepegawaian/employees', [
            'nip' => $newNip, 'nama_lengkap' => $protected->nama_lengkap,
            'foto' => $this->upload('created.png', $this->png().'NEW EMPLOYEE', 'image/png'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $newEmployee = Employee::findOrFail($created->json('data.id'));
        $this->assertStringStartsWith('employees/emp-'.$newEmployee->id.'/foto-profil/', $newEmployee->foto_profil);
        $this->assertSame($this->png().'NEW EMPLOYEE', Storage::disk('local')->get($newEmployee->foto_profil));

        $this->put('/api/kepegawaian/employees/'.$ordinary->id, [
            'nip' => $ordinary->nip, 'nama_lengkap' => $protected->nama_lengkap,
            'foto' => $this->upload('updated.png', $this->png().'UPDATED EMPLOYEE', 'image/png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->assertSame($protected->nama_lengkap, $ordinary->fresh()->nama_lengkap);
        $this->assertStringStartsWith('employees/emp-'.$ordinary->id.'/foto-profil/', $ordinary->fresh()->foto_profil);
        $this->assertNotSame($newEmployee->foto_profil, $ordinary->fresh()->foto_profil);
        $this->assertSame($this->png().'PROTECTED ORIGINAL', Storage::disk('local')->get($oldPath));
        $this->assertSame($oldPath, $protected->fresh()->foto_profil);
    }

    private function replacePhoto(string $writer, User $owner, User $admin, Employee $employee, UploadedFile $file)
    {
        Sanctum::actingAs($writer === 'self' ? $owner : $admin);
        if ($writer === 'self') {
            return $this->post('/api/me/update-photo', ['foto' => $file], ['Accept' => 'application/json']);
        }
        if ($writer === 'full-update') {
            return $this->put('/api/kepegawaian/employees/'.$employee->id, [
                'nip' => $employee->nip, 'nama_lengkap' => $employee->nama_lengkap, 'foto' => $file,
            ], ['Accept' => 'application/json']);
        }
        return $this->post('/api/kepegawaian/employees/'.$employee->id.'/photo', ['foto' => $file], ['Accept' => 'application/json']);
    }

    public function test_replacing_legacy_shared_photo_preserves_active_and_soft_deleted_other_references(): void
    {
        [$admin] = $this->actor('Dummy Legacy Photo Operator', 'admin', ['kepegawaian']);
        foreach (['self', 'admin-photo', 'full-update'] as $writer) {
            foreach ([false, true] as $softDeleted) {
                [, $protected] = $this->actor('Dummy Legacy Protected '.$this->sequence, 'super_admin');
                [$owner, $ordinary] = $this->actor('Dummy Legacy Replacing '.$this->sequence);
                $oldPath = 'employees/legacy-shared-'.$ordinary->id.'/foto-profil/shared.png';
                $oldBytes = $this->png().'LEGACY PROTECTED '.$ordinary->id;
                Storage::disk('local')->put($oldPath, $oldBytes);
                $protected->update(['foto_profil' => $oldPath]);
                $ordinary->update(['foto_profil' => $oldPath]);
                if ($softDeleted) {
                    $protected->delete();
                }
                $this->replacePhoto($writer, $owner, $admin, $ordinary, $this->upload('new.png', $this->png().'NEW PHOTO', 'image/png'))->assertOk();
                $this->assertSame($oldBytes, Storage::disk('local')->get($oldPath), $writer.' must preserve a photo referenced by another employee, including soft deleted employees.');
                $this->assertSame($oldPath, Employee::withTrashed()->findOrFail($protected->id)->foto_profil);
                $newPath = $ordinary->fresh()->foto_profil;
                $this->assertNotSame($oldPath, $newPath);
                $this->assertStringStartsWith('employees/emp-'.$ordinary->id.'/foto-profil/', $newPath);
                $this->assertSame($this->png().'NEW PHOTO', Storage::disk('local')->get($newPath));
            }
        }
    }

    public function test_successful_replacement_deletes_only_unshared_old_photo_and_uses_new_filename(): void
    {
        [$admin] = $this->actor('Dummy Cleanup Photo Operator', 'admin', ['kepegawaian']);
        foreach (['self', 'admin-photo', 'full-update'] as $writer) {
            [$owner, $employee] = $this->actor('Dummy Unshared Photo '.$this->sequence);
            $oldPath = 'employees/emp-'.$employee->id.'/foto-profil/previous.png';
            Storage::disk('local')->put($oldPath, $this->png().'OLD PHOTO');
            $employee->update(['foto_profil' => $oldPath]);
            $this->replacePhoto($writer, $owner, $admin, $employee, $this->upload('replacement.png', $this->png().'NEW PHOTO', 'image/png'))->assertOk();
            $firstPath = $employee->fresh()->foto_profil;
            $this->assertStringStartsWith('employees/emp-'.$employee->id.'/foto-profil/', $firstPath);
            $this->assertNotSame($oldPath, $firstPath);
            Storage::disk('local')->assertMissing($oldPath);
            $this->replacePhoto($writer, $owner, $admin, $employee, $this->upload('replacement.png', $this->png().'NEXT PHOTO', 'image/png'))->assertOk();
            $secondPath = $employee->fresh()->foto_profil;
            $this->assertNotSame($firstPath, $secondPath, 'Repeated uploads must receive separate server-generated filenames.');
            Storage::disk('local')->assertMissing($firstPath);
            $this->assertSame($this->png().'NEXT PHOTO', Storage::disk('local')->get($secondPath));
        }
    }

    private function failPhotoStorageWrites(): void
    {
        $disk = Storage::disk('local');
        $failedDisk = \Mockery::mock($disk);
        $failedDisk->shouldReceive('putFile')->andReturn(false);
        $failedDisk->shouldReceive('putFileAs')->andReturn(false);
        Storage::set('local', $failedDisk);
    }

    public function test_storage_write_failure_preserves_old_photo_database_path_and_bytes(): void
    {
        [$admin] = $this->actor('Dummy Failed Write Operator', 'admin', ['kepegawaian']);
        $cases = [];
        $disk = Storage::disk('local');
        foreach (['self', 'admin-photo', 'full-update'] as $writer) {
            [$owner, $employee] = $this->actor('Dummy Failed Photo '.$this->sequence);
            $oldPath = 'employees/emp-'.$employee->id.'/foto-profil/original.png';
            $oldBytes = $this->png().'ORIGINAL '.$employee->id;
            $disk->put($oldPath, $oldBytes);
            $employee->update(['foto_profil' => $oldPath]);
            $cases[] = [$writer, $owner, $employee, $oldPath, $oldBytes];
        }
        $this->failPhotoStorageWrites();
        foreach ($cases as [$writer, $owner, $employee, $oldPath, $oldBytes]) {
            $this->replacePhoto($writer, $owner, $admin, $employee, $this->upload('failed.png', $this->png().'FAILED REPLACEMENT', 'image/png'))->assertServerError();
            $this->assertSame($oldPath, $employee->fresh()->foto_profil);
            $this->assertSame($oldBytes, $disk->get($oldPath));
        }
        $this->assertCount(3, $disk->allFiles());
    }

    public function test_create_photo_storage_failure_does_not_leave_employee_or_auto_created_user(): void
    {
        [$admin] = $this->actor('Dummy Failed Create Operator', 'admin', ['kepegawaian']);
        $nip = '900000000000'.str_pad((string) $this->sequence++, 6, '0', STR_PAD_LEFT);
        $this->failPhotoStorageWrites();
        Sanctum::actingAs($admin);
        $this->post('/api/kepegawaian/employees', [
            'nip' => $nip, 'nama_lengkap' => 'Dummy Failed Create',
            'foto' => $this->upload('failed.png', $this->png(), 'image/png'),
        ], ['Accept' => 'application/json'])->assertServerError();
        $this->assertDatabaseMissing('kpg_employees', ['nip' => $nip]);
        $this->assertDatabaseMissing('users', ['username' => $nip]);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_all_scan_writers_reject_real_mime_extension_spoofs_and_oversize_for_each_field(): void
    {
        [$admin, $employee] = $this->actor('Dummy Scan Admin', 'admin', ['kepegawaian']);
        $leave = $this->leave($employee);
        Sanctum::actingAs($admin);
        $cases = [
            ['scan.pdf', '<html><body>INERT HTML FIXTURE</body></html>'],
            ['scan.png', '<svg xmlns="http://www.w3.org/2000/svg"><text>INERT SVG</text></svg>'],
            ['scan.svg', '<svg xmlns="http://www.w3.org/2000/svg"><text>INERT SVG</text></svg>'],
            ['scan.html', self::PDF],
            ['scan.pdf', self::PDF.str_repeat('0', 10240 * 1024)],
        ];
        foreach (self::WRITERS as $writer) {
            foreach (self::FIELDS as $field) {
                foreach ($cases as [$name, $bytes]) {
                    $file = $this->upload($name, $bytes);
                    $this->post($this->writerUrl($writer, $employee, $leave), array_merge($this->payload(), [
                        $field => $file,
                    ]), ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors($field);
                    unlink($file->getPathname());
                }
            }
        }
        $this->assertSame(1, EmployeeLeaveRequest::count());
        $this->assertNull($leave->fresh()->scan_formulir_path);
        $this->assertNull($leave->fresh()->scan_surat_path);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_all_scan_writers_accept_pdf_and_image_only_in_server_chosen_private_paths(): void
    {
        [$admin, $employee] = $this->actor('Dummy Successful Scan Admin', 'admin', ['kepegawaian']);
        Sanctum::actingAs($admin);
        foreach (self::WRITERS as $writer) {
            foreach (self::FIELDS as $field) {
                foreach (['pdf' => self::PDF, 'png' => $this->png()] as $extension => $bytes) {
                    $leave = $this->leave($employee);
                    $response = $this->post($this->writerUrl($writer, $employee, $leave), array_merge($this->payload(), [
                        $field => $this->upload('../../caller-choice.'.$extension, $bytes),
                        'scan_formulir_path' => 'sentinel/caller.pdf', 'scan_surat_path' => 'sentinel/caller.pdf',
                        'scan_surat_izin_path' => 'sentinel/caller.pdf', 'path' => 'sentinel/caller.pdf', 'disk' => 'public',
                    ]), ['Accept' => 'application/json'])->assertSuccessful();
                    $saved = $writer === 'create-record' ? EmployeeLeaveRequest::findOrFail($response->json('data.id')) : $leave->fresh();
                    $path = $field === 'file_scan_formulir' ? $saved->scan_formulir_path : $saved->scan_surat_izin_path;
                    $folder = $field === 'file_scan_formulir' ? 'formulir' : 'surat_izin';
                    $this->assertMatchesRegularExpression('~^cuti_scans/'.$folder.'/[A-Za-z0-9]+\\.'.preg_quote($extension, '~').'$~', $path);
                    $this->assertSame($bytes, Storage::disk('local')->get($path));
                    $name = $field === 'file_scan_formulir' ? $saved->scan_formulir_nama : $saved->scan_surat_izin_nama;
                    $this->assertSame('caller-choice.'.$extension, $name);
                    if ($field !== 'file_scan_formulir') {
                        $this->assertSame($path, $saved->scan_surat_path);
                    }
                    $this->assertSame($admin->id, $saved->scan_surat_uploaded_by);
                }
            }
        }
        $this->assertSame([], Storage::disk('public')->allFiles());
        Storage::disk('local')->assertMissing('sentinel/caller.pdf');
    }

    private function scannedLeave(Employee $employee): EmployeeLeaveRequest
    {
        $leave = $this->leave($employee);
        $paths = [];
        foreach (['formulir', 'surat_izin'] as $type) {
            $path = "cuti_scans/{$type}/dummy-{$leave->id}.pdf";
            Storage::disk('local')->put($path, self::PDF.$type);
            $paths['scan_'.$type.'_path'] = $path;
            $paths['scan_'.$type.'_nama'] = $type.'.pdf';
        }
        $leave->update(array_merge($paths, ['scan_surat_path' => $paths['scan_surat_izin_path'], 'scan_surat_nama' => 'surat_izin.pdf']));
        return $leave->fresh();
    }

    public function test_owner_can_preview_and_stream_each_scan_without_query_path_override(): void
    {
        [$owner, $employee] = $this->actor('Dummy Scan Owner');
        $leave = $this->scannedLeave($employee);
        Storage::disk('local')->put('sentinel/foreign.pdf', 'FOREIGN PRIVATE BYTES');
        Sanctum::actingAs($owner);
        foreach (self::SCANS as $variant) {
            $url = "/api/me/leave-requests/{$leave->id}/{$variant}";
            $suffix = $variant === 'scan-formulir' ? 'formulir' : 'surat_izin';
            $this->getJson($url.'?preview=1&path=sentinel/foreign.pdf&disk=public&employee_id=999999')
                ->assertOk()->assertJsonPath('mime_type', 'application/pdf')
                ->assertJsonPath('data_url', 'data:application/pdf;base64,'.base64_encode(self::PDF.$suffix));
            $stream = $this->get($url, ['Accept' => 'application/octet-stream'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
            $this->assertSame(self::PDF.$suffix, $stream->streamedContent());
            $this->assertStringNotContainsString('FOREIGN PRIVATE BYTES', $stream->streamedContent());
        }
    }

    public function test_foreign_employee_cannot_read_any_owner_scan_in_preview_or_stream_mode(): void
    {
        [, $employee] = $this->actor('Dummy Protected Scan Owner');
        $leave = $this->scannedLeave($employee);
        [$foreign] = $this->actor('Dummy Foreign Scan Reader', 'user', ['kepegawaian']);
        Sanctum::actingAs($foreign);
        foreach (self::SCANS as $variant) {
            foreach (['/api/me', '/api/kepegawaian'] as $prefix) {
                $url = "{$prefix}/leave-requests/{$leave->id}/{$variant}";
                $expected = $prefix === '/api/me' ? 404 : 403;
                $this->getJson($url.'?preview=1')->assertStatus($expected);
                $this->get($url, ['Accept' => 'application/octet-stream'])->assertStatus($expected);
            }
        }
    }

    public function test_administrative_scan_reads_require_module_and_role_and_permit_authorized_admin(): void
    {
        [, $employee] = $this->actor('Dummy Admin Read Owner');
        $leave = $this->scannedLeave($employee);
        [$withoutModule] = $this->actor('Dummy Admin No Module', 'admin');
        [$admin] = $this->actor('Dummy Authorized Reader', 'admin', ['kepegawaian']);
        foreach (self::SCANS as $variant) {
            $url = "/api/kepegawaian/leave-requests/{$leave->id}/{$variant}";
            Sanctum::actingAs($withoutModule);
            $this->getJson($url.'?preview=1')->assertForbidden();
            Sanctum::actingAs($admin);
            $this->getJson($url.'?preview=1')->assertOk();
            $this->get($url, ['Accept' => 'application/octet-stream'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        }
    }

    public function test_employee_cannot_write_scans_via_any_administrative_writer(): void
    {
        [$user, $employee] = $this->actor('Dummy Scan Writer Employee', 'user', ['kepegawaian']);
        $leave = $this->leave($employee);
        Sanctum::actingAs($user);
        foreach (self::WRITERS as $writer) {
            $this->post($this->writerUrl($writer, $employee, $leave), array_merge($this->payload(), [
                'file_scan' => $this->upload('scan.pdf', self::PDF),
            ]), ['Accept' => 'application/json'])->assertForbidden();
        }
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_anonymous_cannot_upload_or_read_portal_admin_or_unsigned_storage_scans(): void
    {
        [, $employee] = $this->actor('Dummy Anonymous Boundary Owner');
        $leave = $this->scannedLeave($employee);
        $this->post('/api/me/update-photo', ['foto' => $this->upload('portrait.png', $this->png())], ['Accept' => 'application/json'])->assertUnauthorized();
        foreach (self::WRITERS as $writer) {
            $this->post($this->writerUrl($writer, $employee, $leave), array_merge($this->payload(), [
                'file_scan' => $this->upload('scan.pdf', self::PDF),
            ]), ['Accept' => 'application/json'])->assertUnauthorized();
        }
        foreach (self::SCANS as $variant) {
            foreach (['/api/me', '/api/kepegawaian'] as $prefix) {
                $this->getJson("{$prefix}/leave-requests/{$leave->id}/{$variant}?preview=1")->assertUnauthorized();
            }
        }
        $this->get('/storage/'.$leave->scan_formulir_path)->assertForbidden();
        $this->get('/storage/'.$leave->scan_surat_izin_path)->assertForbidden();
    }

    public function test_legacy_scan_and_form_only_fallbacks_preserve_owner_boundary(): void
    {
        [$owner, $employee] = $this->actor('Dummy Legacy Scan Owner');
        $leave = $this->scannedLeave($employee);
        $leave->update(['scan_surat_izin_path' => null, 'scan_surat_izin_nama' => null]);
        Sanctum::actingAs($owner);
        $url = "/api/me/leave-requests/{$leave->id}";
        $this->getJson($url.'/scan-surat-izin?preview=1')->assertOk()->assertJsonPath('file_name', 'surat_izin.pdf');
        $leave->update(['scan_surat_path' => null, 'scan_surat_nama' => null]);
        $this->getJson($url.'/scan?preview=1')->assertOk()->assertJsonPath('file_name', 'formulir.pdf');
        $this->getJson($url.'/scan-surat-izin?preview=1')->assertNotFound();
    }
}
