<?php

namespace App\Modules\Kepegawaian\Services;

class AdaptiveTariffResolver
{
    /**
     * SBM Standard Rates & PPh 21 Tax Percentages
     * - Gol I & II / PPPK I-VIII: Rp 35.000 / 0%
     * - Gol III / PPPK IX-XII: Rp 37.000 / 5%
     * - Gol IV / PPPK XIII-XVII: Rp 41.000 / 15%
     */
    public const RATE_GOL_1_2 = 35000.00;
    public const RATE_GOL_3 = 37000.00;
    public const RATE_GOL_4 = 41000.00;

    public const TAX_GOL_1_2 = 0.00;
    public const TAX_GOL_3 = 5.00;
    public const TAX_GOL_4 = 15.00;

    /**
     * Resolves tariff and tax based on Employee record and/or SIKADIR metadata.
     *
     * @param string|null $pangkatGolongan
     * @param string|null $jenisPegawai 'PNS', 'PPPK', 'MMP'
     * @param array $sikadirMeta Metadata extracted from SIKADIR HTML header
     * @return array ['tarif' => float, 'persen_pph' => float, 'kategori' => string, 'golongan_label' => string]
     */
    public static function resolve(?string $pangkatGolongan, ?string $jenisPegawai = null, array $sikadirMeta = []): array
    {
        $rawPangkat = trim((string) $pangkatGolongan);
        $upperPangkat = strtoupper($rawPangkat);

        // 1. Deteksi PNS (Memiliki IV/, III/, II/, I/ atau Pembina/Penata/Pengatur/Juru)
        if (self::isPnsRank($upperPangkat) || $jenisPegawai === 'PNS') {
            if (str_contains($upperPangkat, 'IV/') || str_contains($upperPangkat, 'PEMBINA')) {
                return [
                    'tarif' => self::RATE_GOL_4,
                    'persen_pph' => self::TAX_GOL_4,
                    'kategori' => 'PNS Golongan IV',
                    'golongan_label' => $rawPangkat ?: 'Golongan IV',
                ];
            }
            if (str_contains($upperPangkat, 'III/') || str_contains($upperPangkat, 'PENATA')) {
                return [
                    'tarif' => self::RATE_GOL_3,
                    'persen_pph' => self::TAX_GOL_3,
                    'kategori' => 'PNS Golongan III',
                    'golongan_label' => $rawPangkat ?: 'Golongan III',
                ];
            }
            // Gol I & II
            return [
                'tarif' => self::RATE_GOL_1_2,
                'persen_pph' => self::TAX_GOL_1_2,
                'kategori' => 'PNS Golongan I/II',
                'golongan_label' => $rawPangkat ?: 'Golongan II',
            ];
        }

        // 2. Deteksi PPPK
        if ($jenisPegawai === 'PPPK' || str_contains($upperPangkat, 'PPPK') || str_contains($upperPangkat, 'P3K') || str_starts_with($upperPangkat, '(')) {
            // Ekstrak angka romawi atau arab: 'PPPK Golongan IX' -> 9, '(V)' -> 5
            $gradeNum = self::extractPppkGradeNumber($upperPangkat);

            if ($gradeNum !== null) {
                if ($gradeNum >= 13) {
                    return [
                        'tarif' => self::RATE_GOL_4,
                        'persen_pph' => self::TAX_GOL_4,
                        'kategori' => 'PPPK Golongan XIII-XVII',
                        'golongan_label' => "PPPK Golongan " . self::numberToRoman($gradeNum),
                    ];
                }
                if ($gradeNum >= 9) {
                    return [
                        'tarif' => self::RATE_GOL_3,
                        'persen_pph' => self::TAX_GOL_3,
                        'kategori' => 'PPPK Golongan IX-XII',
                        'golongan_label' => "PPPK Golongan " . self::numberToRoman($gradeNum),
                    ];
                }
                // Gol I - VIII
                return [
                    'tarif' => self::RATE_GOL_1_2,
                    'persen_pph' => self::TAX_GOL_1_2,
                    'kategori' => 'PPPK Golongan I-VIII',
                    'golongan_label' => "PPPK Golongan " . self::numberToRoman($gradeNum),
                ];
            }
        }

        // 3. Fallback: Menggunakan metadata SIKADIR (Kelas Jabatan)
        $kelasJabatan = (int) ($sikadirMeta['kelas_jabatan'] ?? $sikadirMeta['KELAS JABATAN'] ?? 0);

        if ($kelasJabatan > 0) {
            // Jenjang PPPK KLHK:
            // Kelas 9-12 (Ahli Pertama/Muda) -> Gol IX-XII
            // Kelas 5-8 (Pemula/Terampil/Mahir) -> Gol V-VIII
            if ($kelasJabatan >= 9) {
                return [
                    'tarif' => self::RATE_GOL_3,
                    'persen_pph' => self::TAX_GOL_3,
                    'kategori' => 'PPPK Golongan IX (Auto-detect)',
                    'golongan_label' => 'PPPK Golongan IX',
                ];
            }

            return [
                'tarif' => self::RATE_GOL_1_2,
                'persen_pph' => self::TAX_GOL_1_2,
                'kategori' => 'PPPK Golongan V (Auto-detect)',
                'golongan_label' => 'PPPK Golongan V',
            ];
        }

        // Default fallback aman
        return [
            'tarif' => self::RATE_GOL_1_2,
            'persen_pph' => self::TAX_GOL_1_2,
            'kategori' => 'Standard Rate',
            'golongan_label' => $rawPangkat ?: 'Golongan II',
        ];
    }

