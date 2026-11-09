<?php

namespace App\Modules\Kepegawaian\Services;

use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceReconcilerService
{
    /**
     * Rekonsiliasi data presensi SIKADIR dengan database Surat Tugas & Cuti.
     *
     * @param array $parsedEmployeeData Hasil parsing dari SikadirParserService
     * @param string|null $targetPeriode Format 'YYYY-MM', misal '2026-09'
     * @param array $manualOverrides Modifikasi manual dari admin UI jika ada
     * @return array Data rekonsiliasi siap simpan / pratinjau matriks
     */
    public function reconcile(array $parsedEmployeeData, ?string $targetPeriode = null, array $manualOverrides = []): array
    {
        $cleanNip = $parsedEmployeeData['clean_nip'] ?? '';
        $periode = $targetPeriode ?: ($parsedEmployeeData['periode_bulan'] ?? Carbon::now()->format('Y-m'));

        // 1. Cari Pegawai di Master Data (portable cross SQLite & PostgreSQL)
        $employee = Employee::where('nip', $cleanNip)
            ->orWhereRaw("REPLACE(REPLACE(nip, ' ', ''), '-', '') = ?", [$cleanNip])
            ->first();

        // 2. Tentukan Tahun Angkatan (Digit 9-12 NIP/NIPPPK)
        $tahunAngkatan = null;
        if (strlen($cleanNip) >= 12) {
            $yearStr = substr($cleanNip, 8, 4);
            if (is_numeric($yearStr) && (int)$yearStr >= 1970 && (int)$yearStr <= 2035) {
                $tahunAngkatan = (int)$yearStr;
            }
        }

        // 3. Resolusi Tarif & Pajak SBM
        $pangkatGolongan = $employee?->pangkat_golongan ?? $parsedEmployeeData['golongan_sikadir'];
        $jenisPegawai = $employee?->jenis_pegawai ?? (str_contains(strtoupper($parsedEmployeeData['keterangan_lain'] ?? ''), 'PERJANJIAN KERJA') ? 'PPPK' : 'PNS');
        $tariffInfo = AdaptiveTariffResolver::resolve($pangkatGolongan, $jenisPegawai, $parsedEmployeeData);

        // 4. Ambil Daftar Surat Tugas pada Bulan Berjalan
        $activeSuratTugas = $this->fetchSuratTugasForEmployee($employee?->id, $cleanNip, $periode);

        // 5. Ambil Daftar Cuti Sah pada Bulan Berjalan
        $activeCuti = $this->fetchCutiForEmployee($employee?->id, $periode);

        // 6. Buat Matriks Kalender 1..DaysInMonth
        $carbonPeriod = Carbon::createFromFormat('Y-m', $periode)->startOfMonth();
        $daysInMonth = $carbonPeriod->daysInMonth;
        $dailyMatrix = [];
        $overrideLogs = [];

        $jmlHadir = 0;
        $jmlPd = 0;
        $jmlCuti = 0;
        $jmlSakit = 0;
        $jmlIzin = 0;
        $jmlAlpa = 0;
        $jmlHariKerja = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDate = $carbonPeriod->copy()->day($day);
            $dateYmd = $currentDate->format('Y-m-d');
            $isWeekend = HolidayCalendarHelper::isWeekend($currentDate);
            $isHoliday = HolidayCalendarHelper::isHoliday($currentDate);
            $holidayName = HolidayCalendarHelper::getHolidayName($currentDate);

            // A. Akhir Pekan & Hari Libur Nasional
            if ($isWeekend || $isHoliday) {
                $dailyMatrix[$day] = [
                    'day' => $day,
                    'date' => $dateYmd,
                    'status' => '-', // Libur
                    'label' => $isWeekend ? 'Akhir Pekan' : ($holidayName ?: 'Hari Libur Nasional'),
                    'is_holiday' => true,
                    'is_weekend' => $isWeekend,
                    'is_overridden' => false,
                ];
                continue;
            }

            // B. Cek TMT Nonaktif Pegawai (UM-01: Hari pada atau setelah TMT tidak dapat dihitung uang makan)
            if ($employee && $employee->inactive_effective_date && $dateYmd >= $employee->inactive_effective_date->toDateString()) {
                $tmtStr = $employee->inactive_effective_date->toDateString();
                $dailyMatrix[$day] = [
                    'day' => $day,
                    'date' => $dateYmd,
                    'status' => '-',
                    'label' => "Nonaktif (TMT: {$tmtStr})",
                    'is_holiday' => false,
                    'is_weekend' => false,
                    'is_overridden' => false,
                ];
                continue;
            }

            // Hari kerja resmi
            $jmlHariKerja++;

            // B. Data Mentah SIKADIR pada hari ini
            $sikadirDay = $parsedEmployeeData['daily_records'][$day] ?? null;
            $statusSikadir = $sikadirDay['status_sikadir'] ?? 'TK';
            $jamMasuk = $sikadirDay['jam_masuk'] ?? '';
            $jamPulang = $sikadirDay['jam_pulang'] ?? '';

            // C. Cross-check Surat Tugas (Tingkat Prioritas 1)
            $matchingSt = $this->findMatchingSuratTugas($activeSuratTugas, $dateYmd);
            $finalStatus = $statusSikadir;
            $isOverridden = false;
            $overrideReason = null;
            $stNomor = null;
            $stId = null;

            if ($matchingSt) {
                $stNomor = $matchingSt->nomor_surat ?? 'Surat Tugas';
                $stId = $matchingSt->id ?? null;

                $finalStatus = 'PD';
                if ($statusSikadir === 'H') {
                    $isOverridden = true;
                    $overrideReason = "Override otomatis dari Hadir (SIKADIR) ke PD karena memiliki Surat Tugas No. {$stNomor}";
                    $overrideLogs[] = [
                        'day' => $day,
                        'date' => $dateYmd,
                        'from' => 'H',
                        'to' => 'PD',
                        'reason' => $overrideReason,
                        'st_id' => $stId,
                        'st_nomor' => $stNomor,
                        'by' => 'system_reconciliation',
                        'timestamp' => Carbon::now()->toIso8601String(),
                    ];
                }
            }

            // D. Cross-check Cuti Sah (Tingkat Prioritas 2)
            $matchingCuti = $this->findMatchingCuti($activeCuti, $dateYmd);
            if ($matchingCuti && $finalStatus !== 'PD') {
                $finalStatus = 'CT';
                if ($statusSikadir === 'H') {
                    $isOverridden = true;
                    $overrideReason = "Sedang Cuti Sah ({$matchingCuti->jenis_cuti})";
                    $overrideLogs[] = [
                        'day' => $day,
                        'date' => $dateYmd,
                        'from' => 'H',
                        'to' => 'CT',
                        'reason' => $overrideReason,
                        'by' => 'system_cuti_check',
                        'timestamp' => Carbon::now()->toIso8601String(),
                    ];
                }
            }

            // E. Cek Manual Overrides dari Admin UI jika ada
            if (isset($manualOverrides[$day])) {
                $userStatus = $manualOverrides[$day];
                if ($userStatus !== $finalStatus) {
                    $overrideLogs[] = [
                        'day' => $day,
                        'date' => $dateYmd,
                        'from' => $finalStatus,
                        'to' => $userStatus,
                        'reason' => 'Koreksi manual admin kepegawaian',
                        'by' => 'admin_manual',
                        'timestamp' => Carbon::now()->toIso8601String(),
                    ];
                    $finalStatus = $userStatus;
                    $isOverridden = true;
                }
            }

            // Akumulasi rekapitulasi kehadiran
            if ($finalStatus === 'H') {
                $jmlHadir++;
            } elseif ($finalStatus === 'PD') {
                $jmlPd++;
            } elseif ($finalStatus === 'CT') {
                $jmlCuti++;
            } elseif ($finalStatus === 'S') {
                $jmlSakit++;
            } elseif ($finalStatus === 'I') {
                $jmlIzin++;
            } else {
                $finalStatus = 'TK';
                $jmlAlpa++;
            }

            $dailyMatrix[$day] = [
                'day' => $day,
                'date' => $dateYmd,
                'status' => $finalStatus,
                'status_sikadir' => $statusSikadir,
                'jam_masuk' => $jamMasuk,
                'jam_pulang' => $jamPulang,
                'is_overridden' => $isOverridden,
                'override_reason' => $overrideReason,
                'st_nomor' => $stNomor,
                'st_id' => $stId,
                'is_holiday' => false,
                'is_weekend' => false,
            ];
        }

        // 7. Hitung Nominal Keuangan
        $tarifHarian = (float) $tariffInfo['tarif'];
        $persenPph21 = (float) $tariffInfo['persen_pph'];
        $uangMakanBruto = $jmlHadir * $tarifHarian;
        $potonganPph21 = $uangMakanBruto * ($persenPph21 / 100.0);
        $uangMakanNetto = $uangMakanBruto - $potonganPph21;

        return [
            'employee_id' => $employee?->id,
            'nip' => $cleanNip,
            'nama_lengkap' => $employee?->nama_lengkap ?: $parsedEmployeeData['nama_lengkap'],
            'jabatan' => $employee?->jabatan ?: $parsedEmployeeData['jabatan'],
            'jenis_pegawai' => $jenisPegawai,
            'tahun_angkatan' => $tahunAngkatan,
            'satuan_kerja' => $employee?->satuan_kerja ?: ($parsedEmployeeData['unit_kerja'] ?? 'Kantor Balai KSDA Kalimantan Timur'),
            'golongan' => $tariffInfo['golongan_label'],
            'nama_bank' => $employee?->nama_bank ?: 'BRI',
            'nomor_rekening' => $employee?->nomor_rekening,
            'telepon' => $employee?->telepon,

            // Tarif & Pajak
            'tarif_harian' => $tarifHarian,
            'persen_pph21' => $persenPph21,

            // Rekapitulasi Hari
            'days_in_month' => $daysInMonth,
            'jml_hari_kerja' => $jmlHariKerja,
            'jml_hadir' => $jmlHadir,
            'jml_pd' => $jmlPd,
            'jml_cuti' => $jmlCuti,
            'jml_sakit' => $jmlSakit,
            'jml_izin' => $jmlIzin,
            'jml_alpa' => $jmlAlpa,

            // Keuangan
            'uang_makan_bruto' => $uangMakanBruto,
            'potongan_pph21' => $potonganPph21,
            'uang_makan_netto' => $uangMakanNetto,

            // Matriks & Log Audit
            'golden_checksum' => $parsedEmployeeData['golden_checksum'] ?? null,
            'daily_matrix' => $dailyMatrix,
            'override_logs' => $overrideLogs,
        ];
    }

    /**
     * Ambil Surat Tugas yang bersinggungan dengan bulan berjalan untuk pegawai tertentu.
     */
    protected function fetchSuratTugasForEmployee(?int $employeeId, string $cleanNip, string $periode): array
    {
        $startOfMonth = Carbon::createFromFormat('Y-m', $periode)->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::createFromFormat('Y-m', $periode)->endOfMonth()->format('Y-m-d');

        $query = DB::table('st_assignment_letters as st')
            ->join('st_assignment_letter_employees as st_emp', 'st_emp.assignment_letter_id', '=', 'st.id')
            ->select(
                'st.id',
                'st.nomor_surat',
                'st.status',
                DB::raw("COALESCE(st_emp.tanggal_mulai, st.tanggal_mulai) as tgl_mulai"),
                DB::raw("COALESCE(st_emp.tanggal_selesai, st.tanggal_selesai) as tgl_selesai")
            )
            ->whereNull('st.deleted_at')
            // Keep the historical terbit alias while sharing the current official lifecycle.
            ->whereIn(DB::raw('LOWER(TRIM(st.status))'), [...AssignmentLetter::OFFICIAL_STATUSES, 'terbit'])
            ->where(function ($dateQ) use ($startOfMonth, $endOfMonth) {
                $dateQ->whereBetween(DB::raw("COALESCE(st_emp.tanggal_mulai, st.tanggal_mulai)"), [$startOfMonth, $endOfMonth])
                    ->orWhereBetween(DB::raw("COALESCE(st_emp.tanggal_selesai, st.tanggal_selesai)"), [$startOfMonth, $endOfMonth])
                    ->orWhere(function ($containQ) use ($startOfMonth, $endOfMonth) {
                        $containQ->where(DB::raw("COALESCE(st_emp.tanggal_mulai, st.tanggal_mulai)"), '<=', $startOfMonth)
                            ->where(DB::raw("COALESCE(st_emp.tanggal_selesai, st.tanggal_selesai)"), '>=', $endOfMonth);
                    });
            });

        if ($employeeId) {
            $query->where('st_emp.employee_id', $employeeId);
        } else {
            $query->join('kpg_employees as emp', 'st_emp.employee_id', '=', 'emp.id')
                ->whereRaw("REGEXP_REPLACE(emp.nip, '[^0-9]', '', 'g') = ?", [$cleanNip]);
        }

        return $query->get()->toArray();
    }

    /**
     * Ambil Cuti sah yang bersinggungan dengan bulan berjalan.
     */
    protected function fetchCutiForEmployee(?int $employeeId, string $periode): array
    {
        if (!$employeeId) {
            return [];
        }

        $startOfMonth = Carbon::createFromFormat('Y-m', $periode)->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::createFromFormat('Y-m', $periode)->endOfMonth()->format('Y-m-d');

        return DB::table('kpg_employee_leave_requests')
            ->where('employee_id', $employeeId)
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->where('status', 'approved')
                  ->orWhere('status_pertimbangan_pejabat', 'disetujui');
            })
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('tanggal_mulai', [$startOfMonth, $endOfMonth])
                  ->orWhereBetween('tanggal_selesai', [$startOfMonth, $endOfMonth])
                  ->orWhere(function ($sub) use ($startOfMonth, $endOfMonth) {
                      $sub->where('tanggal_mulai', '<=', $startOfMonth)
                          ->where('tanggal_selesai', '>=', $endOfMonth);
                  });
            })
            ->select('id', 'jenis_cuti', 'tanggal_mulai', 'tanggal_selesai')
            ->get()
            ->toArray();
    }

    protected function findMatchingSuratTugas(array $suratTugasList, string $dateYmd): ?object
    {
        foreach ($suratTugasList as $st) {
            $mulai = $st->tgl_mulai ? Carbon::parse($st->tgl_mulai)->format('Y-m-d') : null;
            $selesai = $st->tgl_selesai ? Carbon::parse($st->tgl_selesai)->format('Y-m-d') : null;

            if ($mulai && $selesai && $dateYmd >= $mulai && $dateYmd <= $selesai) {
                return $st;
            }
        }
        return null;
    }

    protected function findMatchingCuti(array $cutiList, string $dateYmd): ?object
    {
        foreach ($cutiList as $cuti) {
            $mulai = $cuti->tanggal_mulai ? Carbon::parse($cuti->tanggal_mulai)->format('Y-m-d') : null;
            $selesai = $cuti->tanggal_selesai ? Carbon::parse($cuti->tanggal_selesai)->format('Y-m-d') : null;

            if ($mulai && $selesai && $dateYmd >= $mulai && $dateYmd <= $selesai) {
                return $cuti;
            }
        }
        return null;
    }
}
