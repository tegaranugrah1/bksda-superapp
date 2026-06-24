<?php

namespace App\Modules\Bmn\Services;

class AuctionBatchDocumentWorkflow
{
    public const STATUS_NOT_STARTED = 'not_started';
    public const STATUS_PREPARED = 'prepared';
    public const STATUS_PRINTED = 'printed';
    public const STATUS_SIGNED = 'signed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_SKIPPED = 'skipped';

    /**
     * @return list<array<string, mixed>>
     */
    public function definitions(): array
    {
        return [
            [
                'key' => 'sk_penghentian',
                'title' => 'Penghentian Penggunaan BMN',
                'channel' => 'srikandi',
                'phase' => 'pre_valuation',
                'order' => 10,
                'requires_valuation' => false,
                'number_key' => 'sk_penghentian',
                'date_key' => 'sk_penghentian',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'ba_koreksi',
                'title' => 'Koreksi Perubahan Kondisi BMN',
                'channel' => 'srikandi',
                'phase' => 'pre_valuation',
                'order' => 20,
                'requires_valuation' => false,
                'number_key' => 'ba_koreksi',
                'date_key' => 'ba_koreksi',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'sk_panitia_penghapusan',
                'title' => 'Panitia Penghapusan Barang Milik Negara Berupa Alat Angkutan Bermotor Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur',
                'channel' => 'srikandi',
                'phase' => 'pre_valuation',
                'order' => 30,
                'requires_valuation' => false,
                'number_key' => 'sk_panitia',
                'date_key' => 'sk_panitia',
                'required_for_valuation' => true,
                'required_for_submit' => true,
                'legacy_key' => 'sk_panitia',
            ],
            [
                'key' => 'sk_kebenaran',
                'title' => 'Surat Pernyataan Kebenaran Data BMN',
                'channel' => 'manual_ttd',
                'phase' => 'pre_valuation',
                'order' => 40,
                'requires_valuation' => false,
                'number_key' => 'sk_kebenaran',
                'date_key' => 'sk_kebenaran',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'sptjm',
                'title' => 'Surat Pernyataan Tanggung Jawab Mutlak',
                'channel' => 'manual_ttd',
                'phase' => 'pre_valuation',
                'order' => 50,
                'requires_valuation' => false,
                'number_key' => 'sptjm',
                'date_key' => 'sptjm',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'sp_kelancaran_tugas',
                'title' => 'Surat Pernyataan Kelancaran Tugas Dinas',
                'channel' => 'manual_ttd',
                'phase' => 'pre_valuation',
                'order' => 60,
                'requires_valuation' => false,
                'number_key' => 'sp_tugas',
                'date_key' => 'sp_tugas',
                'required_for_valuation' => true,
                'required_for_submit' => true,
                'legacy_key' => 'sp_tugas',
            ],
            [
                'key' => 'ba_pemeriksaan',
                'title' => 'Berita Acara Pemeriksaan BMN',
                'channel' => 'manual_ttd',
                'phase' => 'pre_valuation',
                'order' => 70,
                'requires_valuation' => false,
                'number_key' => 'ba_pemeriksaan',
                'date_key' => 'ba_pemeriksaan',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'surat_tugas_pemeriksaan_penilaian',
                'title' => 'Surat Tugas Pemeriksaan dan Penilaian BMN',
                'channel' => 'srikandi',
                'phase' => 'pre_valuation',
                'order' => 80,
                'requires_valuation' => false,
                'number_key' => 'surat_tugas_pemeriksaan_penilaian',
                'date_key' => 'surat_tugas_pemeriksaan_penilaian',
                'required_for_valuation' => true,
                'required_for_submit' => true,
            ],
            [
                'key' => 'sk_panitia_penaksir_harga',
                'title' => 'Pembentukan Panitia Penaksir Harga Barang Milik Negara Pada Balai Konservasi Sumber Daya Alam Kalimantan Timur',
                'channel' => 'srikandi',
                'phase' => 'pre_valuation',
                'order' => 90,
                'requires_valuation' => false,
                'number_key' => 'sk_tim_penilai',
                'date_key' => 'sk_tim_penilai',
                'required_for_valuation' => true,
                'required_for_submit' => true,
                'legacy_key' => 'sk_tim_penilai',
            ],
            [
                'key' => 'nilai_taksiran',
                'title' => 'Nilai Taksiran BMN',
                'channel' => 'app',
                'phase' => 'valuation',
                'order' => 100,
                'requires_valuation' => false,
                'number_key' => null,
                'date_key' => null,
                'required_for_valuation' => false,
                'required_for_submit' => true,
            ],
            [
                'key' => 'sptj_limit',
                'title' => 'Surat Pernyataan Tanggung Jawab Nilai Limit',
                'channel' => 'manual_ttd',
                'phase' => 'post_valuation',
                'order' => 110,
                'requires_valuation' => true,
                'number_key' => 'sptj_limit',
                'date_key' => 'sptj_limit',
                'required_for_valuation' => false,
                'required_for_submit' => true,
            ],
            [
                'key' => 'nota_dinas_ksdae',
                'title' => 'Nota Dinas KSDAE Setelah Penaksiran',
                'channel' => 'srikandi',
                'phase' => 'post_valuation',
                'order' => 120,
                'requires_valuation' => true,
                'number_key' => 'nota_dinas',
                'date_key' => 'nota_dinas',
                'required_for_valuation' => false,
                'required_for_submit' => true,
                'legacy_key' => 'nota_dinas',
            ],
            [
                'key' => 'permohonan_kpknl',
                'title' => 'Permohonan Penjualan BMN ke KPKNL',
                'channel' => 'external',
                'phase' => 'post_valuation',
                'order' => 130,
                'requires_valuation' => true,
                'number_key' => 'permohonan_kpknl',
                'date_key' => 'permohonan_kpknl',
                'required_for_valuation' => false,
                'required_for_submit' => true,
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public function keys(): array
    {
        return array_map(fn(array $definition) => $definition['key'], $this->definitions());
    }

    public function has(string $key): bool
    {
        return $this->get($key) !== null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function get(string $key): ?array
    {
        foreach ($this->definitions() as $definition) {
            if ($definition['key'] === $key) {
                return $definition;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public function statuses(): array
    {
        return [
            self::STATUS_NOT_STARTED,
            self::STATUS_PREPARED,
            self::STATUS_PRINTED,
            self::STATUS_SIGNED,
            self::STATUS_COMPLETED,
            self::STATUS_SKIPPED,
        ];
    }

    /**
     * @return list<string>
     */
    public function requiredForValuationKeys(): array
    {
        return array_values(array_map(
            fn(array $definition) => $definition['key'],
            array_filter($this->definitions(), fn(array $definition) => $definition['required_for_valuation'])
        ));
    }

    /**
     * @return list<string>
     */
    public function requiredForSubmitKeys(): array
    {
        return array_values(array_map(
            fn(array $definition) => $definition['key'],
            array_filter($this->definitions(), fn(array $definition) => $definition['required_for_submit'])
        ));
    }

    /**
     * @param array<string, mixed> $documents
     * @return array<string, mixed>
     */
    public function sortDocumentProgress(array $documents): array
    {
        $ordered = [];

        foreach ($this->definitions() as $definition) {
            $key = $definition['key'];
            if (array_key_exists($key, $documents)) {
                $ordered[$key] = $documents[$key];
            }
        }

        foreach ($documents as $key => $document) {
            if (!array_key_exists($key, $ordered)) {
                $ordered[$key] = $document;
            }
        }

        return $ordered;
    }
}
