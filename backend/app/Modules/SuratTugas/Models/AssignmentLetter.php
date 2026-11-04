<?php

namespace App\Modules\SuratTugas\Models;

use App\Jobs\ArchiveOfficialDocument;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AssignmentLetter extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'st_assignment_letters';

    protected $fillable = [
        'nomor_surat',
        'kode_surat',
        'template_type',
        'template_id',
        'task_type_id',
        'sertakan_laporan',
        'template_version',
        'template_snapshot',
        'dasar_hukum',
        'maksud_tujuan',
        'tanggal_mulai',
        'tanggal_selesai',
        'tempat_tujuan',
        'status',
        'file_surat_path',
        'tanggal_surat',
        'sumber_dana',
        'sumber_dana_other',
        'nama_plh',
        'has_seksi_employee',
        'jumlah_buruh',
        'tanda_setuju',
        'keterangan',
        'menimbang',
        'dasar',
        'tembusan',
        'penandatangan_nama',
        'penandatangan_nip',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
        'tanggal_surat' => 'date:Y-m-d',
        'menimbang' => 'array',
        'dasar' => 'array',
        'tembusan' => 'array',
        'template_snapshot' => 'array',
        'has_seksi_employee' => 'boolean',
        'jumlah_buruh' => 'integer',
        'sertakan_laporan' => 'boolean',
    ];

    public function replaceUploadedFile(UploadedFile $file, ?int $userId = null): string
    {
        $oldPath = $this->file_surat_path;
        $path = $file->store('surat-tugas/'.$this->getKey(), 'local');
        abort_if($path === false, 500, 'Berkas Surat Tugas gagal disimpan.');

        DB::afterRollBack(fn () => static::deleteUnreferencedFile($path));
        $this->update(['file_surat_path' => $path]);
        $extension = $file->extension();
        $archiveName = $this->nomor_surat ? "ST-{$this->nomor_surat}.{$extension}" : "dasar-surat.{$extension}";
        DB::afterCommit(function () use ($oldPath, $path, $archiveName, $userId) {
            static::deleteUnreferencedFile($oldPath);
            try {
                ArchiveOfficialDocument::dispatch('surat_tugas', $this->getKey(), 'local', $path, $archiveName, null, $userId);
            } catch (\Throwable $e) {
                Log::error('Surat Tugas archive dispatch failed.', ['exception' => $e->getMessage()]);
            }
        });
        return $path;
    }

    public static function deleteUnreferencedFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        try {
            if (! static::withTrashed()->where('file_surat_path', $path)->exists()) {
                Storage::disk('local')->delete($path);
            }
        } catch (\Throwable $e) {
            // Cleanup failure must not turn a committed document into an API failure.
            Log::warning('Surat Tugas file cleanup failed.', ['exception' => $e->getMessage()]);
        }
    }

    public function taskType(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Kepegawaian\Models\StTaskType::class, 'task_type_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            Employee::class,
            'st_assignment_letter_employees',
            'assignment_letter_id',
            'employee_id'
        )
            ->using(AssignmentLetterEmployee::class)
            ->withPivot(['peran', 'tanggal_mulai', 'tanggal_selesai'])
            ->withTimestamps();
    }
}
