# Issue #043 — Frontend — Assignment Letter Approval Management

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-surattugas`, `workflow`
> **Priority**: 🔴 Critical (Tahap final otorisasi birokrasi dokumen negara)
> **Complexity**: 🟡 Medium (Dialog Interaktif, State Management & Mutasi Data)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #042, #038

---

## Branch

```
issue/043-frontend-assignment-letter-approval
```

## Deskripsi

*(Peringatan: Kamu mengetik Issue 42 pada permintaannmu, namun sistem mendeteksi bahwa Issue 42 telah selesai. Maka dokumen yang dilahirkan ini adalah **Issue 43** — Penutup Ekosistem Surat Tugas).*

Sebuah Surat Tugas yang diajukan oleh Operator (Issue 042) tidak akan memiliki kekuatan hukum dan tidak memiliki "Nomor Surat" sebelum disetujui oleh Pejabat Berwenang / Kepala Balai. 

Issue ini akan merancang komponen Interaktif *Approval Dialog* (Pop-up Persetujuan). 
Cara kerjanya:
1. Ketika Surat berstatus `pending`, akan muncul tombol **Verifikasi (Approve/Reject)** di kolom aksi tabel.
2. Jika tombol **Tolak (Reject)** ditekan, sistem cukup memunculkan peringatan (Konfirmasi), dan mengirim status `rejected` ke *Backend*.
3. Jika tombol **Setujui (Approve)** ditekan, **WAJIB** muncul kolom input tambahan yang menanyakan **"Nomor Surat Resmi"** (Contoh: `SK.123/BKSDA/2026`). Karena penomoran baru diberikan *setelah* surat sah.
4. Setelah disetujui, tombol aksi akan berubah. Surat tersebut kini sah, bisa dicetak dengan *QR Code* utuh (Issue 041), dan masyarakat bisa memindainya (Issue 040).

---

## Acceptance Criteria

- [ ] File komponen `src/app/(dashboard)/surat-tugas/_components/ApprovalDialog.tsx` dibuat.
- [ ] Tersedia tombol pemicu (*Trigger*) berdesain mencolok (mungkin warna biru atau ungu tua) pada Data Grid khusus untuk baris bersatus `pending`.
- [ ] *Modal/Dialog* memiliki 2 opsi utama: `Approve` (Setuju) dan `Reject` (Tolak).
- [ ] Opsi `Approve` memunculkan kolom input Wajib Isi untuk `nomor_surat`.
- [ ] Eksekusi berhasil menembak `PUT /api/surat-tugas/{id}/status` dan langsung melakukan penyegaran otomatis (*Invalidate Cache*) pada React Query agar tabel berubah status secara *Real-Time*.

---

## Panduan Implementasi Cerdas

### Langkah 1: Merakit Komponen Dialog Persetujuan

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\surat-tugas\_components\ApprovalDialog.tsx`

Buatlah sebuah *Modal* bergaya *Glassmorphism* yang menawan. Berikut adalah algoritma logikanya:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Check, X, ShieldCheck } from "lucide-react";

interface Props {
    suratId: string;
    onClose: () => void;
}

