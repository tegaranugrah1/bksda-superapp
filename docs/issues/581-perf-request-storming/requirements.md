# Requirements — Issue #581: Optimasi Request Storming & Latensi API

> **Issue**: #581
> **Tipe**: Performance & Stability
> **Scope**: `frontend/src/lib/api.ts`, `frontend/src/app/portal/page.tsx`, `frontend/src/lib/auth-store.ts`

---

## 1. Masalah & Latar Belakang

Berdasarkan log server, terjadi *request storming* (pemanggilan puluhan request API dalam hitungan milidetik yang sama) untuk berbagai endpoint seperti `/api/surat-masuk`, `/api/me/dashboard`, `/api/bmn/assets`, `/api/me/leave-requests`, dan `/api/kepegawaian/employees/{id}/leaves`.

Hal ini menyebabkan:
- Antrean request server menumpuk drastis.
- Latensi per request membengkak hingga **45 detik s.d. > 1 menit**.
- Pengalaman pengguna menjadi lambat dan terasa macet ketika berpindah tab atau membuka dashboard.

### Analisis Penyebab Utama (Root Cause):
1. **Focus & Visibility Change Flood**:
   - `portal/page.tsx` dan modul lain mendaftarkan event listener `window.onfocus` dan `document.onvisibilitychange` yang langsung mengeksekusi 4-5 request API sekaligus tanpa throttling / batas jeda waktu.
2. **Ketiadaan In-Flight Request Deduplication**:
   - Jika beberapa hook/komponen memicu request ke endpoint yang sama persis (misal `GET /api/me/dashboard`) pada saat bersamaan, masing-masing request dikirim terpisah ke server.
3. **Loop Update AuthStore**:
   - Pemanggilan `authStore.updateUser(response.data.user)` di dalam `fetchDashboard` menembakkan event `auth-change` ke seluruh listener di aplikasi, memicu re-render dan re-fetch komponen lain secara berulang.

---

## 2. Kebutuhan Fungsional (Requirements)

1. **In-Flight Request Deduplication di `lib/api.ts`**:
   - Jika terdapat request HTTP `GET` ke URL dan parameter yang sama persis saat request pertama masih berstatus *pending/in-flight*, request kedua dan seterusnya harus me-reuse promise yang sama tanpa membuat koneksi HTTP baru.
2. **Short-Term In-Memory Cache / Throttling**:
   - Request `GET` dengan parameter yang sama dalam rentang waktu singkat (misal < 3 detik) harus mengembalikan respons yang sudah didapat tanpa membebani server backend.
3. **Throttled Refetch pada Portal Dashboard**:
   - Event `focus` dan `visibilitychange` hanya boleh melakukan refetch jika telah lewat minimal 30 detik dari pengambilan data terakhir.
4. **Idempotent AuthStore User Update**:
   - `authStore.updateUser` hanya menembakkan event `auth-change` jika terdapat perbedaan data user nyata (*value changed*), bukan pada data yang identik.
