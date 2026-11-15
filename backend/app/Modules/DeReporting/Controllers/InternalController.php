<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\DeReporting\Models\Internal;
use App\Modules\DeReporting\Requests\StoreInternalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InternalController extends Controller
{
    /**
     * GET /api/dereporting/internals
     * Membaca Daftar Laporan Internal dengan Scoping Hak Akses (Need-to-Know Basis)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = in_array($user->role, ['admin', 'super_admin']) || $user->hasPermission('dereporting.view_all');
        $userEmployee = $user->employee;
        $userUrusanNames = $userEmployee ? $userEmployee->matchingUrusanNames() : [];
        $lowerUrusans = array_map(fn ($v) => strtolower(trim($v)), $userUrusanNames);

        $query = Internal::with([
            'uploader:id,name,username',
            'tahun',
            'bidang',
            'jenis',
            'kategori',
            'jenisData',
            'koordinator',
            'anggaran',
            'recipients.user:id,name,username',
        ])->latest();

        // 1. Scoping Berdasarkan Hak Akses Pengguna
        if (! $isAdmin) {
            $query->where(function ($q) use ($user, $lowerUrusans) {
                // A. Laporan yang diunggah oleh user sendiri
                $q->where('user_id', $user->id)
                  // B. Laporan bersifat terbuka untuk seluruh Balai
                  ->orWhere('target_scope', 'all')
                  // C. Laporan dengan sasaran terbatas yang ditujukan ke user ini atau urusannya
                  ->orWhereHas('recipients', function ($rQuery) use ($user, $lowerUrusans) {
                      $rQuery->where(function ($sub) use ($user, $lowerUrusans) {
                          $sub->where('recipient_type', 'user')
                              ->where('user_id', $user->id);
                          if (! empty($lowerUrusans)) {
                              $sub->orWhere(function ($uSub) use ($lowerUrusans) {
                                  $uSub->where('recipient_type', 'urusan')
                                       ->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(urusan_name)'), $lowerUrusans);
                              });
                          }
                      });
                  });
            });
        }

        // 2. Filter Segmented Tabs
        $tab = $request->input('tab', 'all_relevant');
        if ($tab === 'my_uploads') {
            $query->where('user_id', $user->id);
        } elseif ($tab === 'personal') {
            $query->whereHas('recipients', fn ($r) => $r->where('recipient_type', 'user')->where('user_id', $user->id));
        } elseif ($tab === 'urusan') {
            if (! empty($lowerUrusans)) {
                $query->whereHas('recipients', fn ($r) => $r->where('recipient_type', 'urusan')
                    ->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(urusan_name)'), $lowerUrusans));
            } else {
                // User belum terdaftar di urusan manapun
                $query->whereRaw('1 = 0');
            }
        } elseif ($tab === 'balai' && $isAdmin) {
            // Admin melihat semua arsip balai tanpa filter tambahan
        }

        // 3. Pencarian Cerdas
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($sub) use ($search) {
                $sub->where('judul_laporan', 'ILIKE', "%{$search}%")
                    ->orWhere('keterangan', 'ILIKE', "%{$search}%");
            });
        }

        // Paging 20 item per layar
        $paginator = $query->paginate(20);

        // Transformasi item untuk antarmuka pengguna
        $paginator->getCollection()->transform(function ($item) use ($user, $lowerUrusans, $isAdmin) {
            $isMine = (int) $item->user_id === (int) $user->id;

            // Hitung status baca bagi user yang sedang login
            $isReadByMe = $isMine;
            $readAt = null;

            if (! $isMine) {
                $matchingRecipients = $item->recipients->filter(function ($rec) use ($user, $lowerUrusans) {
                    if ($rec->recipient_type === 'user' && (int) $rec->user_id === (int) $user->id) {
                        return true;
                    }
                    if ($rec->recipient_type === 'urusan' && ! empty($lowerUrusans)
                        && in_array(strtolower(trim((string) ($rec->urusan_name ?? ''))), $lowerUrusans, true)) {
                        return true;
                    }
                    return false;
                });

                if ($matchingRecipients->isNotEmpty()) {
                    $firstRead = $matchingRecipients->first(fn ($r) => $r->read_at !== null);
                    if ($firstRead) {
                        $isReadByMe = true;
                        $readAt = $firstRead->read_at;
                    } else {
                        $isReadByMe = false;
                    }
                } elseif ($item->target_scope === 'all') {
                    $isReadByMe = true;
                }
            }

            // Ringkasan penerima untuk badge tabel
            $recipientsSummary = $item->recipients->map(function ($r) {
                if ($r->recipient_type === 'urusan') {
                    return [
                        'type' => 'urusan',
                        'label' => $r->urusan_name,
                        'read_at' => $r->read_at,
                    ];
                }
                return [
                    'type' => 'user',
                    'label' => $r->user?->name ?: 'Pegawai #'.$r->user_id,
                    'read_at' => $r->read_at,
                ];
            })->values();

            return [
                'id' => $item->id,
                'judul_laporan' => $item->judul_laporan,
                'keterangan' => $item->keterangan,
                'target_scope' => $item->target_scope ?? 'all',
                'review_status' => $item->review_status ?? 'terkirim',
                'review_notes' => $item->review_notes,
                'file_path' => $item->file_path,
                'created_at' => $item->created_at,
                'uploader' => [
                    'id' => $item->uploader?->id,
                    'name' => $item->uploader?->name,
                    'username' => $item->uploader?->username,
                ],
                'bidang' => $item->bidang ? ['id' => $item->bidang->id, 'nama' => $item->bidang->nama] : null,
                'tahun' => $item->tahun ? ['id' => $item->tahun->id, 'tahun' => $item->tahun->tahun] : null,
                'jenis' => $item->jenis ? ['id' => $item->jenis->id, 'nama' => $item->jenis->nama] : null,
                'kategori' => $item->kategori ? ['id' => $item->kategori->id, 'nama' => $item->kategori->nama] : null,
                'jenis_data' => $item->jenisData ? ['id' => $item->jenisData->id, 'nama' => $item->jenisData->nama] : null,
                'anggaran' => $item->anggaran ? ['id' => $item->anggaran->id, 'nama' => $item->anggaran->nama] : null,
                'is_mine' => $isMine,
                'is_read_by_me' => $isReadByMe,
                'read_at' => $readAt,
                'recipients_summary' => $recipientsSummary,
                'actions_allowed' => [
                    'can_preview' => true,
                    'can_download' => true,
                    'can_review' => $isAdmin || ! $isMine,
                    'can_delete' => $isAdmin || $isMine,
                ],
            ];
        });

        return response()->json($paginator);
    }

    /**
     * POST /api/dereporting/internals
     * Mengunggah Laporan Baru dengan Pilihan Multi-Penerima
     */
    public function store(StoreInternalRequest $request)
    {
        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
            $filePath = $file->storeAs('private/dereporting/internals', $filename);
        }

        $targetScope = $request->input('target_scope', 'all');

        $report = Internal::create([
            'user_id' => $request->user()->id,
            'target_scope' => $targetScope,
            'tahun_id' => $request->tahun_id,
            'bidang_id' => $request->bidang_id,
            'jenis_id' => $request->jenis_id,
            'kategori_id' => $request->kategori_id,
            'jenis_data_id' => $request->jenis_data_id,
            'koordinator_id' => $request->koordinator_id,
            'anggaran_id' => $request->anggaran_id,
            'judul_laporan' => $request->judul_laporan,
            'keterangan' => $request->keterangan,
            'file_path' => $filePath,
            'review_status' => 'terkirim',
        ]);

        // Simpan penerima jika target terbatas
        if ($targetScope === 'restricted' && $request->has('recipients')) {
            $recipients = $request->input('recipients', []);
            foreach ($recipients as $rec) {
                if (empty($rec['type'])) {
                    continue;
                }
                $report->recipients()->create([
                    'recipient_type' => $rec['type'],
                    'user_id' => $rec['type'] === 'user' ? ($rec['user_id'] ?? null) : null,
                    'urusan_name' => $rec['type'] === 'urusan' ? ($rec['urusan_name'] ?? null) : null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Laporan berhasil disandikan dan dikunci dalam brankas.',
            'data' => $report->load('recipients'),
        ], 201);
    }

    /**
     * GET /api/dereporting/internals/{id}/preview
     * Pratinjau Cepat PDF Inline & Otomatis Update Tanda Baca (Read Receipt)
     */
    public function previewFile(Request $request, string $id)
    {
        $report = Internal::with('recipients')->findOrFail($id);
        $user = $request->user();

        // Pemeriksaan Otorisasi Anti-IDOR
        if (! $this->userCanAccessReport($user, $report)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk melihat laporan ini.'], 403);
        }

        if (! $report->file_path || ! Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas fisik tidak ditemukan di dalam brankas server.'], 404);
        }

        // Tandai sebagai dibaca bagi user atau urusan penerima
        $userEmployee = $user->employee;
        $lowerUrusans = $userEmployee
            ? array_map(fn ($v) => strtolower(trim($v)), $userEmployee->matchingUrusanNames())
            : [];

        $report->recipients()
            ->whereNull('read_at')
            ->where(function ($q) use ($user, $lowerUrusans) {
                $q->where(fn ($sub) => $sub->where('recipient_type', 'user')->where('user_id', $user->id));
                if (! empty($lowerUrusans)) {
                    $q->orWhere(fn ($sub) => $sub->where('recipient_type', 'urusan')
                        ->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(urusan_name)'), $lowerUrusans));
                }
            })
            ->update(['read_at' => now()]);

        $safeTitle = preg_replace('/[\/\\\\:*?"<>|\r\n]/', '_', $report->judul_laporan ?: 'Laporan_Internal');
        $ext = strtolower(pathinfo($report->file_path, PATHINFO_EXTENSION));
        $mime = $ext === 'pdf' ? 'application/pdf' : (Storage::mimeType($report->file_path) ?: 'application/octet-stream');

        return Storage::response($report->file_path, "{$safeTitle}.{$ext}", [
            'Content-Type' => $mime,
            'Content-Disposition' => "inline; filename=\"{$safeTitle}.{$ext}\"",
        ]);
    }

    /**
     * GET /api/dereporting/internals/{id}/download
     * Pintu Gaib Penyalur Berkas Rahasia dengan Verifikasi Otorisasi (Anti-IDOR)
     */
    public function downloadFile(Request $request, string $id)
    {
        $report = Internal::with('recipients')->findOrFail($id);
        $user = $request->user();

        // Pemeriksaan Otorisasi Anti-IDOR
        if (! $this->userCanAccessReport($user, $report)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk mengunduh laporan ini.'], 403);
        }

        if (! $report->file_path || ! Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas fisik tidak ditemukan di dalam brankas server.'], 404);
        }

        $safeTitle = preg_replace('/[\/\\\\:*?"<>|\r\n]/', '_', $report->judul_laporan ?: 'Laporan_Internal');
        $ext = pathinfo($report->file_path, PATHINFO_EXTENSION);

        return Storage::download($report->file_path, "{$safeTitle}.{$ext}");
    }

    /**
     * PUT /api/dereporting/internals/{id}/review
     * Konfirmasi Tinjauan & Catatan Tindak Lanjut
     */
    public function updateReview(Request $request, string $id)
    {
        $report = Internal::with('recipients')->findOrFail($id);
        $user = $request->user();

        if (! $this->userCanAccessReport($user, $report)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk meninjau laporan ini.'], 403);
        }

        $request->validate([
            'review_status' => 'required|string|in:sesuai,perlu_revisi,terkirim',
            'review_notes' => 'nullable|string|max:1000',
        ]);

        $report->update([
            'review_status' => $request->review_status,
            'review_notes' => $request->review_notes,
        ]);

        return response()->json([
            'message' => 'Status tinjauan laporan berhasil diperbarui.',
            'data' => $report,
        ]);
    }

    /**
     * DELETE /api/dereporting/internals/{id}
     * Menghapus Laporan Internal (SoftDeletes)
     */
    public function destroy(Request $request, string $id)
    {
        $report = Internal::findOrFail($id);
        $user = $request->user();

        if ($user && ! in_array($user->role, ['admin', 'super_admin']) && (int) $report->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk menghapus laporan ini.'], 403);
        }

        $report->delete();

        return response()->json([
            'message' => 'Laporan telah ditarik dari peredaran publik (Archived).',
        ]);
    }

    /**
     * GET /api/dereporting/recipients/candidates
     * Mengambil daftar pegawai Balai sebagai kandidat penerima laporan
     */
    public function candidateRecipients(Request $request)
    {
        $search = $request->input('search', '');
        $query = User::query()
            ->select(['id', 'name', 'username'])
            ->where('is_active', true)
            ->with('employee:nip,nama_lengkap,jabatan,satuan_kerja,resor');

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('username', 'ILIKE', "%{$search}%");
            });
        }

        $users = $query->orderBy('name', 'asc')->limit(100)->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->employee?->nama_lengkap ?: $u->name,
                'nip' => $u->username,
                'jabatan' => $u->employee?->jabatan ?: 'Staf',
                'urusan' => $u->employee?->location?->name ?: ($u->employee?->resor ?: $u->employee?->satuan_kerja),
            ];
        });

        return response()->json(['data' => $users]);
    }

    /**
     * Helper Keamanan: Memeriksa apakah user berhak mengakses laporan (Need-to-Know Basis)
     */
    private function userCanAccessReport(User $user, Internal $report): bool
    {
        // 1. Super Admin & Pimpinan dengan permission dereporting.view_all
        if (in_array($user->role, ['admin', 'super_admin']) || $user->hasPermission('dereporting.view_all')) {
            return true;
        }

        // 2. Pengunggah dokumen sendiri
        if ((int) $report->user_id === (int) $user->id) {
            return true;
        }

        // 3. Dokumen publik seluruh Balai
        if (($report->target_scope ?? 'all') === 'all') {
            return true;
        }

        // 4. Dokumen terbatas: periksa daftar penerima
        $userEmployee = $user->employee;
        $lowerUrusans = $userEmployee
            ? array_map(fn ($v) => strtolower(trim($v)), $userEmployee->matchingUrusanNames())
            : [];

        foreach ($report->recipients as $recipient) {
            if ($recipient->recipient_type === 'user' && (int) $recipient->user_id === (int) $user->id) {
                return true;
            }
            if ($recipient->recipient_type === 'urusan' && ! empty($lowerUrusans)
                && in_array(strtolower(trim((string) ($recipient->urusan_name ?? ''))), $lowerUrusans, true)) {
                return true;
            }
        }

        return false;
    }
}
