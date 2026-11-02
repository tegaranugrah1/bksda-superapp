<?php

namespace App\Modules\SuratTugas\Requests;

class ApproveAssignmentLetterRequest extends AssignmentLetterRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && (in_array($user->role, ['admin', 'super_admin'], true) || $user->hasPermission('surat_tugas.approve'));
    }

    public function rules(): array
    {
        $rules = parent::rules();
        // Approval accepts partial edits; the merged document is checked before publication.
        foreach (['maksud_tujuan', 'tanggal_mulai', 'tanggal_selesai', 'sumber_dana', 'employees'] as $field) {
            $rules[$field] = match ($field) {
                'tanggal_mulai', 'tanggal_selesai' => 'nullable|date',
                'employees' => 'nullable|array',
                default => 'nullable|string',
            };
        }
        $rules['status'] = 'nullable|in:pending,approved,PENDING,APPROVED';
        $rules['employee_ids'] = 'nullable|array';
        $rules['employee_ids.*'] = 'required|integer|exists:kpg_employees,id';
        unset($rules['file_surat']);

        return $rules;
    }
}
