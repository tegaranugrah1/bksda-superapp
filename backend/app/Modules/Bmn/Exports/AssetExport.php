<?php

namespace App\Modules\Bmn\Exports;

use App\Modules\Bmn\Models\Asset;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AssetExport implements FromCollection, WithHeadings, WithMapping
{
    private bool $includeNupLama;
    private array $filters;
    private int $rowNumber = 0;

    public function __construct(bool $includeNupLama = true, array $filters = [])
    {
        $this->includeNupLama = $includeNupLama;
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = Asset::latest();

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nama_barang', 'LIKE', "%{$search}%")
                    ->orWhere('kode_barang', 'LIKE', "%{$search}%")
                    ->orWhere('merk', 'LIKE', "%{$search}%");
            });
        }
        if (!empty($this->filters['nup'])) {
            $nup = $this->filters['nup'];
            $query->where(function ($q) use ($nup) {
                $q->where('nup', $nup)
                    ->orWhere('nup_lama', $nup);
            });
        }
        if (!empty($this->filters['kondisi'])) {
            $query->where('kondisi', $this->filters['kondisi']);
        }
        if (!empty($this->filters['jenis_bmn'])) {
            $query->where('jenis_bmn', $this->filters['jenis_bmn']);
        }
        if (!empty($this->filters['lokasi_ruang'])) {
            $query->where('lokasi_ruang', 'LIKE', '%' . $this->filters['lokasi_ruang'] . '%');
        }

        return $query->get();
    }

    public function headings(): array
    {
        $headers = [
            'No', 'Jenis BMN', 'Kode Satker', 'Nama Satker', 'Kode Barang', 'NUP',
        ];

        if ($this->includeNupLama) {
            $headers[] = 'NUP LAMA';
        }

        return array_merge($headers, [
            'Nama Barang', 'Status BMN', 'Merk', 'Tipe', 'Kondisi', 'Umur Aset',
            'Intra / Extra', 'Henti Guna', 'Status SBSN', 'Status BMN Idle',
            'Status Kemitraan', 'BPYBDS', 'Usulan Barang Hilang', 'Usulan Barang RB',
            'Usul Hapus', 'Hibah DKTP', 'Konsensi Jasa', 'Properti Investasi',
            'Jenis Dokumen', 'No Dokumen', 'No BPKP', 'No Polisi',
            'Status Sertifikasi', 'Jenis Sertipikat', 'No Sertifikat', 'Nama',
            'Tanggal Buku Pertama', 'Tanggal Perolehan', 'Tanggal Pengapusan',
            'Nilai Perolehan Pertama', 'Nilai Mutasi', 'Nilai Perolehan',
            'Nilai Penyusutan', 'Nilai Buku', 'Luas Tanah Seluruhnya',
            'Luas Tanah Untuk Bangunan', 'Luas Tanah Untuk Sarana Lingkungan',
            'Luas Lahan Kosong', 'Luas Bangunan', 'Luas Tapak Bangunan',
            'Luas Pemanfataan', 'Jumlah Lantai', 'Jumlah Foto',
            'Status Penggunaan', 'No PSP', 'Tanggal PSP', 'Alamat', 'RT/RW',
            'Kelurahan/Desa', 'Kecamatan', 'Kab/Kota', 'Kode Kab/Kota',
            'Provinsi', 'Kode Provinsi', 'Kode Pos', 'SBSK', 'Optimalisasi',
            'Penghuni', 'Pengguna', 'Kode KPKNL', 'Uraian KPKNL',
            'Uraian Kanwil DJKN', 'Nama K/L', 'Nama E1', 'Nama Korwil',
            'Kode Register', 'Lokasi Ruang', 'Jenis Identitas', 'No Identitas',
            'No STNK', 'Nama Pengguna', 'Status PMK', 'Foto Ber-geotag',
        ]);
    }

    public function map($asset): array
    {
        $this->rowNumber++;

        $row = [
            $this->rowNumber,
            $asset->jenis_bmn,
            $asset->kode_satker,
            $asset->nama_satker,
            $asset->kode_barang,
            $asset->nup,
        ];

        if ($this->includeNupLama) {
            $row[] = $asset->nup_lama;
        }

        return array_merge($row, [
            $asset->nama_barang,
            $asset->status_bmn,
            $asset->merk,
            $asset->tipe,
            $asset->kondisi,
            $asset->umur_aset,
            $asset->intra_extra,
            $asset->henti_guna,
            $asset->status_sbsn,
            $asset->status_bmn_idle,
            $asset->status_kemitraan,
            $asset->bpybds,
            $asset->usulan_barang_hilang,
            $asset->usulan_barang_rb,
            $asset->usul_hapus,
            $asset->hibah_dktp,
            $asset->konsensi_jasa,
            $asset->properti_investasi,
            $asset->jenis_dokumen,
            $asset->no_dokumen,
            $asset->no_bpkp,
            $asset->no_polisi,
            $asset->status_sertifikasi,
            $asset->jenis_sertipikat,
            $asset->no_sertifikat,
            $asset->nama,
            $asset->tanggal_buku_pertama?->format('Y-m-d'),
            $asset->tanggal_perolehan?->format('Y-m-d'),
            $asset->tanggal_pengapusan?->format('Y-m-d'),
            $asset->nilai_perolehan_pertama,
            $asset->nilai_mutasi,
            $asset->nilai_perolehan,
            $asset->nilai_penyusutan,
            $asset->nilai_buku,
            $asset->luas_tanah_seluruhnya,
            $asset->luas_tanah_bangunan,
            $asset->luas_tanah_sarana,
            $asset->luas_lahan_kosong,
            $asset->luas_bangunan,
            $asset->luas_tapak_bangunan,
            $asset->luas_pemanfaatan,
            $asset->jumlah_lantai,
            $asset->jumlah_foto,
            $asset->status_penggunaan,
            $asset->no_psp,
            $asset->tanggal_psp?->format('Y-m-d'),
            $asset->alamat,
            $asset->rt_rw,
            $asset->kelurahan_desa,
            $asset->kecamatan,
            $asset->kab_kota,
            $asset->kode_kab_kota,
            $asset->provinsi,
            $asset->kode_provinsi,
            $asset->kode_pos,
            $asset->sbsk,
            $asset->optimalisasi,
            $asset->penghuni,
            $asset->pengguna,
            $asset->kode_kpknl,
            $asset->uraian_kpknl,
            $asset->uraian_kanwil_djkn,
            $asset->nama_kl,
            $asset->nama_e1,
            $asset->nama_korwil,
            $asset->kode_register,
            $asset->lokasi_ruang,
            $asset->jenis_identitas,
            $asset->no_identitas,
            $asset->no_stnk,
            $asset->nama_pengguna,
            $asset->status_pmk,
            $asset->foto_geotag_url,
        ]);
    }
}
