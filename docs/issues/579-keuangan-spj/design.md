# Issue #579 — Design Modul Keuangan: SPJ

> **Branch rencana**: `development`
> **Issue**: #579
> **Status**: Frontend web preview tersedia; backend menunggu review

## 1. Prinsip Desain

1. **Satu sumber data**: SPJ menjadi entitas induk; data pegawai, kegiatan, perjalanan, dan dokumen turunan memiliki hubungan yang jelas.
2. **Tidak menggandakan data pegawai**: pilihan dari SPT mengisi master pegawai; input manual hanya menjadi sumber nomor/relasi yang belum tersedia.
3. **Dokumen dinamis**: jumlah dokumen diturunkan dari item pegawai/transaksi, bukan dari halaman yang dibuat hard-code.
4. **Preview sebelum submit**: pengguna selalu melihat jumlah dan ringkasan dokumen yang akan dibuat.
5. **Draft aman**: perubahan boleh dilakukan pada draft; data yang sudah diajukan perlu dikunci atau memakai mekanisme revisi.
6. **Pakai pola aplikasi yang sudah ada**: navigasi, modal pencarian pegawai, date picker, notifikasi, pagination, dan permission memakai komponen/helper existing.
7. **Fase pertama web**: implementasi awal hanya untuk web; mobile ditunda sampai alur web stabil.
8. **Format Excel dipertahankan**: generator/output harus mengikuti workbook yang diberikan secara persis, termasuk nama sheet dan layout cetak.
9. **Fase pertama minimal**: jangan membuat approval engine baru sebelum field dan aturan dokumen disepakati.

## 2. Struktur Navigasi yang Diusulkan

```text
Portal
└── Keuangan
    ├── Dashboard
    ├── SPJ
    │   ├── Daftar SPJ
    │   └── Detail SPJ (fase lanjutan bila disetujui)
    └── Buat SPJ
        ├── 1. SPT Panduan & Pegawai
        ├── 2. Data Kegiatan & Perjalanan
        ├── 3. SPTJB / Rekap Pembayaran
        ├── 4. Dokumen Turunan
        └── 5. Review & Kirim
```

Dashboard, SPJ, dan Buat SPJ menjadi tujuan utama. Step form tidak perlu menjadi item menu terpisah.

## 3. Model Data Konseptual

```text
SPJ
├── source_spt (linked / manual)
├── creator_employee
├── activity
├── travel_period
├── travelers[]
│   ├── employee
│   ├── rank / position snapshot
│   ├── travel_dates
│   └── destination
├── payment_items[]
│   ├── recipient (employee / manual party)
│   ├── bank_account
│   ├── description
│   ├── execution_date
│   ├── amount
│   ├── tax
│   └── source (derived / manual)
└── generated_documents[]
    ├── type
    ├── traveler/payment_item reference
    ├── sequence
    └── status
```

Ini model konseptual, bukan keputusan schema. Nama tabel, normalisasi, snapshot data, dan relasi backend harus diputuskan setelah review.

## 4. Alur Form

### Step 1 — SPT Panduan dan Pegawai

Dua mode input:

- **Ambil dari SPT**: pencarian SPT pegawai, lalu sistem mengisi nomor dan daftar pegawai/perjalanan.
- **Manual**: nomor surat diisi pengguna, lalu pegawai dipilih lewat search.

Setiap pegawai terpilih ditampilkan dalam kartu ringkas: nama, NIP, pangkat/golongan, jabatan, dan data perjalanan yang tersedia. Tambah manual memakai kontrol yang sama dengan search agar tidak ada duplikasi.

### Step 2 — REKAP

REKAP menjadi halaman utama input pembayaran dan mengikuti format workbook. Field yang ditampilkan:

- Nama Satuan Kerja otomatis: `Balai Konservasi Sumber Daya Alam Kalimantan Timur`.
- Kode AWP.
- Nama Kegiatan.
- Penerima dari pegawai perjalanan pada SPT Panduan.
- Penerima eksternal yang dapat ditulis manual, misalnya UPTD/laboratorium.
- Uraian masing-masing penerima, otomatis dari SPT bila tersedia dan dapat diedit manual.
- Nomor bukti manual.
- Jumlah pengeluaran perjalanan untuk setiap penerima.
- Pejabat Pembuat Komitmen yang dipilih dari pegawai, dengan NIK.
- Pemegang Dana Operasional yang dipilih dari pegawai, dengan NIK.