    protected static function isPnsRank(string $rank): bool
    {
        return str_contains($rank, 'PEMBINA')
            || str_contains($rank, 'PENATA')
            || str_contains($rank, 'PENGATUR')
            || str_contains($rank, 'JURU')
            || preg_match('/\b(IV|III|II|I)\/[A-E]\b/', $rank);
    }

    protected static function extractPppkGradeNumber(string $rank): ?int
    {
        // 1. Format: 'PPPK GOLONGAN IX' atau 'GOLONGAN 9'
        if (preg_match('/GOLONGAN\s+([IVXLCDM]+|\d+)/i', $rank, $matches)) {
            $val = $matches[1];
            return is_numeric($val) ? (int) $val : self::romanToNumber($val);
        }

        // 2. Format bertanda kurung: '(IX)', '(V)', '(III)'
        if (preg_match('/\(([IVXLCDM]+|\d+)\)/i', $rank, $matches)) {
            $val = $matches[1];
            return is_numeric($val) ? (int) $val : self::romanToNumber($val);
        }

        return null;
    }

    public static function romanToNumber(string $roman): int
    {
        $roman = strtoupper(trim($roman));
        $map = [
            'XVII' => 17, 'XVI' => 16, 'XV' => 15, 'XIV' => 14, 'XIII' => 13,
            'XII' => 12, 'XI' => 11, 'X' => 10, 'IX' => 9, 'VIII' => 8,
            'VII' => 7, 'VI' => 6, 'V' => 5, 'IV' => 4, 'III' => 3, 'II' => 2, 'I' => 1,
        ];
        return $map[$roman] ?? 5; // Default 5 jika tidak cocok
    }

    public static function numberToRoman(int $num): string
    {
        $map = [
            17 => 'XVII', 16 => 'XVI', 15 => 'XV', 14 => 'XIV', 13 => 'XIII',
            12 => 'XII', 11 => 'XI', 10 => 'X', 9 => 'IX', 8 => 'VIII',
            7 => 'VII', 6 => 'VI', 5 => 'V', 4 => 'IV', 3 => 'III', 2 => 'II', 1 => 'I',
        ];
        return $map[$num] ?? (string) $num;
    }
}
