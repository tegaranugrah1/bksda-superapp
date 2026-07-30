<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Kepegawaian\Models\Employee;
use App\Models\User;

class AuctionBatchMetadataBuilder
{
    public function __construct(
        private AuctionBatchDocumentWorkflow $documentWorkflow
    ) {}

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
        $existingMetadata = is_array($batch->metadata) ? $batch->metadata : [];

        $kepalaBalaiId = $input['kepala_balai_id'] ?? $batch->kepala_balai_id;
        $kepalaBalai = $kepalaBalaiId ? Employee::find($kepalaBalaiId) : null;

        $signatoriesInput = array_replace(
            $existingMetadata['signatories_raw'] ?? [],
            $input['signatories'] ?? []
        );
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

        $documentNumbers = array_replace(
            $existingMetadata['document_numbers'] ?? [],
            $input['document_numbers'] ?? []
        );
        $documentKaps = array_replace(
            $existingMetadata['document_kaps'] ?? [],
            $input['document_kaps'] ?? []
        );
        $documentDates = array_replace(
            $existingMetadata['document_dates'] ?? [],
            $input['document_dates'] ?? []
        );
        $workflow = $input['workflow'] ?? $existingMetadata['workflow'] ?? [];
        $workflowDocuments = isset($workflow['documents']) && is_array($workflow['documents'])
            ? $this->documentWorkflow->sortDocumentProgress($workflow['documents'])
            : [];

        return [
            'schema_version' => 2,
            'locked_at' => now()->toIso8601String(),
            'locked_by' => $actor->id,
            'workflow' => [
                'version' => $workflow['version'] ?? 1,
                'documents' => $workflowDocuments,
                'pre_valuation_complete' => $this->documentsComplete($workflowDocuments, $this->documentWorkflow->requiredForValuationKeys()),
                'valuation_complete' => $this->allAssetsHaveValuation($batch),
                'post_valuation_complete' => $this->documentsComplete($workflowDocuments, $this->postValuationRequiredKeys()),
            ],
            'signatories_raw' => $signatoriesInput,
            'signatories' => [
                'kepala_balai' => $this->mapEmployee($kepalaBalai),
            ],
            'committees' => [
                'panitia_penghapusan' => $panitiaMapped,
                'tim_penilai' => $timPenilaiMapped,
                'pemeriksa' => $pemeriksaMapped,
            ],
            'document_numbers' => $documentNumbers,
            'document_kaps' => $documentKaps,
            'document_dates' => $documentDates,
            'print_config' => [
                'paper' => 'A4',
                'locale' => 'id-ID',
                'currency' => 'IDR',
            ],
            'document_versions' => [],
        ];
    }

    /**
     * @param array<string, mixed> $documents
     * @param list<string> $keys
     */
    private function documentsComplete(array $documents, array $keys): bool
    {
        foreach ($keys as $key) {
            $status = $documents[$key]['status'] ?? null;
            if (!in_array($status, [AuctionBatchDocumentWorkflow::STATUS_SIGNED, AuctionBatchDocumentWorkflow::STATUS_COMPLETED], true)) {
                return false;
            }
        }

        return true;
    }

    private function allAssetsHaveValuation(AuctionBatch $batch): bool
    {
        $assets = $batch->assets;

        if ($assets->isEmpty()) {
            return false;
        }

        foreach ($assets as $asset) {
            if (is_null($asset->pivot->nilai_taksiran) || $asset->pivot->nilai_taksiran <= 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return list<string>
     */
    private function postValuationRequiredKeys(): array
    {
        return array_values(array_map(
            fn(array $definition) => $definition['key'],
            array_filter(
                $this->documentWorkflow->definitions(),
                fn(array $definition) => $definition['requires_valuation'] && $definition['required_for_submit']
            )
        ));
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