SPTJB/REKAP menggunakan satu dokumen dengan banyak baris. Penambahan penerima tidak membuat step baru.

### Step 3 — Review & Cetak

Tahap akhir menampilkan pilihan dokumen dalam satu paket:

```text
REKAP / SPTJB
SPB
Daftar Isian
Kuitansi
Rinba
SPD
```

Pengguna memilih satu dokumen untuk melihat preview di bawah pilihan. Tombol `Print` mencetak dokumen yang sedang dipreview. Semua dokumen tetap berada dalam satu alur SPJ sampai selesai.

Preview harus mempertahankan nama sheet, urutan, field, layout, dan konfigurasi cetak workbook asli. Input yang sama tidak boleh diminta ulang pada setiap dokumen.

## 5. Halaman Dashboard

Dashboard fase awal cukup menjadi landing page ringan:

- header modul Keuangan;
- kartu akses ke `SPJ` dan `Buat SPJ`;
- ringkasan status jika endpoint/metrik tersedia;
- daftar draft terakhir bila disetujui.

Jangan membuat banyak chart sebelum kebutuhan pengguna dan sumber data metrik jelas.

## 6. Halaman Daftar SPJ

Komponen utama:

- search nomor, kegiatan, atau nama pembuat;
- filter status dan rentang tanggal;
- card/list responsive;
- total nominal atau jumlah dokumen;
- pagination atau infinite scroll mengikuti pola aplikasi existing;
- empty, loading, error, dan refresh state.

Detail SPJ tidak termasuk halaman utama yang diminta, tetapi list perlu menyediakan target navigasi bila detail akan disetujui sebagai fase berikutnya.

## 7. Kontrak Data Konseptual

Contoh payload draft, belum final:

```json
{
  "spt_source": { "type": "linked", "id": "..." },
  "spt_number": "...",
  "employee_ids": ["..."],
  "activity": {
    "code": "...",
    "name": "...",
    "sub_activity_code": "...",
    "sub_activity_name": "...",
    "description": "..."
  },
  "travel": {
    "origin": "...",
    "destination": "...",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  },
  "payment_items": [
    {
      "source": "derived",
      "employee_id": "...",
      "recipient_name": "...",
      "amount": 0,
      "description": "..."
    }
  ]
}
```

Endpoint, nama field, idempotensi submit, upload bukti, dan format nominal wajib dikonfirmasi sebelum implementasi.

## 8. Status dan State Machine Awal

```text
draft → diajukan → diproses → disetujui → selesai
                    └────────→ ditolak
```

State machine ini masih usulan. Jangan mengunci aturan transisi atau role sebelum disetujui.

## 9. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Jumlah dokumen berbeda dari jumlah pegawai | Satu state item pembayaran sebagai sumber jumlah, plus preview sebelum submit |
| SPT manual tidak memiliki data perjalanan lengkap | Validasi field wajib dan penanda data manual |
| Data pegawai berubah setelah SPJ dibuat | Tentukan apakah dokumen menyimpan snapshot nama/NIP/pangkat/jabatan |
| Item manual tidak punya penerima jelas | Bedakan tipe penerima pegawai vs pihak ketiga dan validasi sesuai tipe |
| Format Excel memiliki layout cetak yang ketat | Pisahkan input data dari renderer dokumen, lalu uji hasil terhadap workbook asli |
| Draft berubah setelah dokumen dibuat | Kunci dokumen berdasarkan status dan gunakan revisi, bukan silent mutation |
| Endpoint baru belum tersedia | Finalisasi kontrak backend sebelum pekerjaan frontend dimulai |

## 10. Keputusan yang Sudah Disepakati

- Satu SPJ dapat memuat banyak pegawai.
- Item manual boleh memiliki penerima pegawai maupun pihak ketiga, termasuk UPTD/laboratorium.
- Format workbook Excel dipertahankan secara persis.
- Target fase pertama adalah web saja.
- SPTJB dan SPB menggunakan satu dokumen dengan banyak baris.
- Seluruh dokumen menjadi satu paket dalam satu alur sampai selesai.
- Semua pengguna dapat melihat SPJ; edit dan hapus hanya untuk admin/superadmin.

## 11. Keputusan yang Dibutuhkan Sebelum Coding

- Definisi satuan jumlah untuk setiap dokumen.
- Field wajib per step.
- Sumber data SPT dan status SPT yang boleh dipilih.
- Role dan status workflow selain aturan lihat/edit/hapus yang sudah disepakati.
- Detail endpoint dan aturan locking dokumen.
