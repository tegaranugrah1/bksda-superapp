<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransitionAuctionBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $status = $this->input('status');
        if ($status === 'DIAJUKAN') {
            return $this->user()->hasPermission('bmn.auction.update');
        }
        return $this->user()->hasPermission('bmn.auction.finalize');
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:DIAJUKAN,JADWAL_DITETAPKAN,LELANG_ULANG,REALISASI,BATAL'],
            'kepala_balai_id' => ['required_if:status,DIAJUKAN', 'nullable'],
            'signatories' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'signatories.panitia' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'signatories.tim_penilai' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'signatories.pemeriksa' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'document_numbers' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'document_kaps' => ['nullable', 'array'],
            'document_kaps.*' => ['nullable', 'string', 'max:255'],
            'document_dates' => ['required_if:status,DIAJUKAN', 'nullable', 'array'],
            'no_surat_persetujuan' => ['required_if:status,JADWAL_DITETAPKAN', 'nullable', 'string', 'max:100'],
            'tanggal_surat_persetujuan' => ['required_if:status,JADWAL_DITETAPKAN', 'nullable', 'date'],
            'no_surat_penetapan' => ['required_if:status,JADWAL_DITETAPKAN', 'nullable', 'string', 'max:100'],
            'tanggal_lelang' => ['required_if:status,JADWAL_DITETAPKAN', 'nullable', 'date'],
            'no_surat_jadwal_ulang' => ['required_if:status,LELANG_ULANG', 'nullable', 'string', 'max:100'],
            'tanggal_lelang_ulang' => ['required_if:status,LELANG_ULANG', 'nullable', 'date'],
            'reauction_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
