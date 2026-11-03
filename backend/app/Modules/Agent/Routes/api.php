<?php

use App\Modules\Agent\Controllers\AgentAuthController;
use App\Modules\Agent\Controllers\AgentLeaveController;
use App\Modules\Agent\Controllers\AgentSuratTugasController;
use Illuminate\Support\Facades\Route;

// 1. Autentikasi & Verifikasi Nomor Telepon Staf
Route::post('/auth/verify-phone', [AgentAuthController::class, 'verifyPhone']);
Route::post('/auth/link-phone', [AgentAuthController::class, 'linkPhone']);

// 2. Layanan Kepegawaian & Cuti
Route::get('/employees/{nip}/leaves', [AgentLeaveController::class, 'getLeaveBalance']);
Route::post('/leaves/request', [AgentLeaveController::class, 'submitLeaveRequest']);

// 3. Layanan Surat Tugas
Route::get('/employees/{nip}/surat-tugas/active', [AgentSuratTugasController::class, 'getActiveSuratTugas']);
Route::post('/surat-tugas/draft', [AgentSuratTugasController::class, 'createDraftSuratTugas']);
