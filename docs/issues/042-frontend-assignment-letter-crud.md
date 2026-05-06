# Issue #042 — Frontend — Assignment Letter Master Data (Grid & Form)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-surattugas`, `crud`
> **Priority**: 🔴 Critical (Halaman inti operasional Surat Tugas untuk para Admin)
> **Complexity**: 🔴 High (Form dinamis *Multi-Select Array Pivot* + *Multipart/form-data*)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #038, #039, #041

---

## Branch

```
issue/042-frontend-assignment-letter-crud
```

## Deskripsi

Setelah *Backend* Surat Tugas berdenyut, kita harus membangkitkan wajah utamanya (Dashboard Admin). Issue ini sangat besar karena membawahi 2 entitas antarmuka raksasa sekaligus:

1. **Halaman Data Grid (Tabel)**: Daftar permohonan surat yang mengadopsi standar *Glassmorphism* BKSDA. Dilengkapi Pagination, dan lencana warna-warni (*Badges*) yang menunjukkan status birokrasi (Pending/Kuning, Approved/Hijau, Rejected/Merah). Tabel ini juga memiliki tombol cetak yang akan memanggil *Modal Pop-up* yang kita buat di Issue #041.
2. **Halaman Form Penciptaan (Split-Layout)**: Di sinilah tantangan terbesarnya. Form ini tidak hanya menampung input teks sederhana. Kita harus membuat blok **Dynamic Array Field** untuk memilih nama-nama Pegawai (*Dropdown* dari API Kepegawaian) beserta kolom *Input Peran*-nya. Serta, area unggahan khusus (*Dropzone*) untuk memuat lampiran fisik berformat `PDF`. 

Karena terdapat unggahan berkas (`file_surat`), kita wajib mentransmisikan *Payload* menggunakan `FormData` (Multipart), bukan `JSON` biasa.

---

## Acceptance Criteria

- [ ] Tabel Data (`src/app/(dashboard)/surat-tugas/page.tsx`) berdiri kokoh didukung *Cache Management* dari `@tanstack/react-query`.
- [ ] Tersedia tombol "Pratinjau / Cetak" di setiap baris tabel yang mengeksekusi `<AssignmentLetterPreview />` (Issue 041).
- [ ] Form Pembuatan Surat (`src/app/(dashboard)/surat-tugas/create/page.tsx`) dirancang dengan *Split Layout* (Kiri form, Kanan panduan/upload file).
- [ ] Terdapat fitur untuk menambah/menghapus Pegawai ke dalam barisan Surat secara dinamis (*Dynamic Array Input*).
- [ ] Pengiriman ke *Backend* sukses memformat *Array Pivot* (`employees[0][id]`, `employees[0][peran]`) dan menunggangi `FormData`.
- [ ] Pencegahan *Frontend* mutlak: PDF tidak boleh di atas 10 Megabyte.

---

## Panduan Implementasi Cerdas

### Bagian 1: Kerangka Kerja Tabel (Data Grid)

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\surat-tugas\page.tsx`

Tabel ini bertugas memanggil `api.get('/surat-tugas')`. Pada kolom aksi tabel, sertakan logika pemicu komponen Cetak PDF (Issue 041).

*Contoh potongan logika pemicu Modal Cetak:*
```tsx
import AssignmentLetterPreview from "./_components/AssignmentLetterPreview";

// Di dalam komponen Tabel Page:
const [previewData, setPreviewData] = useState<any>(null);

// ... Render Tabel ...
<button onClick={() => setPreviewData(row)} className="text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg">
    <PrinterIcon className="w-4 h-4" /> Cetak
</button>

// Di akhir render layar:
{previewData && (
    <AssignmentLetterPreview 
        data={previewData} 
        onClose={() => setPreviewData(null)} 
    />
)}
```

### Bagian 2: Form Pembuatan Dinamis Lintas Modul

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\surat-tugas\create\page.tsx`

Ini adalah bagian tersulit. *Form* Surat Tugas menuntut kamu untuk menarik daftar Pegawai (*Employee*) dari Modul Kepegawaian (Fase 2) agar si Pembuat Surat bisa memilih nama pasukan yang diberangkatkan.

**Strategi Konstruksi *State* Array Pegawai:**
Buat *State React* berbentuk himpunan (Array) obyek yang fleksibel:

```tsx
// 1. Tarik Kamus Data Pegawai dari Modul 1
const { data: listPegawai } = useQuery({
    queryKey: ['employee-dictionary'],
    queryFn: async () => {
        const res = await api.get('/kepegawaian/employees?limit=100');
        return res.data.data;
    }
});

// 2. Siapkan State Pasukan Yang Akan Berangkat
const [pasukan, setPasukan] = useState<{ id: string, peran: string }[]>([]);

// Fungsi Penambah Pasukan:
const tambahPasukan = (employeeId: string) => {
    // Hindari memasukkan orang yang sama 2 kali (Mencegah Error Unique Backend Issue 35)
    if(pasukan.find(p => p.id === employeeId)) return; 
    setPasukan([...pasukan, { id: employeeId, peran: 'Anggota' }]);
};
```

