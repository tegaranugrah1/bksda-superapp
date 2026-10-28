<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeIncomingLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['super_admin', 'admin'], true);
    }

    protected function prepareForValidation(): void
    {
        $fields = ['no_agenda', 'no_surat_masuk', 'asal_surat', 'perihal', 'catatan', 'no_surat_balasan'];
        $clean = [];
        foreach ($fields as $field) {
            if ($this->has($field)) {
                $val = trim((string) $this->input($field));
                $clean[$field] = $val !== '' ? strip_tags($val) : null;
            }
        }
        if (!empty($clean)) {
            $this->merge($clean);
        }
    }

    public function rules(): array
    {
        $fileTypes = 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png';
        $mimeTypes = implode(',', [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
        ]);

        return [
            'no_agenda' => 'required|string|max:100',
            'no_surat_masuk' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'tanggal_diterima' => 'required|date',
            'asal_surat' => 'required|string|max:255',
            'kategori' => 'required|in:Mahasiswa,Instansi,Internal,Masyarakat,Lainnya',
            'perihal' => 'nullable|string|max:5000',
            'catatan' => 'nullable|string|max:5000',
            'no_surat_balasan' => 'nullable|string|max:255',
            'tanggal_surat_balasan' => 'nullable|date',
            'attachments' => 'nullable|array|max:20',
            'attachments.*' => "file|mimetypes:{$mimeTypes}|extensions:{$fileTypes}|max:20480",
            'attachment_types' => 'nullable|array',
            'attachment_types.*' => 'required|in:incoming,supporting,reply',
            'attachment_notes' => 'nullable|array',
            'attachment_notes.*' => 'nullable|string|max:255',
            'delete_attachment_ids' => 'nullable|array|max:20',
            'delete_attachment_ids.*' => 'integer|exists:kpg_incoming_letter_attachments,id',
        ];
    }
}