export default function ApprovalDialog({ suratId, onClose }: Props) {
    const [actionType, setActionType] = useState<'idle' | 'approve' | 'reject'>('idle');
    const [nomorSurat, setNomorSurat] = useState("");
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (payload: { status: string, nomor_surat?: string }) => {
            const res = await api.put(`/surat-tugas/${suratId}/status`, payload);
            return res.data;
        },
        onSuccess: () => {
            // Memicu refresh tabel secara otomatis tanpa perlu reload browser
            queryClient.invalidateQueries({ queryKey: ['surat-tugas'] });
            onClose();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Terjadi kesalahan sistem.');
        }
    });

    const handleConfirm = () => {
        if (actionType === 'approve' && !nomorSurat) {
            return alert("Nomor Surat Resmi WAJIB diisi saat melakukan persetujuan!");
        }
        
        mutation.mutate({
            status: actionType === 'approve' ? 'approved' : 'rejected',
            ...(actionType === 'approve' && { nomor_surat: nomorSurat })
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Otorisasi Surat</h2>
                </div>

                {/* Pemilihan Aksi */}
                {actionType === 'idle' && (
                    <div className="space-y-3">
                        <p className="text-zinc-400 text-sm mb-6">Silakan pilih tindakan otoritatif Anda terhadap pengajuan surat tugas ini.</p>
                        <button 
                            onClick={() => setActionType('approve')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-all"
                        >
                            <Check className="w-5 h-5" /> Setujui Dokumen
                        </button>
                        <button 
                            onClick={() => setActionType('reject')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold transition-all"
                        >
                            <X className="w-5 h-5" /> Tolak Pengajuan
                        </button>
                    </div>
                )}

                {/* State: Pengisian Nomor Surat (Jika Approve) */}
                {actionType === 'approve' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2">Masukkan Nomor Surat Resmi <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                placeholder="Contoh: SK.123/BKSDA/2026"
                                value={nomorSurat}
                                onChange={(e) => setNomorSurat(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">Nomor ini akan tercetak permanen di PDF dan QR Code.</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setActionType('idle')} className="flex-1 py-3 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl font-semibold">Kembali</button>
                            <button 
                                onClick={handleConfirm}
                                disabled={mutation.isPending}
                                className="flex-1 py-3 text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-semibold shadow-lg shadow-emerald-500/20"
                            >
                                {mutation.isPending ? 'Memproses...' : 'Sahkan Surat'}
                            </button>
                        </div>
                    </div>
                )}

                {/* State: Konfirmasi Penolakan */}
                {actionType === 'reject' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <p className="text-red-400 bg-red-500/10 p-4 rounded-xl text-sm border border-red-500/20">
                            Anda yakin ingin menolak permohonan ini? Surat yang ditolak tidak bisa dipulihkan kembali statusnya.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setActionType('idle')} className="flex-1 py-3 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl font-semibold">Batal</button>
                            <button 
                                onClick={handleConfirm}
                                disabled={mutation.isPending}
                                className="flex-1 py-3 text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-semibold shadow-lg shadow-red-500/20"
                            >
                                {mutation.isPending ? 'Memproses...' : 'Ya, Tolak'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
```

### Langkah 2: Menginjeksikan Tombol ke Tabel

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\surat-tugas\page.tsx`

Tambahkan *State* `approvalId` untuk memunculkan modal di atas. Dan pada bagian tombol Tabel, sisipkan logika ini:

```tsx
{row.status === 'pending' && (
    <button 
        onClick={() => setApprovalId(row.id)} 
        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-2 rounded-lg transition-colors font-semibold text-sm flex items-center gap-1"
    >
        <ShieldCheck className="w-4 h-4" /> Otorisasi
    </button>
)}

// Dan panggil modalnya di akhir layout:
{approvalId && <ApprovalDialog suratId={approvalId} onClose={() => setApprovalId(null)} />}
```

---

## Troubleshooting

### Q: Tombol Otorisasi tidak muncul di tabel.

**Artinya:** Data *Dummy* surat tugasmu memiliki status bukan `'pending'`.
**Solusi:** Buatlah Surat Tugas baru melalui *Form* (Issue 042). Surat yang baru lahir otomatis berstatus `pending`, maka tombol otorisasi berlogo Tameng Biru tersebut pasti akan muncul menyala.

### Q: Setelah Surat di-Approve, kenapa saya belum melihat Nomor Surat di halaman Pratinjau (Print)?

**Artinya:** React Query mengambil *Cache* lama.
**Solusi:** Kodingan komponen di atas sudah dibekali `queryClient.invalidateQueries`. Pastikan kamu menggunakan mekanisme yang sama (mengambil data dari parameter baris tabel yang baru di-*refresh*) ke dalam modal Cetak A4, sehingga `nomor_surat` yang baru diketik akan langsung terpampang jelas beserta *QR Code*-nya.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): approval management and verification flow" \
  --body "Merancang dialog interaktif Otorisasi Surat (Approve/Reject) lengkap dengan input Nomor Registrasi Surat secara dinamis. Detail di docs/issues/043-frontend-assignment-letter-approval.md" \
  --label "frontend,ui,module-surattugas,workflow"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/043-frontend-assignment-letter-approval
```

### Step 3: Kerjakan

Salin komponen **ApprovalDialog** ke dalam folder komponen Modul Surat Tugas. Hubungkan komponen tersebut ke tombol pada baris Tabel yang berstatus `pending`. Ujicoba hingga tuntas, pastikan surat yang di *Approve* langsung memunculkan QR Code di fitur pratinjau (Issue 041).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): approval management and verification flow (#43)"
git push -u origin issue/043-frontend-assignment-letter-approval
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): approval management and verification flow (#43)" \
  --body "## Summary
Melengkapi rantai birokrasi elektronik Modul ST. Memberikan kekuatan bagi *Role* Atasan untuk menerbitkan kekuatan hukum atas dokumen pengajuan atau menolaknya.

## Changes
- Penciptaan UI \`ApprovalDialog.tsx\` dengan multi-state (Idle, Approve Form, Reject Confirm).
- Penambahan fungsi pelontar (\`PUT\`) mutasi status dan penyisipan data Nomor Surat.
- Integrasi tombol aksi ke dalam Data Grid.

## Verification
- [x] Lolos integrasi dengan Endpoint Backend (Issue 038).
- [x] Fitur penomoran surat berhasil mencegah pengosongan field (Wajib Isi / Required).
- [x] Tabel secara *Real-Time* terbarui (*Cache Invalidated*) sesaat setelah modal ditutup.

Closes #43" \
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
Modul Surat Tugas tinggal selangkah lagi menuju kesempurnaan. Kita membutuhkan satu buah Kotak Dialog (*Modal*) bagi para Bos BKSDA untuk menyetujui surat draf dan memberikan Nomor Surat.

## Task

Kerjakan Issue #043 (Frontend — Surat Tugas Approval Management).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/043-frontend-assignment-letter-approval.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file penyimpan direktori komponen `src/app/(dashboard)/surat-tugas/_components/ApprovalDialog.tsx`.
3. Salin tata letak antarmuka 3-State (Pilih Aksi -> Form Setuju -> Form Tolak) lengkap dengan logika *Mutate React Query* nya.
4. Pasangkan tombol pemanggil Modal ini pada layar Tabel `page.tsx` (Issue 042).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
