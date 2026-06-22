<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Kepegawaian\Models\Employee;
use App\Models\User;

class AuctionBatchMetadataBuilder
{
    /**
     * Build frozen metadata for an auction batch before locking it.
     *
     * @param AuctionBatch $batch
     * @param User $actor
     * @param array $input
     * @return array
     */
    public function buildForLock(AuctionBatch $batch, User $actor, array $input): array
    {
        $kepalaBalaiId = $input['kepala_balai_id'] ?? $batch->kepala_balai_id;
        $kepalaBalai = $kepalaBalaiId ? Employee::find($kepalaBalaiId) : null;

        $signatoriesInput = $input['signatories'] ?? [];
        $panitiaIds = $signatoriesInput['panitia'] ?? $input['committees']['panitia_penghapusan'] ?? [];
        $timPenilaiIds = $signatoriesInput['tim_penilai'] ?? $input['committees']['tim_penilai'] ?? [];
        $pemeriksaIds = $signatoriesInput['pemeriksa'] ?? $input['committees']['pemeriksa'] ?? [];

        // Fetch employees
        $panitia = Employee::whereIn('id', $panitiaIds)->get();
        $timPenilai = Employee::whereIn('id', $timPenilaiIds)->get();
        $pemeriksa = Employee::whereIn('id', $pemeriksaIds)->get();

        // Map and preserve input ordering
        $panitiaMapped = collect($panitiaIds)
            ->map(fn($id) => $this->mapEmployee($panitia->firstWhere('id', $id)))
            ->filter()
            ->values()
            ->toArray();

        $timPenilaiMapped = collect($timPenilaiIds)
            ->map(fn($id) => $this->mapEmployee($timPenilai->firstWhere('id', $id)))
            ->filter()
            ->values()
            ->toArray();

        $pemeriksaMapped = collect($pemeriksaIds)
            ->map(fn($id) => $this->mapEmployee($pemeriksa->firstWhere('id', $id)))
            ->filter()
            ->values()
            ->toArray();

        return [
            'schema_version' => 1,
            'locked_at' => now()->toIso8601String(),
            'locked_by' => $actor->id,
            'signatories' => [
                'kepala_balai' => $this->mapEmployee($kepalaBalai),
            ],
            'committees' => [
                'panitia_penghapusan' => $panitiaMapped,
                'tim_penilai' => $timPenilaiMapped,
                'pemeriksa' => $pemeriksaMapped,
            ],
            'document_numbers' => $input['document_numbers'] ?? [],
            'document_dates' => $input['document_dates'] ?? [],
            'print_config' => [
                'paper' => 'A4',
                'locale' => 'id-ID',
                'currency' => 'IDR',
            ],
            'document_versions' => [],
        ];
    }

    /**
     * Map an employee model to a frozen metadata array.
     *
     * @param Employee|null $employee
     * @return array|null
     */
    private function mapEmployee(?Employee $employee): ?array
    {
        if (!$employee) {
            return null;
        }

        return [
            'id' => $employee->id,
            'nama' => $employee->nama_lengkap,
            'nip' => $employee->nip,
            'golongan' => $employee->pangkat_golongan,
            'jabatan' => $employee->jabatan,
            'unit_kerja' => $employee->satuan_kerja,
            'source' => 'employees',
        ];
    }
}