**Strategi Transmisi Form Data (Multipart Array):**
Cara mengirim *Array of Objects* di dalam tubuh `FormData` PHP/Laravel sangatlah spesifik. Kamu tidak bisa sekadar melempar struktur JSON.

```tsx
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    
    // Masukkan data dasar
    formData.append('maksud_tujuan', inputTujuan);
    formData.append('tanggal_mulai', inputMulai);
    
    // Trik Memasukkan Array Pegawai ke FormData (STANDAR PHP/LARAVEL):
    pasukan.forEach((personil, index) => {
        formData.append(`employees[${index}][id]`, personil.id);
        formData.append(`employees[${index}][peran]`, personil.peran);
    });

    // Masukkan File PDF
    if(fileSurat) {
        if(fileSurat.size > 10 * 1024 * 1024) return alert("Batas PDF 10 MB!");
        formData.append('file_surat', fileSurat);
    }

    // Kirim Ke Markas
    await api.post('/surat-tugas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
```

### Bagian 3: Estetika (Rule 7.1)

Gunakan desain *Glassmorphism* tingkat lanjut pada setiap elemen formulir. Berikan warna hijau giok (*emerald*) menyala pada tombol konfirmasi, dan pastikan bingkai kartu (*Cards*) berlatar belakang `bg-zinc-900` dengan pembatas (*Border*) transparan putih halus `border-white/10`.

---

## Troubleshooting

### Q: Tombol Submit ditekan tapi Backend menolak dengan alasan `"The employees field is required"`.

**Artinya:** Susunan struktur *Array* di dalam tubuh `FormData` berantakan.
**Solusi:** Baca ulang *Strategi Transmisi FormData* di atas. Laravel mengharapkan notasi kurung siku bertingkat seperti `employees[0][id]` untuk menerjemahkannya ke dalam susunan *Array PHP*. Jika tertulis asal `employees: [{id: 1}]` di dalam FormData, formasi tersebut tidak akan dikenali dan berujung dianggap *Null*.

### Q: Daftar Pegawai (Dropdown) saya kosong saat mau membuat ST.

**Artinya:** *Endpoint* `/api/kepegawaian/employees` merespons *Error* atau kamu tidak mengurai hasil JSON dengan akurat.
**Solusi:** Buka *Network Tab* (Inspect Element). Lihat kemasan asli (*Payload*) milik Backend Pegawai. Ia terbungkus di dalam `res.data.data` karena kita mengaplikasikan Meta Pagination (Rule 5.1).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): dynamic master data grid and multipart creation form" \
  --body "Arsitektur frontend krusial untuk CRUD Surat Tugas. Memuat tabel interaktif dengan lencana status, Form dinamis Multi-Pivot lintas modul, dan transmisi file PDF via FormData. Detail di docs/issues/042-frontend-assignment-letter-crud.md" \
  --label "frontend,ui,module-surattugas,crud"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/042-frontend-assignment-letter-crud
```

### Step 3: Kerjakan

Gunakan kecerdasan murnimu untuk merakit komponen di dua alam: Rute Grid `surat-tugas/page.tsx` dan Rute Pembuatan `surat-tugas/create/page.tsx`. Implementasikan *Multi-select Array UI* yang sangat rapi (Mungkin wujudnya seperti deretan lencana *Chips* nama pegawai yang bisa disilang/dibuang).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): dynamic master data grid and multipart creation form (#42)"
git push -u origin issue/042-frontend-assignment-letter-crud
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): dynamic master data grid and multipart creation form (#42)" \
  --body "## Summary
Meluncurkan layar navigasi utama Administrator dalam memetakan dan merancang Surat Tugas.

## Changes
- Penciptaan UI \`surat-tugas/page.tsx\` untuk membaca koleksi data (*Read*).
- Penghubungan *Modal* Print A4 (Issue 041) pada setiap baris Tabel.
- Pembuatan \`surat-tugas/create/page.tsx\` dengan kemampuan injeksi Lintas-Modul (menarik kamus Pegawai).
- Konfigurasi transmisi \`FormData\` kompleks (Array + File Binary) mengikuti parameter Laravel.

## Verification
- [x] Lolos integrasi CORS dan otentikasi Sanctum (BKSDA API).
- [x] Fitur penambahan Pegawai lebih dari 1 orang (*Many-to-Many*) terbukti terkirim utuh di *Network Tab*.

Closes #42" \
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
Modul Surat Tugas belum punya tampilan antar muka (Admin UI). Kita butuh Tabel Daftar Surat dan Halaman Pembuatan Surat yang sanggup meramu File PDF dan Array Pegawai.

## Task

Kerjakan Issue #042 (Frontend — Surat Tugas Form/List).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/042-frontend-assignment-letter-crud.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file Data Grid di `frontend/src/app/(dashboard)/surat-tugas/page.tsx`. Impor dan panggil komponen `AssignmentLetterPreview` jika tombol Cetak ditekan.
3. Buat file Form Pembuatan di `frontend/src/app/(dashboard)/surat-tugas/create/page.tsx`. 
4. Tarik data pegawai dari API untuk dijadikan opsi Dropdown, dan aplikasikan trik pengiriman Array di dalam `FormData` secara presisi sesuai arahan panduan di dalam spesifikasi Issue.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
