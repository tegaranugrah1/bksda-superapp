<?php

namespace App\Modules\Agent\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Agent\Services\PhoneSanitizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentAuthController extends Controller
{
    /**
     * Verifikasi nomor pengirim WhatsApp ke basis data pegawai resmi BKSDA Kaltim.
     */
    public function verifyPhone(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string|max:50',
        ]);

        $employee = PhoneSanitizerService::findEmployeeByPhone($validated['phone']);

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'code' => 'UNREGISTERED_PHONE',
                'message' => 'Nomor WhatsApp belum terdaftar atau belum memiliki pemilik yang unik. Perbarui nomor melalui profil Portal setelah login, atau hubungi Subbagian Tata Usaha.',
            ], 404);
        }

        $user = $employee->user;

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'nama_lengkap' => $employee->nama_lengkap,
                'jabatan' => $employee->jabatan,
                'pangkat_golongan' => $employee->pangkat_golongan,
                'satuan_kerja' => $employee->satuan_kerja,
                'telepon' => $employee->telepon,
                'role' => $user?->role ?? 'pegawai',
            ],
        ]);
    }

    /**
     * Konfirmasi nomor yang sudah tercatat pada profil; perubahan dilakukan setelah login Portal.
     */
    public function linkPhone(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nip' => 'required|string|min:9|max:30',
            'phone' => 'required|string|max:50',
        ]);

        $employee = PhoneSanitizerService::linkPhoneToEmployee($validated['nip'], $validated['phone']);

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'code' => 'EMPLOYEE_NOT_FOUND',
                'message' => 'Nomor belum cocok dengan profil pegawai aktif. Perbarui nomor melalui profil Portal setelah login.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Nomor WhatsApp berhasil diverifikasi dan ditautkan ke akun ' . $employee->nama_lengkap . '.',
            'data' => [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'nama_lengkap' => $employee->nama_lengkap,
                'satuan_kerja' => $employee->satuan_kerja,
                'telepon' => $employee->telepon,
            ],
        ]);
    }
}
