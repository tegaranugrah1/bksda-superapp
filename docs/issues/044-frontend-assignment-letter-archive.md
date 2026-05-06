# Issue #044 — Frontend — Assignment Letter Archive & Trash Management

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-surattugas`, `archive`
> **Priority**: 🟡 Medium (Fungsi krusial untuk pemulihan dokumen yang tak sengaja terhapus)
> **Complexity**: 🟢 Low (Eksplorasi Parameter React Query dan Filter State)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #042

---

## Branch

```
issue/044-frontend-assignment-letter-archive
```

## Deskripsi

Pada Issue #042 kita telah merakit Data Grid Surat Tugas yang menampilkan dokumen-dokumen aktif. Namun, menurut mandat *Roadmap* kita (Fase 3), sebuah Sistem Informasi Pemerintahan yang berstandar tinggi wajib memiliki fitur **Tong Sampah Digital (Trash Bin) / Arsip Terhapus**.

Sistem *Backend* kita (Issue 038) sudah dirancang menggunakan fitur `SoftDeletes`, yang artinya jika tombol Hapus ditekan, data tidak benar-benar lenyap, melainkan hanya disembunyikan.

Tugas di Issue ini adalah menambahkan **Filter Toggle (Lihat Arsip Sampah)** pada Data Grid yang sudah ada, serta menghidupkan fungsi pelatuk (*Trigger*) untuk Endpoint `DELETE` (Pindah ke Sampah) dan `RESTORE` (Pulihkan dari Sampah).

---

## Acceptance Criteria

- [ ] File `src/app/(dashboard)/surat-tugas/page.tsx` (dari Issue 042) disempurnakan.
- [ ] Tersedia tombol/saklar (*Toggle/Tabs*) di atas Tabel untuk beralih antara "Dokumen Aktif" dan "Arsip Dihapus".
- [ ] Tersedia filter "Status" (*Dropdown* untuk memilih: *Semua, Pending, Approved, Rejected*).
- [ ] Pemanggilan `api.get('/surat-tugas')` harus ditambahkan parameter `?trashed=true` saat mode Arsip Sampah aktif.
- [ ] Tersedia tombol "Hapus" (tong sampah merah) pada baris tabel aktif, yang mengeksekusi `DELETE /api/surat-tugas/{id}`.
- [ ] Tersedia tombol "Pulihkan" (*Restore* hijau) pada baris tabel di mode Sampah, yang mengeksekusi `POST /api/surat-tugas/{id}/restore`.

---

## Panduan Implementasi Cerdas

### Langkah 1: Membangun Mekanisme State Filter

Buka layar utama Data Grid Surat Tugas. Tambahkan *State* reaktif ini ke dalam komponen utama sebelum fungsi `useQuery` dipanggil.

```tsx
import { useState } from "react";
import { Trash2, RefreshCcw, Filter } from "lucide-react";

// State Penampung Filter
const [filterStatus, setFilterStatus] = useState<string>(''); // '', 'pending', 'approved', 'rejected'
const [isTrashMode, setIsTrashMode] = useState<boolean>(false);
```

### Langkah 2: Menyuntikkan Parameter ke React Query

Pastikan `useQuery` milikmu (yang dibuat pada Issue 042) merespons perubahan filter di atas secara dinamis.

```tsx
const { data, isLoading, refetch } = useQuery({
    // Masukkan state ke dalam queryKey agar otomatis me-refresh tabel saat state berubah
    queryKey: ['surat-tugas-list', filterStatus, isTrashMode],
    queryFn: async () => {
        // Rangkai URL Params
        const params = new URLSearchParams();
        if (filterStatus) params.append('status', filterStatus);
        if (isTrashMode) params.append('trashed', 'true');
        
        const res = await api.get(`/surat-tugas?${params.toString()}`);
        return res.data;
    }
});
```

### Langkah 3: Menambahkan Palang Navigasi (Toolbar Filter)

Di atas elemen `<table>`, buatlah barisan pengendali (*Toolbar*) layaknya aplikasi perkantoran modern (*Glassmorphism*).

```tsx
<div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md">
    
    {/* Dropdown Status */}
    <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-400" />
        <select 
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
        >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
        </select>
    </div>

    {/* Saklar Mode Sampah */}
    <button 
        onClick={() => setIsTrashMode(!isTrashMode)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
            isTrashMode 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10' 
            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
        }`}
    >
        <Trash2 className="w-4 h-4" /> 
        {isTrashMode ? 'Keluar dari Arsip Sampah' : 'Lihat Tong Sampah'}
    </button>
</div>
```

