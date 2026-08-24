# Technical Design — Issue #581: Optimasi Request Storming & Latensi API

> **Issue**: #581
> **Dokumen Terkait**: `requirements.md`, `tasks.md`

---

## 1. Arsitektur Deduplikasi & Throttling di `frontend/src/lib/api.ts`

### 1.1 In-Flight Promise Reuse
Menggunakan map memori `pendingGetRequests = new Map<string, Promise<any>>()`:
- Kunci cache: `method:url:queryString` (hanya untuk `GET`).
- Saat `api.get(url, config)` dipanggil:
  - Jika kunci sudah ada di `pendingGetRequests`, return *existing promise*.
  - Jika belum ada, jalankan request asli dan simpan promisenya.
  - Setelah request selesai (baik resolved maupun rejected), hapus dari `pendingGetRequests` (dan simpan ke TTL cache singkat 3 detik).

### 1.2 Short-Term Response TTL Cache (3 Detik)
Menggunakan map memori `recentGetCache = new Map<string, { timestamp: number, data: any }>()`:
- Jika request `GET` yang sama dipanggil kembali dalam rentang waktu < 3000ms:
  - Kembalikan langsung clone dari `cached.data` tanpa koneksi network baru.
- Operasi write (`POST`, `PUT`, `DELETE`, `PATCH`) otomatis mengosongkan TTL cache terkait.

---

## 2. Optimasi Portal Dashboard (`frontend/src/app/portal/page.tsx`)

### 2.1 Throttling Refetch pada Focus & VisibilityChange
```tsx
const lastFetchTimeRef = useRef<number>(0);
const MIN_REFETCH_INTERVAL_MS = 30000; // 30 detik

const handleFocus = () => {
  const now = Date.now();
  if (document.visibilityState === "visible" && now - lastFetchTimeRef.current >= MIN_REFETCH_INTERVAL_MS) {
    lastFetchTimeRef.current = now;
    fetchAllRef.current();
  }
};
```

### 2.2 Eliminasi Re-Render Loop pada `authStore.updateUser`
Pada `fetchDashboard`:
```tsx
const response = await api.get("/me/dashboard");
setData(response.data);
if (response.data?.user) {
  const currentUser = authStore.getSnapshot();
  const newUserStr = JSON.stringify(response.data.user);
  if (!currentUser.includes(newUserStr)) {
    authStore.updateUser(response.data.user);
  }
}
```

---

## 3. Optimasi `auth-store.ts`

Memastikan `updateUser` membandingkan JSON data sebelum memicu `dispatchEvent("auth-change")` dan `postMessage`.
