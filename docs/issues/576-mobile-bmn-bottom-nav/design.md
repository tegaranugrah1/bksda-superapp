# Issue #576 — Design: Bottom Navigation BMN Mobile

> **Branch**: `mobile-development`
> **Issue**: #576
> **Status**: Implementasi fase pertama selesai; menunggu screen daftar peminjaman

## 1. Prinsip Desain

1. **Gunakan pola yang sudah terbukti**: ikuti struktur `KepegawaianTabs` sebelum membuat abstraksi navigator baru.
2. **Bottom nav hanya untuk tujuan utama**: detail, form, dan capture foto tetap menjadi route internal.
3. **Route internal tidak mengambil slot tab**: gunakan route tersembunyi seperti pola `tabBarButton: () => null` dan `tabBarItemStyle: { display: "none" }` bila tetap diperlukan dalam navigator.
4. **Akses tetap fail closed**: menu BMN tidak ditampilkan bila user tidak memiliki `bmn` dan bukan superadmin.
5. **Tidak menyalakan fitur yang belum siap**: menu disabled pada FAB tidak dipaksakan menjadi tab.
6. **Perubahan minimal**: pertahankan `AppTabs` dan route global yang sudah dipakai oleh FAB agar kompatibilitas tetap terjaga.

## 2. Struktur Navigator yang Diusulkan

```text
RootNavigation
└── AppTabs
    ├── Dashboard
    ├── BmnMain        ← navigator baru
    │   └── BmnTabs
    │       ├── Beranda
    │       ├── Aset
    │       ├── Peminjaman
        │       ├── Pemeliharaan
    │       ├── Sampah?        ← hanya jika screen siap
    │       ├── BmnDetail      ← route internal tersembunyi
    │       ├── BmnForm        ← route internal tersembunyi
    │       └── BmnPhotoCapture← route internal tersembunyi
    ├── Bmn                  ← kompatibilitas route lama
    ├── BmnDetail            ← kompatibilitas route global
    ├── BmnForm              ← kompatibilitas route global
    └── BmnPhotoCapture      ← kompatibilitas route global
```

Navigator BMN memakai `createBottomTabNavigator`, sama seperti `KepegawaianTabs`. Fase pertama menampilkan Beranda dan Aset karena `BmnLoanScreen` saat ini adalah form yang membutuhkan `assetId`, bukan screen daftar peminjaman; route internal tetap disembunyikan dari tab bar.

## 3. File yang Diperkirakan Tersentuh

```text
mobile/src/navigation/AppTabs.tsx
mobile/src/navigation/BmnTabs.tsx                 # baru, jika navigator dipisah
mobile/src/features/bmn/BmnMainScreen.tsx         # opsional wrapper
mobile/src/components/ui/FabMenu.tsx
mobile/src/features/bmn/BmnAssetCatalogScreen.tsx
mobile/src/features/bmn/screens/BmnDetailScreen.tsx
mobile/src/features/bmn/screens/BmnFormScreen.tsx
mobile/src/features/bmn/screens/BmnPhotoCaptureScreen.tsx
mobile/src/lib/permissions.ts                     # hanya bila helper access perlu dipakai ulang
```

Sebelum implementasi, pastikan nama screen aktual untuk Dashboard, Peminjaman, Pemeliharaan, dan Sampah. Jangan membuat placeholder untuk fitur yang belum disepakati.

## 4. Rute dan Param List

Contoh tipe awal:

```tsx
export type BmnTabParamList = {
  Beranda: undefined;
  Aset: undefined;
  Perawatan: undefined;
  Sampah: undefined;
  BmnDetail: { id: string | number };
  BmnForm: { id?: string | number };
  BmnPhotoCapture: { assetId: string | number; type: string };
};
```

Jika screen `Perawatan` atau `Sampah` belum tersedia, jangan masukkan keduanya ke param list/navigator aktif pada implementasi fase pertama.

## 5. Pemetaan FAB ke Navigator BMN

`FabMenu` tetap menjadi navigasi lintas modul, tetapi mapping submenu BMN diarahkan ke tab/route BMN:

| Key FAB | Target baru | Catatan |
|---|---|---|
| `bmn` | `BmnMain` atau `BmnTabs` → `Beranda` | Masuk dashboard BMN |
| `data-aset` | `BmnMain` atau `BmnTabs` → `Aset` | Tab utama |
| `bmn-loan` | `BmnMain` → `Peminjaman` | Masuk ke katalog aset dengan aksi peminjaman |
| `bmn-maintenance` | Tidak ada route aktif | Ditahan sebagai disabled sampai screen tersedia |
| `bmn-trash` | Tidak ada route aktif | Ditahan sebagai disabled sampai screen tersedia |
| menu disabled | tidak ada route | Tetap disabled |

Jika navigasi dipanggil dari luar navigator BMN, gunakan nested navigation dengan `navigation.navigate("BmnMain", { screen: "Aset" })` atau pola yang sesuai versi React Navigation yang sudah terpasang. Hindari menambah duplicate navigation flow tanpa kebutuhan.

## 6. Bottom Bar Visual

Gunakan style yang sudah ada di `KepegawaianTabs` sebagai baseline:

- Posisi absolute di atas safe area.
- Lebar mengikuti layar dengan margin horizontal.
- Background mengikuti `ThemeContext`.
- Ikon dan label selalu terlihat.
- State aktif memakai warna primary BMN.
- Tombol tengah/FAB khusus tidak ditambahkan kecuali ada aksi BMN yang benar-benar membutuhkan shortcut.

## 7. Back dan State Aktif

- Tab utama menggunakan `navigate`/tab switching, bukan `push` berulang.
- Detail/form dibuka sebagai route internal dalam navigator BMN agar bottom nav tetap mounted.
- Header back detail menggunakan target tab `Aset` sebagai fallback, bukan route global yang membuat navigator BMN unmount.
- Hardware back dari route internal mengembalikan pengguna ke tab induk yang terlihat.
- Tidak menggunakan route hidden sebagai tujuan akhir back jika route tersebut tidak memiliki tombol tab.

## 8. Akses Modul

`FabMenu` sudah menggunakan `hasModule(user, mod.key)`. Navigator BMN juga perlu guard UX di entry point:

```tsx
if (!hasModule(user, "bmn")) {
  navigation.navigate("Dashboard");
  return null;
}
```

Ini bukan pengganti middleware backend. Endpoint BMN tetap harus menolak akses yang tidak sah.

## 9. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Route global lama masih dipakai | Pertahankan route lama di `AppTabs` selama migrasi |
| Tab internal ikut mengambil slot layout | Sembunyikan `tabBarButton` dan `tabBarItemStyle` |
| Back menuju route tanpa tab aktif | Gunakan tab induk visible sebagai fallback |
| Screen BMN belum lengkap | Mulai dari tab yang benar-benar tersedia |
| User tanpa akses melihat BMN | Filter FAB dan guard entry point dengan `hasModule` |
| State list hilang saat pindah detail | Gunakan `useFocusEffect`/state navigator yang sudah ada, tanpa refetch berlebihan |

## 10. Definition of Design Done

- Struktur navigator disepakati.
- Daftar tab fase pertama dikonfirmasi berdasarkan screen yang benar-benar tersedia.
- Mapping FAB lama ke target baru terdokumentasi.
- Back behavior dan akses BMN memiliki acceptance test/manual matrix.
- Tidak ada perubahan backend atau `production` di scope awal.