### Langkah 4: Logika Mutasi (Hapus & Pulihkan)

Gunakan `useMutation` dari React Query untuk memastikan tabel selalu segar sesaat setelah dokumen dihapus atau dipulihkan.

```tsx
const queryClient = useQueryClient();

// Fungsi Menghapus
const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/surat-tugas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-tugas-list'] })
});

// Fungsi Memulihkan
const restoreMutation = useMutation({
    mutationFn: (id: string) => api.post(`/surat-tugas/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-tugas-list'] })
});
```

*(Pada bagian baris tabel, tampilkan tombol Hapus jika `isTrashMode === false`, dan tampilkan tombol Pulihkan jika `isTrashMode === true`)*.

---

## Troubleshooting

### Q: Tombol Pulihkan ditekan, tapi tabel tidak merender ulang.

**Artinya:** `queryKey` yang di-*invalidate* tidak sama dengan `queryKey` pembuat tabel.
**Solusi:** Pastikan kunci pada `invalidateQueries({ queryKey: ['surat-tugas-list'] })` sama persis ejaannya dengan pengenal string urutan pertama pada konfigurasi `useQuery` tabelmu.

### Q: Kenapa Filter Status dan Mode Sampah digabung pengirimannya ke Backend?

**Artinya:** Desain API terintegrasi.
**Solusi:** Berkat spesifikasi brilian kita di Issue #038, satu endpoint *Backend* `/api/surat-tugas` sudah dirancang untuk mendeteksi kueri `?trashed=true` maupun `?status=pending` secara otomatis dan menggabungkan perintah SQL-nya secara organik.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): list view archive management and status filters" \
  --body "Penambahan fungsionalitas Soft Deletes UI (Tong Sampah) dan saringan status pada Data Grid Surat Tugas. Detail di docs/issues/044-frontend-assignment-letter-archive.md" \
  --label "frontend,ui,module-surattugas,archive"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/044-frontend-assignment-letter-archive
```

### Step 3: Kerjakan

Tambahkan *Toolbar Glassmorphism* yang disediakan di atas ke dalam halaman Data Grid (`src/app/(dashboard)/surat-tugas/page.tsx`). Pasang fungsi Mutasi pemulihan dan penghapusan tepat di kolom Aksi Tabel. 

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): list view archive management and status filters (#44)"
git push -u origin issue/044-frontend-assignment-letter-archive
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): list view archive management and status filters (#44)" \
  --body "## Summary
Menghidupkan fitur pemulihan arsip *(Restore)* dan filter parameter *Query String* pada tampilan daftar administrasi Surat Tugas.

## Changes
- Injeksi *State URL Params* (\`status\` & \`trashed\`) pada pelaksana \`useQuery\`.
- Pembuatan *Toolbar Filter* estetik ber- *Dropodown*.
- Eksekusi tombol Delete & Restore yang terintegrasi dengan siklus re-render React Query.

## Verification
- [x] Perpindahan mode Sampah tidak memerlukan Reload Browser.
- [x] Lolos integrasi penghapusan aman (*SoftDelete*) ke Backend BKSDA.

Closes #44" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Data Grid Surat Tugas kita belum memiliki sistem penyaringan (*Filter Status*) dan fitur Tong Sampah (*Recycle Bin*) untuk memulihkan surat yang tak sengaja dihapus.

## Task

Kerjakan Issue #044 (Frontend — Assignment Letter Archive Management).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/044-frontend-assignment-letter-archive.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buka komponen Tabel `page.tsx` yang kamu kerjakan di Issue 042.
3. Modifikasi fungsi pengambilan datanya (*Fetch API*) agar menerima *Query Parameters* dinamis (Status dan Trashed).
4. Tambahkan *Toolbar* kendali Filter dan Tombol Tong Sampah persis di atas <table>.
5. Kaitkan Mutasi *Restore* & *Delete* pada Tombol Aksi di setiap baris tabel.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
