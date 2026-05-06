# Issue #045 — Frontend — Searchable Employee Picker Component

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `components`, `module-surattugas`
> **Priority**: 🟡 Medium (Penyempurna Pengalaman Pengguna / UX)
> **Complexity**: 🟡 Medium (Custom Dropdown, Debounce API Polling, dan Click-Outside Logic)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #042

---

## Branch

```
issue/045-frontend-employee-picker
```

## Deskripsi

Dalam instansi BKSDA yang memiliki ratusan staf dan polisi hutan, memilih nama Pegawai dari *HTML Select Dropdown* bawaan browser (`<select>`) adalah sebuah siksaan. Pengguna harus menggulir tetikus panjang ke bawah hanya untuk mencari satu nama.

Oleh karena itu, Form Pembuatan Surat Tugas (yang kita rancang di Issue 042) wajib disokong oleh **Searchable Employee Picker** (Komponen Pencari Pegawai). Komponen ini bekerja layaknya *Spotlight Search* pada komputer Mac. Pengguna bisa mengetik huruf "B-U-D-I" atau mengetik NIP, lalu kotak daftar pegawai (Dropdown) akan mengerucut secara langsung (*Live Search*).

Untuk mencegah *Spamming Database* (Bayangkan pengguna mengetik 10 huruf dengan cepat, API akan dihantam 10 kali secara beruntun), kita harus menyuntikkan algoritma pencekik antrean yang disebut **Debouncing** (menunda pengiriman permintaan ke API selama 300 milidetik setelah pengguna selesai mengetik).

---

## Acceptance Criteria

- [ ] File komponen `src/components/custom/EmployeePicker.tsx` sukses diciptakan.
- [ ] Terdapat kotak input pencarian berhiaskan ikon Kaca Pembesar (`Search`) dari Lucide React.
- [ ] Saat diketik, input akan memicu fitur pelacak waktu mundur (*Debounce Timer 300ms*) sebelum menelepon Endpoint `/api/kepegawaian/employees?search=...`.
- [ ] Tersedia indikator berputar animasi (Spinner Loading) saat API sedang menarik data dari *Backend*.
- [ ] Kotak opsi Dropdown akan otomatis tertutup saat pengguna melakukan klik di luar wilayah kotak (*Click-Outside Listener*).
- [ ] Meneruskan objek Pegawai secara rapi ke lapisan atas (*Parent Form*) menggunakan fitur `onSelect(employee)`.

---

## Panduan Implementasi Cerdas

### Langkah 1: Buat Wadah Komponen Kustom

Buka direktori khusus yang menampung komponen-komponen mandiri (Re-usable Components) di dalam *Frontend*.
*(Jika folder `custom` belum ada di dalam `components`, buatlah terlebih dahulu).*

**Path:** `e:\bksda-superapp\frontend\src\components\custom\EmployeePicker.tsx`

### Langkah 2: Merakit Piston Pencarian (The Engine)

**Pahatkan logika arsitektur tingkat lanjut berikut secara saksama:**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, UserCheck, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

// Cerminan Tipe Data dari Backend Fase 2
export interface Employee {
    id: string;
    nama_lengkap: string;
    nip: string;
}

interface PickerProps {
    onSelect: (employee: Employee) => void;
    placeholder?: string;
}

