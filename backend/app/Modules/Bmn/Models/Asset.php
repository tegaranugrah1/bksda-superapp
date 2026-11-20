<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class Asset extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'bmn_assets';

    protected $fillable = [
        'id', 'jenis_bmn', 'kode_satker', 'nama_satker', 'kode_barang', 'nup', 'nup_lama',
        'nama_barang', 'status_bmn', 'merk', 'tipe', 'merk_tipe', 'kondisi', 'umur_aset',
        'intra_extra', 'henti_guna', 'status_sbsn', 'status_bmn_idle', 'status_kemitraan',
        'bpybds', 'usulan_barang_hilang', 'usulan_barang_rb', 'usul_hapus', 'hibah_dktp',
        'konsensi_jasa', 'properti_investasi', 'jenis_dokumen', 'no_dokumen', 'no_bpkp',
        'no_polisi', 'status_sertifikasi', 'jenis_sertipikat', 'no_sertifikat', 'nama',
        'tanggal_buku_pertama', 'tanggal_perolehan', 'tanggal_pengapusan',
        'nilai_perolehan_pertama', 'nilai_mutasi', 'nilai_perolehan', 'nilai_penyusutan', 'nilai_buku',
        'luas_tanah_seluruhnya', 'luas_tanah_bangunan', 'luas_tanah_sarana', 'luas_lahan_kosong',
        'luas_bangunan', 'luas_tapak_bangunan', 'luas_pemanfaatan', 'jumlah_lantai', 'jumlah_foto',
        'status_penggunaan', 'no_psp', 'tanggal_psp', 'alamat', 'rt_rw', 'kelurahan_desa',
        'kecamatan', 'kab_kota', 'kode_kab_kota', 'provinsi', 'kode_provinsi', 'kode_pos',
        'sbsk', 'optimalisasi', 'penghuni', 'pengguna', 'kode_kpknl', 'uraian_kpknl',
        'uraian_kanwil_djkn', 'nama_kl', 'nama_e1', 'nama_korwil', 'kode_register', 'lokasi_ruang',
        'jenis_identitas', 'no_identitas', 'no_stnk', 'no_mesin', 'no_rangka', 'nama_pengguna', 'status_pmk',
        'status_foto_geotag', 'foto_geotag_url', 'foto_geotag_path', 'foto_depan_path', 'foto_belakang_path',
        'foto_geotag_latitude', 'foto_geotag_longitude', 'foto_geotag_location_note',
        'foto_kiri_path', 'foto_kanan_path', 'foto_lokasi_path',
        'foto_bpkb_1_path', 'foto_bpkb_2_path', 'foto_bpkb_3_path', 'foto_bpkb_4_path',
        'foto_stnk_1_path', 'foto_stnk_2_path',
        'bpkb_document_path', 'bpkb_document_mime', 'bpkb_document_original_name', 'bpkb_preview_path',
        'stnk_document_path', 'stnk_document_mime', 'stnk_document_original_name', 'stnk_preview_path',
        'verified_at', 'verified_by',
        'tahun_perolehan', 'lokasi_spesifik', 'employee_id', 'foto_url', 'keterangan',
        'tanggal_pajak_stnk', 'tanggal_ganti_plat',
    ];

    protected $casts = [
        'nilai_perolehan' => 'decimal:2',
        'nilai_buku' => 'decimal:2',
        'nilai_penyusutan' => 'decimal:2',
        'nilai_perolehan_pertama' => 'decimal:2',
        'nilai_mutasi' => 'decimal:2',
        'tahun_perolehan' => 'integer',
        'umur_aset' => 'integer',
        'jumlah_lantai' => 'integer',
        'jumlah_foto' => 'integer',
        'tanggal_perolehan' => 'date',
        'tanggal_buku_pertama' => 'date',
        'tanggal_pengapusan' => 'date',
        'tanggal_psp' => 'date',
        'tanggal_pajak_stnk' => 'date',
        'tanggal_ganti_plat' => 'date',
        'verified_at' => 'datetime',
        'foto_geotag_latitude' => 'decimal:7',
        'foto_geotag_longitude' => 'decimal:7',
    ];

    public function penanggungJawab()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function loans()
    {
        return $this->hasMany(AssetLoan::class, 'asset_id');
    }

    public function maintenances()
    {
        return $this->hasMany(AssetMaintenance::class, 'asset_id');
    }

    public function historyUpdates()
    {
        return $this->hasMany(AssetUpdate::class, 'asset_id');
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'bmn_asset_tag', 'asset_id', 'tag_id')
            ->withTimestamps();
    }

    public function auctionBatches()
    {
        return $this->belongsToMany(AuctionBatch::class, 'bmn_asset_auction_batch', 'bmn_asset_id', 'bmn_auction_batch_id')
            ->withPivot([
                'id',
                'lot_number',
                'nilai_taksiran',
                'kertas_kerja_data',
                'sort_order',
                'asset_snapshot',
                'freeze_snapshot',
                'first_auction_is_sold',
                'first_auction_price',
                'reauction_is_sold',
                'reauction_price',
                'final_result',
                'final_price',
                'final_auction_date',
                'disposed_at',
            ])
            ->withTimestamps();
    }

    public function isOwnedByEmployee(Employee $employee): bool
    {
        if ($this->employee_id !== null) {
            return (int) $this->employee_id === (int) $employee->id;
        }

        return Employee::resolveIdByName($this->pengguna, $this->nama_pengguna) === (int) $employee->id;
    }

    public function hasActiveLoanForEmployee(Employee $employee): bool
    {
        return $this->loans()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])
            ->exists();
    }

    public function canEmployeeView(Employee $employee, bool $isPublicPhoto): bool
    {
        if ($this->hasActiveLoanForEmployee($employee)) {
            return $isPublicPhoto;
        }

        return $this->isOwnedByEmployee($employee);
    }

    /**
     * Apply shared BMN catalog filters for both paginated listing and Excel export.
     */
    public function scopeApplyCatalogFilters(Builder $query, array $filters): Builder
    {
        $filled = static fn (string $key): bool => isset($filters[$key]) && trim((string) $filters[$key]) !== '';

        if ($filled('search')) {
            $search = trim((string) $filters['search']);
            $likePattern = '%' . addcslashes($search, '%_') . '%';
            $cleanLikePattern = '%' . addcslashes(ltrim($search, '#'), '%_') . '%';
            $likeOp = $query->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

            $query->where(function (Builder $q) use ($likePattern, $cleanLikePattern, $likeOp) {
                $q->where('nama_barang', $likeOp, $likePattern)
                    ->orWhere('kode_barang', $likeOp, $likePattern)
                    ->orWhere('merk', $likeOp, $likePattern)
                    ->orWhere('merk_tipe', $likeOp, $likePattern)
                    ->orWhere('tipe', $likeOp, $likePattern)
                    ->orWhere('nup', $likeOp, $likePattern)
                    ->orWhere('no_polisi', $likeOp, $likePattern)
                    ->orWhere('pengguna', $likeOp, $likePattern)
                    ->orWhere('nama_pengguna', $likeOp, $likePattern)
                    ->orWhereHas('penanggungJawab', fn (Builder $pq) => $pq->where('nama_lengkap', $likeOp, $likePattern))
                    ->orWhereHas('loans', fn (Builder $lq) => $lq->active()->whereHas('borrower', fn (Builder $bq) => $bq->where('nama_lengkap', $likeOp, $likePattern)))
                    ->orWhereHas('tags', fn (Builder $tq) => $tq->where('name', $likeOp, $cleanLikePattern)->orWhere('label', $likeOp, $cleanLikePattern));
            });
        }

        if ($filled('nup')) {
            $nup = trim((string) $filters['nup']);
            $query->where(fn (Builder $q) => $q->where('nup', $nup)->orWhere('nup_lama', $nup));
        }

        if (array_key_exists('employee_id', $filters) && ($filters['employee_id'] !== null && $filters['employee_id'] !== '')) {
            $query->where('employee_id', $filters['employee_id']);
        }

        if ($filled('borrower_id')) {
            $borrowerId = $filters['borrower_id'];
            $query->whereHas('loans', fn (Builder $q) => $q->active()->where('employee_id', $borrowerId));
        }

        foreach (['kondisi', 'jenis_bmn', 'lokasi_ruang'] as $field) {
            if ($filled($field) && $filters[$field] !== 'Semua') {
                $val = addcslashes(mb_strtolower(trim((string) $filters[$field])), '%_');
                $query->whereRaw("LOWER({$field}) LIKE ?", ["%{$val}%"]);
            }
        }

        if ($filled('tahun') && is_numeric($filters['tahun'])) {
            $query->where('tahun_perolehan', (int) $filters['tahun']);
        } else {
            if ($filled('tahun_from') && is_numeric($filters['tahun_from'])) {
                $query->where('tahun_perolehan', '>=', (int) $filters['tahun_from']);
            }
            if ($filled('tahun_to') && is_numeric($filters['tahun_to'])) {
                $query->where('tahun_perolehan', '<=', (int) $filters['tahun_to']);
            }
        }

        $presetStarts = [
            'today' => Carbon::today()->startOfDay(),
            '7d' => Carbon::today()->subDays(6)->startOfDay(),
            '30d' => Carbon::today()->subDays(29)->startOfDay(),
        ];
        $preset = $filled('modified_preset') ? trim((string) $filters['modified_preset']) : '';
        if (isset($presetStarts[$preset])) {
            $query->where('updated_at', '>=', $presetStarts[$preset]);
        } else {
            foreach (['modified_from' => ['>=', 'startOfDay'], 'modified_to' => ['<=', 'endOfDay']] as $key => [$op, $bound]) {
                $raw = $filled($key) ? trim((string) $filters[$key]) : '';
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw) === 1) {
                    $dt = Carbon::createFromFormat('Y-m-d', $raw);
                    if ($dt && $dt->format('Y-m-d') === $raw) {
                        $query->where('updated_at', $op, $dt->{$bound}());
                    }
                }
            }
        }

        $photoStatus = $filters['photo_status'] ?? null;
        if ($photoStatus === 'with_photo' || $photoStatus === 'without_photo') {
            $pathCols = ['foto_geotag_path', 'foto_depan_path', 'foto_belakang_path', 'foto_kiri_path', 'foto_kanan_path', 'foto_lokasi_path'];
            $urlCols = ['foto_geotag_url', 'foto_url'];
            if ($photoStatus === 'with_photo') {
                $query->where(function (Builder $q) use ($pathCols, $urlCols) {
                    foreach ($pathCols as $col) {
                        $q->orWhere(fn (Builder $sq) => $sq->whereNotNull($col)->where($col, '!=', ''));
                    }
                    foreach ($urlCols as $col) {
                        $q->orWhere(fn (Builder $sq) => $sq->whereNotNull($col)->whereNotIn($col, ['', '-']));
                    }
                });
            } else {
                $query->where(function (Builder $q) use ($pathCols, $urlCols) {
                    foreach ($pathCols as $col) {
                        $q->where(fn (Builder $sq) => $sq->whereNull($col)->orWhere($col, ''));
                    }
                    foreach ($urlCols as $col) {
                        $q->where(fn (Builder $sq) => $sq->whereNull($col)->orWhereIn($col, ['', '-']));
                    }
                });
            }
        }

        if (($filters['loan_status'] ?? null) === 'borrowed') {
            $query->whereHas('loans', fn (Builder $q) => $q->active());
        } elseif (($filters['loan_status'] ?? null) === 'available') {
            $query->whereDoesntHave('loans', fn (Builder $q) => $q->active());
        }

        $rawTags = $filters['tag_ids'] ?? ($filters['tag_id'] ?? null);
        if ($rawTags && $rawTags !== 'Semua') {
            $tagIds = is_array($rawTags) ? $rawTags : explode(',', (string) $rawTags);
            $cleanTagIds = array_filter($tagIds, fn ($id) => $id !== 'Semua' && !empty($id));
            if (!empty($cleanTagIds)) {
                $tagsModels = Tag::with('subTags')->whereIn('id', $cleanTagIds)->get();
                foreach ($tagsModels as $tModel) {
                    /** @var Tag $tModel */
                    $familyIds = $tModel->getFamilyTagIds();
                    $query->whereHas('tags', fn (Builder $q) => $q->whereIn('bmn_tags.id', $familyIds));
                }
            }
        }

        return $query;
    }

    /**
     * Apply catalog ordering with deterministic id tie-breaker.
     */
    public function scopeApplyCatalogSort(Builder $query, ?string $sort): Builder
    {
        return match ($sort) {
            'created_desc' => $query->orderByDesc('created_at')->orderBy('id'),
            'year_desc' => $query->orderByRaw('tahun_perolehan IS NULL ASC')->orderByDesc('tahun_perolehan')->orderByDesc('updated_at')->orderBy('id'),
            'year_asc' => $query->orderByRaw('tahun_perolehan IS NULL ASC')->orderBy('tahun_perolehan')->orderByDesc('updated_at')->orderBy('id'),
            'value_desc' => $query->orderByDesc('nilai_perolehan')->orderByDesc('updated_at')->orderBy('id'),
            'code_asc' => $query->orderBy('kode_barang')->orderByRaw('LENGTH(nup) ASC')->orderBy('nup')->orderBy('id'),
            default => $query->orderByDesc('updated_at')->orderByDesc('created_at')->orderBy('id'),
        };
    }

    protected static function booted()
    {
        static::saving(function (self $asset) {
            if (! $asset->isDirty('employee_id') && ($asset->isDirty('pengguna') || $asset->isDirty('nama_pengguna') || ! $asset->exists)) {
                $hasName = (trim((string) ($asset->pengguna ?? '')) !== '' && trim((string) $asset->pengguna) !== '-')
                    || (trim((string) ($asset->nama_pengguna ?? '')) !== '' && trim((string) $asset->nama_pengguna) !== '-');

                if ($hasName) {
                    $resolvedId = Employee::resolveIdByName($asset->pengguna, $asset->nama_pengguna);
                    if ($resolvedId !== null || $asset->isDirty('pengguna') || $asset->isDirty('nama_pengguna')) {
                        $asset->employee_id = $resolvedId;
                    }
                } elseif ($asset->isDirty('pengguna') || $asset->isDirty('nama_pengguna')) {
                    $asset->employee_id = null;
                }
            }
        });

        static::forceDeleted(function ($asset) {
            $paths = [
                $asset->foto_geotag_path,
                $asset->foto_depan_path,
                $asset->foto_belakang_path,
                $asset->foto_kiri_path,
                $asset->foto_kanan_path,
                $asset->foto_lokasi_path,
                $asset->foto_bpkb_1_path,
                $asset->foto_bpkb_2_path,
                $asset->foto_bpkb_3_path,
                $asset->foto_bpkb_4_path,
                $asset->foto_stnk_1_path,
                $asset->foto_stnk_2_path,
                $asset->bpkb_document_path,
                $asset->bpkb_preview_path,
                $asset->stnk_document_path,
                $asset->stnk_preview_path,
            ];

            foreach ($paths as $path) {
                if ($path && Storage::exists($path)) {
                    Storage::delete($path);
                }
            }

            foreach ([$asset->bpkb_preview_path, $asset->stnk_preview_path] as $previewPath) {
                if (! $previewPath) {
                    continue;
                }

                $directory = dirname($previewPath);
                $filename = pathinfo($previewPath, PATHINFO_FILENAME);
                foreach (Storage::files($directory) as $path) {
                    if (preg_match('/^'.preg_quote($filename, '/').'-page-\d+\.jpg$/', basename($path)) === 1) {
                        Storage::delete($path);
                    }
                }
            }
        });
    }
}
