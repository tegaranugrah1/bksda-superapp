<?php

namespace App\Modules\Bmn\Requests;

use App\Modules\Bmn\Services\AuctionBatchDocumentWorkflow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateAuctionBatchDraftMetadataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('bmn.auction.update');
    }

    public function rules(): array
    {
        $workflow = app(AuctionBatchDocumentWorkflow::class);
        $statuses = implode(',', $workflow->statuses());

        return [
            'kepala_balai_id' => ['nullable'],
            'signatories' => ['nullable', 'array'],
            'signatories.panitia' => ['nullable', 'array'],
            'signatories.panitia.*' => ['nullable'],
            'signatories.tim_penilai' => ['nullable', 'array'],
            'signatories.tim_penilai.*' => ['nullable'],
            'signatories.pemeriksa' => ['nullable', 'array'],
            'signatories.pemeriksa.*' => ['nullable'],
            'document_numbers' => ['nullable', 'array'],
            'document_numbers.*' => ['nullable', 'string', 'max:255'],
            'document_kaps' => ['nullable', 'array'],
            'document_kaps.*' => ['nullable', 'string', 'max:255'],
            'document_dates' => ['nullable', 'array'],
            'document_dates.*' => ['nullable', 'date'],
            'workflow' => ['nullable', 'array'],
            'workflow.documents' => ['nullable', 'array'],
            'workflow.documents.*' => ['nullable', 'array'],
            'workflow.documents.*.status' => ['nullable', 'string', "in:{$statuses}"],
            'workflow.documents.*.channel' => ['nullable', 'string', 'in:srikandi,manual_ttd,external,app'],
            'workflow.documents.*.completed_at' => ['nullable', 'date'],
            'workflow.documents.*.number' => ['nullable', 'string', 'max:255'],
            'workflow.documents.*.date' => ['nullable', 'date'],
            'workflow.documents.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $documents = $this->input('workflow.documents', []);

            if (!is_array($documents)) {
                return;
            }

            $workflow = app(AuctionBatchDocumentWorkflow::class);
            $invalidKeys = array_values(array_diff(array_keys($documents), $workflow->keys()));

            if (!empty($invalidKeys)) {
                $validator->errors()->add(
                    'workflow.documents',
                    'Dokumen workflow tidak dikenal: ' . implode(', ', $invalidKeys)
                );
            }
        });
    }
}
