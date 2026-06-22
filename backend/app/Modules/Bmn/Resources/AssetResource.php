<?php

namespace App\Modules\Bmn\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'jenis_bmn' => $this->jenis_bmn,
            'kode_satker' => $this->kode_satker,
            'nama_satker' => $this->nama_satker,
            'kode_barang' => $this->kode_barang,
            'nup' => $this->nup,
            'nup_lama' => $this->nup_lama,
            'nama_barang' => $this->nama_barang,
            'status_bmn' => $this->status_bmn,
            'merk' => $this->merk,
            'tipe' => $this->tipe,
            'merk_tipe' => $this->merk_tipe,
            'kondisi' => $this->kondisi,
            'umur_aset' => $this->umur_aset,
            'intra_extra' => $this->intra_extra,
            'henti_guna' => $this->henti_guna,
            'status_sbsn' => $this->status_sbsn,
            'status_bmn_idle' => $this->status_bmn_idle,
            'status_kemitraan' => $this->status_kemitraan,
            'bpybds' => $this->bpybds,
            'usulan_barang_hilang' => $this->usulan_barang_hilang,
            'usulan_barang_rb' => $this->usulan_barang_rb,
            'usul_hapus' => $this->usul_hapus,
            'hibah_dktp' => $this->hibah_dktp,
            'konsensi_jasa' => $this->konsensi_jasa,
            'properti_investasi' => $this->properti_investasi,
            'jenis_dokumen' => $this->jenis_dokumen,
            'no_dokumen' => $this->no_dokumen,
            'no_bpkp' => $this->no_bpkp,
            'no_polisi' => $this->no_polisi,
            'status_sertifikasi' => $this->status_sertifikasi,
            'jenis_sertipikat' => $this->jenis_sertipikat,
            'no_sertifikat' => $this->no_sertifikat,
            'nama' => $this->nama,
            'tanggal_buku_pertama' => $this->tanggal_buku_pertama?->format('Y-m-d'),
            'tanggal_perolehan' => $this->tanggal_perolehan?->format('Y-m-d'),
            'tanggal_pengapusan' => $this->tanggal_pengapusan?->format('Y-m-d'),
            'nilai_perolehan_pertama' => (float) $this->nilai_perolehan_pertama,
            'nilai_mutasi' => (float) $this->nilai_mutasi,
            'nilai_perolehan' => (float) $this->nilai_perolehan,
            'nilai_penyusutan' => (float) $this->nilai_penyusutan,
            'nilai_buku' => (float) $this->nilai_buku,
            'luas_tanah_seluruhnya' => (float) $this->luas_tanah_seluruhnya,
            'luas_tanah_bangunan' => (float) $this->luas_tanah_bangunan,
            'luas_tanah_sarana' => (float) $this->luas_tanah_sarana,
            'luas_lahan_kosong' => (float) $this->luas_lahan_kosong,
            'luas_bangunan' => (float) $this->luas_bangunan,
            'luas_tapak_bangunan' => (float) $this->luas_tapak_bangunan,
            'luas_pemanfaatan' => (float) $this->luas_pemanfaatan,
            'jumlah_lantai' => $this->jumlah_lantai,
            'jumlah_foto' => $this->jumlah_foto,
            'status_penggunaan' => $this->status_penggunaan,
            'no_psp' => $this->no_psp,
            'tanggal_psp' => $this->tanggal_psp?->format('Y-m-d'),
            'alamat' => $this->alamat,
            'rt_rw' => $this->rt_rw,
            'kelurahan_desa' => $this->kelurahan_desa,
            'kecamatan' => $this->kecamatan,
            'kab_kota' => $this->kab_kota,
            'kode_kab_kota' => $this->kode_kab_kota,
            'provinsi' => $this->provinsi,
            'kode_provinsi' => $this->kode_provinsi,
            'kode_pos' => $this->kode_pos,
            'sbsk' => $this->sbsk,
            'optimalisasi' => $this->optimalisasi,
            'penghuni' => $this->penghuni,
            'pengguna' => $this->pengguna,
            'kode_kpknl' => $this->kode_kpknl,
            'uraian_kpknl' => $this->uraian_kpknl,
            'uraian_kanwil_djkn' => $this->uraian_kanwil_djkn,
            'nama_kl' => $this->nama_kl,
            'nama_e1' => $this->nama_e1,
            'nama_korwil' => $this->nama_korwil,
            'kode_register' => $this->kode_register,
            'lokasi_ruang' => $this->lokasi_ruang,
            'jenis_identitas' => $this->jenis_identitas,
            'no_identitas' => $this->no_identitas,
            'no_stnk' => $this->no_stnk,
            'no_mesin' => $this->no_mesin,
            'no_rangka' => $this->no_rangka,
            'tanggal_pajak_stnk' => $this->tanggal_pajak_stnk?->format('Y-m-d'),
            'tanggal_ganti_plat' => $this->tanggal_ganti_plat?->format('Y-m-d'),
            'nama_pengguna' => $this->nama_pengguna,
            'status_pmk' => $this->status_pmk,
            'status_foto_geotag' => $this->status_foto_geotag,
            'foto_geotag_url' => $this->foto_geotag_url,
            'foto_geotag_path' => $this->foto_geotag_path ? Storage::url($this->foto_geotag_path) : null,
            'foto_geotag_latitude' => $this->foto_geotag_latitude !== null ? (float) $this->foto_geotag_latitude : null,
            'foto_geotag_longitude' => $this->foto_geotag_longitude !== null ? (float) $this->foto_geotag_longitude : null,
            'foto_geotag_location_note' => $this->foto_geotag_location_note,
            'foto_depan_url' => $this->foto_depan_path ? Storage::url($this->foto_depan_path) : null,
            'foto_belakang_url' => $this->foto_belakang_path ? Storage::url($this->foto_belakang_path) : null,
            'foto_kiri_url' => $this->foto_kiri_path ? Storage::url($this->foto_kiri_path) : null,
            'foto_kanan_url' => $this->foto_kanan_path ? Storage::url($this->foto_kanan_path) : null,
            'foto_lokasi_url' => $this->foto_lokasi_path ? Storage::url($this->foto_lokasi_path) : null,
            'foto_bpkb_1_url' => $this->foto_bpkb_1_path ? "/api/bmn/assets/{$this->id}/photo/bpkb_1/view" : null,
            'foto_bpkb_2_url' => $this->foto_bpkb_2_path ? "/api/bmn/assets/{$this->id}/photo/bpkb_2/view" : null,
            'foto_bpkb_3_url' => $this->foto_bpkb_3_path ? "/api/bmn/assets/{$this->id}/photo/bpkb_3/view" : null,
            'foto_bpkb_4_url' => $this->foto_bpkb_4_path ? "/api/bmn/assets/{$this->id}/photo/bpkb_4/view" : null,
            'foto_stnk_1_url' => $this->foto_stnk_1_path ? "/api/bmn/assets/{$this->id}/photo/stnk_1/view" : null,
            'foto_stnk_2_url' => $this->foto_stnk_2_path ? "/api/bmn/assets/{$this->id}/photo/stnk_2/view" : null,
            'bpkb_document' => $this->vehicleDocumentPayload('bpkb'),
            'stnk_document' => $this->vehicleDocumentPayload('stnk'),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'verified_by_name' => $this->verified_by ? User::find($this->verified_by)?->name : null,
            'tahun_perolehan' => $this->tahun_perolehan,
            'lokasi_spesifik' => $this->lokasi_spesifik,
            'foto_url' => $this->foto_url,
            'keterangan' => $this->keterangan,
            'penanggung_jawab' => $this->whenLoaded('penanggungJawab', fn () => [
                'id' => $this->penanggungJawab->id,
                'nama_lengkap' => $this->penanggungJawab->nama_lengkap,
                'nip' => $this->penanggungJawab->nip,
            ]),
            'active_loan' => $this->whenLoaded('loans', function () {
                $activeLoan = $this->loans->firstWhere(fn ($loan) => in_array($loan->status, ['dipinjam', 'terlambat']));
                if (! $activeLoan) {
                    return null;
                }

                return [
                    'id' => $activeLoan->id,
                    'borrower_name' => $activeLoan->borrower?->nama_lengkap ?? $activeLoan->borrower?->nama ?? '-',
                    'borrower_nip' => $activeLoan->borrower?->nip,
                    'loan_date' => $activeLoan->tanggal_pinjam?->format('Y-m-d'),
                    'due_date' => $activeLoan->due_date?->format('Y-m-d'),
                    'status' => $activeLoan->status,
                ];
            }),
            'history_updates' => $this->whenLoaded('historyUpdates', fn () => $this->historyUpdates->sortByDesc('created_at')->values()->map(fn ($u) => [
                'id' => $u->id,
                'field_changed' => $u->field_changed,
                'old_value' => $u->old_value,
                'new_value' => $u->new_value,
                'alasan_perubahan' => $u->alasan_perubahan,
                'created_at' => $u->created_at?->toIso8601String(),
                'author' => $u->author ? ['id' => $u->author->id, 'name' => $u->author->name] : null,
            ])
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }

    private function vehicleDocumentPayload(string $type): ?array
    {
        $documentColumn = "{$type}_document_path";
        $mimeColumn = "{$type}_document_mime";
        $originalNameColumn = "{$type}_document_original_name";
        $previewColumn = "{$type}_preview_path";

        if (! $this->$documentColumn) {
            return null;
        }

        $version = $this->documentVersion($type);
        $documentUrl = "/api/bmn/assets/{$this->id}/document/{$type}/view?v={$version}";
        $previewUrl = $this->$previewColumn
            ? "/api/bmn/assets/{$this->id}/document/{$type}/preview?v={$version}"
            : ($this->isImageDocument($this->$mimeColumn) ? $documentUrl : null);

        return [
            'path' => $this->$documentColumn,
            'mime' => $this->$mimeColumn,
            'original_name' => $this->$originalNameColumn,
            'preview_path' => $this->$previewColumn,
            'url' => $documentUrl,
            'download_url' => "/api/bmn/assets/{$this->id}/document/{$type}/download?v={$version}",
            'preview_url' => $previewUrl,
            'preview_urls' => $this->vehicleDocumentPreviewUrls($type, $this->$previewColumn, $previewUrl, $version),
        ];
    }

    private function vehicleDocumentPreviewUrls(string $type, ?string $previewPath, ?string $previewUrl, string $version): array
    {
        if (! $previewPath || ! $previewUrl) {
            return [];
        }

        $urls = [$previewUrl];
        $directory = dirname($previewPath);
        $filename = pathinfo($previewPath, PATHINFO_FILENAME);
        $pagePaths = collect(Storage::files($directory))
            ->filter(fn (string $path) => preg_match('/^'.preg_quote($filename, '/').'-page-(\d+)\.jpg$/', basename($path)) === 1)
            ->sortBy(fn (string $path) => (int) preg_replace('/^.*-page-(\d+)\.jpg$/', '$1', basename($path)))
            ->values();

        foreach ($pagePaths as $path) {
            if (preg_match('/-page-(\d+)\.jpg$/', basename($path), $matches)) {
                $urls[] = "/api/bmn/assets/{$this->id}/document/{$type}/preview/{$matches[1]}?v={$version}";
            }
        }

        return array_values(array_unique($urls));
    }

    private function documentVersion(string $type): string
    {
        $documentColumn = "{$type}_document_path";
        $previewColumn = "{$type}_preview_path";

        return substr(md5(($this->$documentColumn ?: '').'|'.($this->$previewColumn ?: '').'|'.$this->updated_at?->timestamp), 0, 12);
    }

    private function isImageDocument(?string $mime): bool
    {
        return is_string($mime) && str_starts_with($mime, 'image/');
    }
}