export function EmployeePicker({ onSelect, placeholder = "Ketik nama atau NIP pegawai..." }: PickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Employee[]>([]);
    
    // Status Arsitektur
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Ref untuk melacak klik di luar wilayah
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------------------
    // ALGORITMA 1: CLICK-OUTSIDE LISTENER
    // ----------------------------------------------------
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ----------------------------------------------------
    // ALGORITMA 2: DEBOUNCE API POLLING (300ms)
    // ----------------------------------------------------
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setIsOpen(true);

        const timeoutId = setTimeout(async () => {
            try {
                // Menembak modul Kepegawaian (Lintas-Modul via API)
                const res = await api.get(`/kepegawaian/employees?search=${query}&limit=5`);
                setResults(res.data.data);
            } catch (error) {
                console.error("Gagal menarik radar pegawai:", error);
            } finally {
                setIsLoading(false);
            }
        }, 300); // Tunda tembakan selama 300 mili-detik (Debounce)

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Eksekusi Pilihan
    const handleSelect = (emp: Employee) => {
        onSelect(emp);    // Melempar data ke Form Utama
        setQuery("");     // Kosongkan kolom cari
        setIsOpen(false); // Tutup laci pop-up
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            
            {/* Input Pencarian Glassmorphism */}
            <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-zinc-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => query.trim() && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-11 pr-12 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-500 shadow-inner"
                />
                
                {/* Indikator Memutar (Spinner) */}
                {isLoading && (
                    <div className="absolute right-4 animate-spin text-emerald-500">
                        <Loader2 className="w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Area Laci Pop-up (Dropdown) */}
            {isOpen && (query.trim().length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    
                    {/* Render Hasil Kosong */}
                    {!isLoading && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Pegawai tidak ditemukan.</p>
                        </div>
                    )}

                    {/* Daftar Hasil Render */}
                    <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
                        {results.map((emp) => (
                            <li 
                                key={emp.id}
                                onClick={() => handleSelect(emp)}
                                className="px-4 py-3 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-4 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <UserCheck className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400">{emp.nama_lengkap}</p>
                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{emp.nip}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    
                    {results.length > 0 && (
                        <div className="bg-zinc-950 p-2 text-center text-[10px] text-zinc-600 uppercase font-bold tracking-widest border-t border-zinc-800">
                            Menampilkan maksimal 5 kandidat
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
```

### Langkah 3: Cara Penggunaan pada Form (Issue 042)

Kini komponen sakti di atas sudah siap dipakai oleh *Form* Surat Tugas. Impor komponen tersebut dan panggil fungsi pelemparannya:

```tsx
import { EmployeePicker, Employee } from "@/components/custom/EmployeePicker";

//... (Di dalam file Form surat-tugas/create/page.tsx)
<EmployeePicker 
   onSelect={(dipilih: Employee) => {
       // Tambahkan si 'dipilih' ini ke dalam State Pasukan yang kita buat di Issue 042
       tambahPasukan(dipilih.id);
   }} 
/>
```

---

## Troubleshooting

### Q: Komponen terus-menerus menarik API setiap kali saya mengetik walau belum selesai.

**Artinya:** Penjaga waktu (*Timeout Debounce*) milikmu cacat atau terhapus secara tidak sengaja.
**Solusi:** Kembalikan struktur *Clean-up Function* `return () => clearTimeout(timeoutId);` persis pada posisi di dalam kurung kurawal penutup `useEffect`. Baris pendek ini adalah rahasia utama yang membersihkan tumpukan antrean eksekusi agar *Backend* mu tidak *Down*.

### Q: Dropdown saya tenggelam di bawah form input lain.

**Artinya:** Skala *Z-Index* CSS Tailwind mu tertabrak elemen tetangga.
**Solusi:** Saya sudah menyematkan kelas `z-50` di bagian *wrapper* laci hasil pencarian. Jika masih tenggelam, pastikan komponen pembungkus induk (*Parent Container* Form Utama-mu) tidak berstatus `overflow-hidden` tanpa alasan yang jelas.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): searchable employee picker combobox component" \
  --body "Pembuatan modul UI kustom lintas wilayah (Cross-Module). Membawa arsitektur Debouncing API fetching dan Click-Outside detection. Detail di docs/issues/045-frontend-employee-picker.md" \
  --label "frontend,ui,components,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/045-frontend-employee-picker
```

### Step 3: Kerjakan

Pastikan lokasi folder `custom/` dibuat secara terpisah di luar folder `ui/` biasa (jika menggunakan Shadcn). Salin logika murni React tingkat tinggi (*Advanced Hooks*) ke dalamnya. Panggil komponen tersebut dari *Form* (Issue 042) untuk melihat tarian interaksi antarmukanya.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): searchable employee picker combobox component (#45)"
git push -u origin issue/045-frontend-employee-picker
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): searchable employee picker combobox component (#45)" \
  --body "## Summary
Menciptakan jembatan pemilih *(Picker)* super dinamis bagi Operator dalam menyaring ribuan pegawai BKSDA tanpa macet.

## Changes
- Pembuatan \`EmployeePicker.tsx\` tanpa terikat pustaka (*library*) eksternal yang gemuk.
- Penerapan *Time-delay Debounce Algorithm (300ms)* pada penarikan URL Query \`?search=\`.
- Pengembangan *Virtual Dropdown* yang memiliki fitur penyegelan wilayah klik mandiri (*Click Outside Listener*).

## Verification
- [x] Pencarian langsung mengenai \`/api/kepegawaian/employees\` dengan akurasi ketat.
- [x] Lolos pencegahan ganda (*Memory Leaks*) berkat *Cleanup Function Timeout*.

Closes #45" \
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
Kita memerlukan kotak pencarian nama Pegawai cerdas yang bisa dipasang di dalam Form Surat Tugas. Harus murni berbekal algoritma performa tinggi tanpa *Library* tebal berlebih.

## Task

Kerjakan Issue #045 (Frontend — Searchable Employee Picker Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/045-frontend-employee-picker.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder penyimpanan di dalam kerangka kerja `frontend/src/components/custom/`.
3. Buat file `EmployeePicker.tsx` dan lekatkan kodingan arsitektur *Debounce Timer* dan *Click-Outside Hook* sesuai spesifikasi secara akurat.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
