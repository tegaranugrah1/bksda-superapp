# Technical Design — Issue #580: Perbaikan Pagination Endpoint Surat Masuk & Sinkronisasi Arsip

> **Issue**: #580
> **Dokumen Terkait**: `requirements.md`, `tasks.md`

---

## 1. Backend Controller Design

### 1.1 `SuratMasukController.php`
Pada method `index(Request $request)`:
```php
public function index(Request $request): JsonResponse
{
    $query = SuratMasuk::with(['disposisi', 'creator'])
        ->orderBy('id', 'desc');

    if ($request->filled('search')) {
        $search = $request->input('search');
        $query->where(function ($q) use ($search) {
            $q->where('no_surat', 'like', "%{$search}%")
              ->orWhere('no_agenda', 'like', "%{$search}%")
              ->orWhere('asal_surat', 'like', "%{$search}%")
              ->orWhere('isi_ringkas', 'like', "%{$search}%");
        });
    }

    if ($request->filled('sifat')) {
        $sifat = $request->input('sifat');
        $query->whereJsonContains('sifat_json', $sifat);
    }

    // Handle 'all' or numeric pagination
    $perPageParam = $request->input('per_page', 10);
    if ($perPageParam === 'all') {
        $items = $query->get();
        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $items->count(),
                'total' => $items->count(),
            ],
        ]);
    }

    $requestedPerPage = (int) $perPageParam;
    $perPage = min(max(1, $requestedPerPage), 100);
    $paginated = $query->paginate($perPage);

    return response()->json([
        'data' => $paginated->items(),
        'meta' => [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ],
    ]);
}
```

### 1.2 `SuratKeluarController.php`
Menerapkan logika penanganan `per_page === 'all'` yang identik pada `index(Request $request)`.

---

## 2. Frontend Design

### 2.1 `frontend/src/app/surat/masuk/page.tsx`
- Mengambil data langsung dari `api.get('/surat-masuk?per_page=all')`.
- Mengeliminasi loop auto-post localStorage yang berulang.
- Mengatur data `suratList` langsung dari respons API backend.
- Menjaga fungsi pencarian (*search*), sorting no. agenda (*descending*), dan pagination client-side di tabel agar responsif.

### 2.2 `frontend/src/app/surat/page.tsx`
- Memastikan pemanggilan data statistik surat masuk & keluar mengambil data lengkap dari backend.
