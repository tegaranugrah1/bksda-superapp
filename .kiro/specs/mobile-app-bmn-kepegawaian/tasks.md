# Implementation Plan

## Score

Rencana implementasi ini ditargetkan **10/10 untuk eksekusi bertahap oleh AI model rendah setelah local instruction matrix diikuti**.

Alasan:

- Task dipecah dari 30 epic-level items menjadi 90 task kecil.
- Setiap task punya target area, hasil yang diharapkan, dan acceptance check sederhana.
- Task diurutkan supaya model tidak perlu membuat keputusan arsitektur besar di tengah jalan.
- Task menghindari instruksi seperti "bangun flow lengkap" yang terlalu luas.
- Setiap fase punya exit criteria sehingga pekerjaan bisa berhenti di checkpoint yang jelas.
- Implementation contracts ditulis eksplisit supaya task pendek tetap punya arahan detail.
- Local instruction matrix memberi arahan khusus per task agar model kecil tidak perlu menebak konteks.
- Component props, API hook shape, error handling, permission behavior, and do/don't rules tersedia sebagai rujukan.

Subscore setelah local instruction matrix ditambahkan:

- Struktur urutan: **10/10**
- Ukuran task: **10/10**
- Kejelasan acceptance check: **10/10**
- Detail implementasi per task: **10/10**
- Kemungkinan model kecil langsung benar tanpa banyak koreksi: **10/10** jika model membaca task kecil + baris local instruction untuk task tersebut.

Sisa risiko yang tetap harus diawasi manusia/model kuat:

- Nama permission final tetap harus diverifikasi dari backend aktual.
- Endpoint Surat Tugas existing mungkin perlu adaptasi jika response masih web/table-oriented.
- Validasi visual di perangkat Android tetap wajib karena desain mobile tidak cukup hanya lewat unit test.

## Milestones and Exit Criteria

### Milestone 1: Foundation Alpha

Exit criteria:

- Mobile workspace bisa dijalankan di Android.
- API client, secure auth, `/api/me`, permission context, and role-based navigation berjalan.
- Base UI components punya touch target dan accessibility label minimum.
- 401 logout, 403 forbidden, 422 validation, network error, and retry state teruji.

Covered tasks: 1-28.

### Milestone 2: BMN Alpha

Exit criteria:

- Asset list/detail memakai pagination mobile dan card layout.
- Search/filter tidak mengambil dataset penuh.
- Photo/geotag upload, verification, create/edit, loan, and return flows berjalan sesuai permission.
- Backend tetap menolak aksi tanpa permission walau UI disembunyikan.

Covered tasks: 29-56.

### Milestone 3: Surat Tugas Alpha

Exit criteria:

- Personal and management assignment lists bekerja sesuai role.
- Detail, create/edit, approval/status action, and authenticated download/share flows berjalan.
- Employee selector paginated dipakai di form terkait.

Covered tasks: 57-75.

### Milestone 4: Android Internal Beta

Exit criteria:

- Security hardening, profile/logout, online-only behavior, accessibility pass, and automated tests selesai.
- Validasi perangkat Android minimal mencakup superadmin, admin/operator BMN, dan pegawai biasa.

Covered tasks: 76-86.

### Milestone 5: Android Internal Release

Exit criteria:

- APK/AAB internal build tersedia.
- Release notes, install guide, rollback guide, environment notes, and known limitations terdokumentasi.
- iOS readiness notes dibuat tanpa memblokir Android MVP.

Covered tasks: 87-90.

## Low-Model Execution Rules

- Kerjakan task berurutan.
- Jangan menggabungkan dua task menjadi satu PR kecuali task tersebut hanya dokumentasi kecil.
- Setelah satu task selesai, jalankan check yang disebutkan di task tersebut.
- Jangan membuat endpoint baru jika task hanya meminta verifikasi endpoint.
- Jangan mengubah scope MVP: generator dokumen BMN tetap tidak masuk mobile MVP.
- Jangan menaruh token/password di log, local storage biasa, atau screenshot.
- Update `docs/progress.md` setelah satu issue/PR selesai.
- Untuk setiap task, baca juga baris task tersebut di `Local Instruction Matrix`.

## Implementation Contracts for Small Models

Gunakan bagian ini sebagai aturan wajib saat mengerjakan semua task. Jika task singkat, detail implementasinya diambil dari kontrak ini.

### 1. Workspace and Library Contract

Use these defaults unless a later task explicitly changes them:

- Framework: Expo React Native managed workflow + TypeScript.
- Navigation: React Navigation.
- Server state: TanStack Query.
- Secure token storage: Expo SecureStore.
- Camera: Expo Camera.
- Location: Expo Location.
- File handling: Expo FileSystem + Expo Sharing.
- Forms: React Hook Form + Zod.
- Lists: FlatList first; use FlashList only if installed deliberately for long lists.
- Icons: use one consistent icon package only. Prefer the same icon family across the mobile app.
- Styling: use React Native StyleSheet + `mobile/src/theme/tokens.ts` unless NativeWind is intentionally added in task 1.

Do not:

- Add another state library before TanStack Query and AuthProvider are proven insufficient.
- Add desktop table UI patterns.
- Add offline mutation queue in MVP.
- Add unauthenticated file URLs for private documents.
- Store token in plain storage.

### 2. Folder Contract

Expected mobile source layout:

```text
mobile/src
|-- app
|-- components
|-- features
|   |-- auth
|   |-- bmn
|   |-- dashboard
|   |-- employees
|   |-- profile
|   `-- surat-tugas
|-- hooks
|-- lib
|   |-- api
|   |-- auth
|   |-- files
|   `-- permissions.ts
|-- navigation
|-- theme
`-- types
```

Rules:

- Shared UI goes in `mobile/src/components`.
- Feature-specific UI goes in `mobile/src/features/<feature>/components`.
- API calls stay inside feature API files or `mobile/src/lib/api`.
- Screens stay inside their feature folder.
- Types stay near the feature unless shared by multiple features.

### 3. Shared Component Contracts

#### `AppButton`

Required props:

```ts
type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  accessibilityLabel?: string;
};
```

Rules:

- `disabled` and `loading` must prevent `onPress`.
- Minimum height must be 48dp.
- Use `accessibilityRole="button"`.
- If `accessibilityLabel` is missing, use `title`.

#### `IconButton`

Required props:

```ts
type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: "plain" | "soft" | "danger";
  disabled?: boolean;
};
```

Rules:

- `accessibilityLabel` is mandatory.
- Minimum touch area must be 48dp even when icon is smaller.
- Do not use icon-only actions without accessible label.

#### `AppTextInput`

Required props:

```ts
type AppTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "number-pad" | "email-address";
  multiline?: boolean;
  disabled?: boolean;
};
```

Rules:

- Always render label.
- Error text must be visible below input.
- Use Indonesian user-facing validation messages.

#### `SearchInput`

Required props:

```ts
type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  accessibilityLabel?: string;
};
```

Rules:

- Use 300-500ms debounce in screen/hook, not inside the visual component.
- Provide clear button when value is not empty.

#### State Components

`EmptyState`, `ErrorState`, and `LoadingSkeleton` must be reusable and not feature-specific.

Minimum props:

```ts
type EmptyStateProps = { title: string; message?: string; action?: React.ReactNode };
type ErrorStateProps = { title?: string; message: string; onRetry?: () => void };
type LoadingSkeletonProps = { variant?: "card" | "list" | "detail"; count?: number };
```

### 4. API Client Contract

All authenticated requests must send:

```text
Authorization: Bearer <token>
Accept: application/json
X-Client: mobile
```

All mobile list requests must include:

```text
mobile=true
per_page=20
page=<number>
```

Normalized success shape:

```ts
type ApiSuccess<T> = {
  data: T;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  message?: string;
};
```

Normalized error shape:

```ts
type ApiError = {
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
  kind: "auth" | "forbidden" | "not_found" | "validation" | "rate_limit" | "server" | "network" | "unknown";
};
```

Error behavior:

- 401: clear secure token and return user to Login.
- 403: show forbidden state.
- 404: show not found state.
- 422: map field errors to form fields.
- 429: show rate-limit message and retry later.
- 500/network: show retry action.
- Never display raw exception, stack trace, SQL error, or HTML error page.

### 5. Query Hook Contract

List hooks should expose this shape:

```ts
type ListHookResult<T> = {
  items: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  error?: ApiError;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
};
```

Detail hooks should expose this shape:

```ts
type DetailHookResult<T> = {
  data?: T;
  isLoading: boolean;
  error?: ApiError;
  refetch: () => void;
};
```

Rules:

- Search debounce belongs in screen/hook logic.
- Filter changes must reset list to page 1.
- Pull-to-refresh must call `refetch`.
- Infinite loading must not fetch all data at once.

### 6. Permission Contract

Use these helpers:

```ts
can(permission: string): boolean
hasModule(module: string): boolean
isSuperAdmin(): boolean
```

Rules:

- UI may hide forbidden actions.
- Backend must still enforce permissions.
- Prefer backend `allowed_actions` if available.
- If permission data is missing, fail closed except for personal self-service views explicitly allowed by backend.
- Do not hardcode user names, NIP, email, or role display names to grant access.

### 7. Screen State Contract

Every list screen must implement:

- Loading skeleton.
- Empty state.
- Error state with retry.
- Pull-to-refresh.
- Pagination or infinite loading.
- Debounced search when search exists.

Every detail screen must implement:

- Loading skeleton.
- Not found state.
- Forbidden state.
- Error state with retry.
- Permission-gated actions.

Every form screen must implement:

- Required field validation before submit.
- Backend 422 field error mapping.
- Submit disabled while loading.
- Success feedback.
- Error feedback.

### 8. BMN Data Contracts

Asset list item minimum fields:

```ts
type AssetListItem = {
  id: string | number;
  nama_barang: string;
  kode_barang?: string;
  nup?: string | number;
  merk_tipe?: string;
  kondisi?: string;
  lokasi?: string;
  pengguna?: string;
  no_polisi?: string;
  is_verified?: boolean;
};
```

Asset card rules:

- Main line: `nama_barang`.
- Metadata line: `kode_barang`, `NUP`, optional `merk_tipe`.
- Vehicle line: show `no_polisi` only if present.
- Badge: condition and verification status.

Photo upload payload:

```text
photo: file
type: string
latitude?: number
longitude?: number
location_note?: string
```

Geotag rules:

- Request location only for geotag slot/action.
- Normal photo slot must not request location.

### 9. Surat Tugas Data Contracts

Assignment list item minimum fields:

```ts
type AssignmentListItem = {
  id: string | number;
  nomor?: string;
  kegiatan?: string;
  tujuan?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  status?: string;
  personel_summary?: string;
};
```

Assignment card rules:

- Main line: `nomor` or fallback label "Belum bernomor".
- Secondary line: kegiatan/tujuan.
- Date line: tanggal mulai-selesai.
- Badge: status text.

File download rules:

- Use authenticated request.
- Store temporary file in app cache/documents.
- Open viewer/share sheet after download.
- Show friendly error if file is missing or forbidden.

### 10. Employee Selector Contract

Employee selector must:

- Search by name and NIP.
- Use pagination.
- Never load all employees at once.
- Show name, NIP, jabatan, and unit kerja when available.
- Return selected employee object to caller.

Minimum selected shape:

```ts
type EmployeeOption = {
  id: string | number;
  name: string;
  nip?: string;
  jabatan?: string;
  unit_kerja?: string;
};
```

### 11. Security Do/Don't Contract

Do:

- Store token only in secure storage.
- Clear token on logout and 401.
- Use HTTPS in production.
- Show generic server error to user.
- Validate file type and size in backend.

Do not:

- Log token, password, authorization header, or private file URL.
- Store password anywhere.
- Commit `.env` with real values.
- Render backend HTML error page.
- Bypass backend permission checks with UI-only logic.

### 12. Definition of Done for Each Small Task

A task is done only when:

- The target file/area in the task exists or is updated.
- The acceptance check in the task is true.
- TypeScript/lint/test command relevant to the touched area passes, or the reason it cannot run is documented.
- No unrelated files are reformatted.
- `docs/progress.md` is updated after the issue/PR is considered complete.

## Local Instruction Matrix

Use this matrix together with the numbered task. A lower-capability model should read the row for the task number before editing files.

| Task | Local focus | Must follow | Do not | Local check |
| --- | --- | --- | --- | --- |
| 1 | Scaffold Expo app in `mobile/` | Workspace/library contract | Do not modify backend/frontend app folders | `mobile/package.json` exists |
| 2 | Add env template | Security contract | Do not commit real API URL secrets or tokens | `.env.example` has placeholders only |
| 3 | Write run guide | Workspace contract | Do not describe unsupported workflows | README has Android run command |
| 4 | Configure aliases | Folder contract | Do not create aliases that hide feature boundaries | TypeScript resolves one alias import |
| 5 | Add lint/type/test scripts | Workspace contract | Do not add unrelated tooling | scripts exist in `mobile/package.json` |
| 6 | Create source folders | Folder contract | Do not put feature files at root | expected folders exist |
| 7 | Define design tokens | Workspace/library contract | Do not hardcode app colors in components later | token file exports colors/spacing/type |
| 8 | Build `AppButton` | Shared Component Contracts > AppButton | Do not allow press while disabled/loading | min height 48dp and role button |
| 9 | Build `IconButton` | Shared Component Contracts > IconButton | Do not allow missing accessibility label | TypeScript requires label |
| 10 | Build `AppTextInput` | Shared Component Contracts > AppTextInput | Do not render input without label | error text is visible |
| 11 | Build `SearchInput` | Shared Component Contracts > SearchInput | Do not put debounce inside visual component | clear button works |
| 12 | Build `StatusBadge` | Shared Component Contracts > state/text rules | Do not use color-only status | badge always has text |
| 13 | Build `SectionCard` | Screen state/layout contract | Do not create nested decorative card patterns | title/action/content render |
| 14 | Build `EmptyState` | State component contract | Do not make it feature-specific | reusable props only |
| 15 | Build `ErrorState` | State component contract | Do not show raw technical errors | retry callback works |
| 16 | Build `LoadingSkeleton` | State component contract | Do not cause layout shift | card/list/detail variants exist |
| 17 | Build `ConfirmDialog` | Screen state contract | Do not run destructive action without confirm | cancel and confirm handlers work |
| 18 | Add API config | API Client Contract | Do not hardcode production URL in source | missing env has dev-friendly error |
| 19 | Add secure token storage | Security contract | Do not use plain AsyncStorage for token | get/set/clear functions exist |
| 20 | Add response normalizer | API Client Contract | Do not assume only one backend response shape | handles `data/meta/message` |
| 21 | Add error normalizer | API Client Contract | Do not expose raw stack/HTML/SQL | 422 maps field errors |
| 22 | Add central API client | API Client Contract | Do not log auth headers | sends auth, accept, `X-Client` |
| 23 | Add mobile params helper | API Client Contract | Do not override explicit page/per_page | adds `mobile=true` and default 20 |
| 24 | Add auth API service | Auth/API contracts | Do not store token here directly | login/logout/me endpoints exist |
| 25 | Add auth provider | Auth and security contracts | Do not mix navigation logic into API client | exposes auth/loading/user states |
| 26 | Add permission helpers | Permission Contract | Do not hardcode user names/NIP | missing data fails closed |
| 27 | Add root navigation | Navigation and folder contracts | Do not show app tabs before auth resolves | Login/AppTabs split works |
| 28 | Add role-based tabs | Permission Contract | Do not use display role text only | tabs hide by helper/allowed access |
| 29 | Verify dashboard API | API Client Contract | Do not create new endpoint unless missing is confirmed | endpoint returns summaries only |
| 30 | Add dashboard hook | Query Hook Contract | Do not fetch large lists | exposes loading/error/refetch |
| 31 | Add dashboard components | Shared component contracts | Do not hardcode permission decisions in UI card | quick actions accept permission props |
| 32 | Build dashboard screen | Screen State Contract | Do not omit loading/error/refresh states | retry and pull refresh work |
| 33 | Verify BMN list API | BMN Data Contract | Do not request all assets | response has pagination meta |
| 34 | Add BMN types | BMN Data Contract | Do not use `any` for asset card data | list/detail types compile |
| 35 | Add BMN list hook | Query Hook Contract | Do not fetch all pages at once | supports page/search/filter |
| 36 | Add AssetCard | BMN Data Contract | Do not create table row layout | card shows name, NUP, status |
| 37 | Build asset list shell | Screen State Contract | Do not implement full detail here | header/search/filter/list shell exists |
| 38 | Add BMN pagination | Query Hook Contract | Do not reload all previous data unnecessarily | next page appends/loads correctly |
| 39 | Add BMN debounce search | Query Hook Contract | Do not call API on every keystroke | debounce 300-500ms |
| 40 | Add BMN filter sheet | Screen State Contract | Do not use horizontal desktop filters | apply filter resets to page 1 |
| 41 | Add BMN list states | Screen State Contract | Do not reuse error state as empty state | skeleton/empty/error/retry present |
| 42 | Add detail hook | Query Hook Contract | Do not swallow 403/404 | forbidden/not-found states exposed |
| 43 | Add detail section components | BMN Data Contract | Do not put data fetching in presentational sections | typed props only |
| 44 | Build detail screen | Screen State Contract | Do not show missing vehicle fields as fake data | vehicle fields conditional |
| 45 | Add asset action bar | Permission Contract | Do not show actions from UI guess only if backend disallows | actions gated by helpers/allowed actions |
| 46 | Add asset form schema | Form/screen state contract | Do not use English validation messages | Zod schema returns Indonesian messages |
| 47 | Build asset form shell | Form/screen state contract | Do not create one huge ungrouped form | sectioned layout without horizontal scroll |
| 48 | Wire asset submit | API/error/permission contracts | Do not ignore backend 422 | maps field errors and refreshes |
| 49 | Add photo slot | BMN Data Contract | Do not request camera from display-only component | slot renders placeholder/image/actions |
| 50 | Add camera permission helper | Security/screen state contract | Do not capture before permission result | denied state is friendly |
| 51 | Add geotag location helper | BMN Data Contract | Do not request location for normal photo | geotag-only location request |
| 52 | Build photo capture screen | Screen state contract | Do not submit without selected photo | preview/retake/submit flow works |
| 53 | Wire photo upload | API/security/BMN contracts | Do not log file path/token | progress and retry states work |
| 54 | Build verification action | Permission/screen state contracts | Do not verify without confirmation | success refreshes detail |
| 55 | Build loan form shell | Employee selector/form contracts | Do not submit without asset/employee/date | disabled submit until valid |
| 56 | Wire loan/return submit | API/permission contracts | Do not bypass backend status checks | success refreshes asset/history |
| 57 | Verify ST list API | Surat Tugas Data Contract | Do not load all assignments | personal/management pagination works |
| 58 | Verify ST detail API | Surat Tugas Data Contract | Do not expose forbidden detail | forbidden user receives 403 |
| 59 | Add ST types | Surat Tugas Data Contract | Do not use `any` for card/detail | typed list/detail data compiles |
| 60 | Add ST list hook | Query Hook Contract | Do not merge personal and management assumptions | supports mode/page/search/status |
| 61 | Add AssignmentCard | Surat Tugas Data Contract | Do not rely on color-only status | card shows text status |
| 62 | Build ST list shell | Screen State Contract | Do not build form/detail here | header/search/filter/list shell exists |
| 63 | Add ST pagination/states | Query and Screen State contracts | Do not conflate empty/error | loading/empty/error/refresh/next page |
| 64 | Add ST detail hook | Query Hook Contract | Do not swallow forbidden/not-found | states exposed |
| 65 | Add ST detail sections | Surat Tugas Data Contract | Do not use horizontal document layout | readable mobile sections |
| 66 | Build ST detail screen | Permission and Screen State contracts | Do not show file action without authorization | gated actions render correctly |
| 67 | Add ST form schema | Form contract | Do not use vague validation | field messages are Indonesian |
| 68 | Build ST form shell | Form/screen state contract | Do not make a single giant form | sectioned form and keyboard-safe |
| 69 | Wire ST submit | API/error contract | Do not ignore 422 | success opens/refreshes detail/list |
| 70 | Add approval action component | Permission/screen state contracts | Do not run status action without confirm | confirm required |
| 71 | Wire approval/status API | API/permission contract | Do not assume invalid transition succeeds | error shown and data refreshes |
| 72 | Add authenticated download helper | File/Security contract | Do not expose unauthenticated URLs | uses auth request |
| 73 | Add file share helper | File contract | Do not crash on missing file | friendly missing-file error |
| 74 | Add employee search hook | Employee Selector Contract | Do not fetch all employees | paginated name/NIP search |
| 75 | Add employee selector sheet | Employee Selector Contract | Do not return partial unusable object | selected employee shape returned |
| 76 | Build profile screen | Security/permission contracts | Do not display token/session data | profile and logout visible |
| 77 | Add logout flow | Security contract | Do not leave token after failed API logout | local cleanup always happens |
| 78 | Add online status | Online-only/screen state contracts | Do not add offline queue | offline banner/state exists |
| 79 | Add foreground refresh | Query Hook Contract | Do not refetch every second constantly | refetch on app resume |
| 80 | Add API tests | API Client Contract | Do not test only happy path | success/error/mobile params covered |
| 81 | Add permission tests | Permission Contract | Do not let missing data grant access | fail-closed tests pass |
| 82 | Add form tests | Form contracts | Do not test only valid data | required/invalid date tested |
| 83 | Add accessibility pass | Component contracts | Do not leave icon-only actions unlabeled | labels verified |
| 84 | Add security pass | Security contract | Do not keep debug token logs | `rg` finds no token/password logs |
| 85 | Validate superadmin path | Milestone validation | Do not skip device/emulator check if available | no crash on main admin path |
| 86 | Validate employee path | Milestone validation | Do not expose admin-only actions | forbidden actions hidden/blocked |
| 87 | Configure app metadata | Release contract | Do not leave placeholder app identity | app name/package/icon set |
| 88 | Build Android artifact | Release contract | Do not call release done without installable artifact | APK/AAB generated |
| 89 | Write release notes | Documentation contract | Do not omit limitations | mentions online-only and no generators |
| 90 | Update progress | Documentation contract | Do not leave progress stale | date/completed/verification/next steps |

## Tasks

### Milestone 1: Foundation Alpha

- [x] 1. Create mobile workspace folder
  - Target area: `mobile/`.
  - Create an Expo React Native + TypeScript app scaffold.
  - Acceptance check: `mobile/package.json` exists and the app can run with the documented command.
  - _Requirements: 1, 20_

- [x] 2. Add mobile environment template
  - Target area: `mobile/.env.example`.
  - Define API base URL and app environment keys only.
  - Acceptance check: no secret value is committed.
  - _Requirements: 19_

- [x] 3. Add mobile README run guide
  - Target area: `mobile/README.md`.
  - Document install, Android run, lint, test, and env setup.
  - Acceptance check: a new developer can find the Android run command in the README.
  - _Requirements: 20_

- [x] 4. Configure TypeScript path aliases
  - Target area: `mobile/tsconfig.json`.
  - Add aliases for `src`, components, features, lib, and hooks.
  - Acceptance check: one import uses the alias without TypeScript error.
  - _Requirements: 20_

- [x] 5. Configure lint and format scripts
  - Target area: `mobile/package.json`.
  - Add scripts for lint, typecheck, and test.
  - Acceptance check: scripts exist and run without missing-command errors.
  - _Requirements: 20_

- [x] 6. Create mobile source directory structure
  - Target area: `mobile/src`.
  - Create folders: `app`, `components`, `features`, `hooks`, `lib`, `navigation`, `theme`, `types`.
  - Acceptance check: no feature code is placed at project root.
  - _Requirements: 20_

- [x] 7. Add design tokens
  - Target area: `mobile/src/theme/tokens.ts`.
  - Define colors, spacing, typography, radius, and shadow tokens.
  - Acceptance check: tokens include primary, danger, warning, info, neutral, and surface colors.
  - _Requirements: 20_

- [x] 8. Add AppButton component
  - Target area: `mobile/src/components/AppButton.tsx`.
  - Support primary, secondary, danger, disabled, loading, and icon variants.
  - Acceptance check: minimum touch target is 48dp on Android.
  - _Requirements: 20_

- [x] 9. Add IconButton component
  - Target area: `mobile/src/components/IconButton.tsx`.
  - Require `accessibilityLabel`.
  - Acceptance check: component cannot be used without a label in TypeScript.
  - _Requirements: 20_

- [x] 10. Add AppTextInput component
  - Target area: `mobile/src/components/AppTextInput.tsx`.
  - Support label, helper text, error text, secure text, and disabled state.
  - Acceptance check: validation error text is visible and screen-reader friendly.
  - _Requirements: 17, 20_

- [x] 11. Add SearchInput component
  - Target area: `mobile/src/components/SearchInput.tsx`.
  - Include clear button and accessible label.
  - Acceptance check: search text can be cleared with one tap.
  - _Requirements: 18, 20_

- [x] 12. Add StatusBadge component
  - Target area: `mobile/src/components/StatusBadge.tsx`.
  - Support success, warning, danger, info, neutral.
  - Acceptance check: badge always shows text, not color only.
  - _Requirements: 20_

- [x] 13. Add SectionCard component
  - Target area: `mobile/src/components/SectionCard.tsx`.
  - Provide title, optional subtitle, optional action, and content slot.
  - Acceptance check: no nested decorative card style is introduced.
  - _Requirements: 20_

- [x] 14. Add EmptyState component
  - Target area: `mobile/src/components/EmptyState.tsx`.
  - Include title, message, optional action.
  - Acceptance check: can be reused for empty BMN and Surat Tugas lists.
  - _Requirements: 17, 20_

- [x] 15. Add ErrorState component
  - Target area: `mobile/src/components/ErrorState.tsx`.
  - Include user-friendly message and retry button.
  - Acceptance check: no raw stack trace is displayed.
  - _Requirements: 17, 20_

- [x] 16. Add LoadingSkeleton component
  - Target area: `mobile/src/components/LoadingSkeleton.tsx`.
  - Provide card/list placeholder variants.
  - Acceptance check: list screens can show skeleton while loading.
  - _Requirements: 18, 20_

- [x] 17. Add ConfirmDialog component
  - Target area: `mobile/src/components/ConfirmDialog.tsx`.
  - Support title, message, confirm, cancel, danger mode.
  - Acceptance check: destructive action cannot run without explicit confirm handler.
  - _Requirements: 13, 20_

- [x] 18. Add API config helper
  - Target area: `mobile/src/lib/api/config.ts`.
  - Read API base URL from env.
  - Acceptance check: missing base URL produces developer-friendly error.
  - _Requirements: 17, 19_

- [x] 19. Add secure token storage helper
  - Target area: `mobile/src/lib/auth/tokenStorage.ts`.
  - Use secure storage, not plain async storage.
  - Acceptance check: helper exposes get, set, and clear token functions.
  - _Requirements: 1, 19_

- [x] 20. Add API response normalizer
  - Target area: `mobile/src/lib/api/normalize.ts`.
  - Normalize `data`, `meta`, and `message` response shapes.
  - Acceptance check: legacy top-level payload can still be handled.
  - _Requirements: 17_

- [x] 21. Add API error normalizer
  - Target area: `mobile/src/lib/api/errors.ts`.
  - Normalize 401, 403, 404, 422, 429, 500, and network errors.
  - Acceptance check: 422 returns field-level error map.
  - _Requirements: 17_

- [x] 22. Add central API client
  - Target area: `mobile/src/lib/api/client.ts`.
  - Attach token, `Accept: application/json`, and `X-Client: mobile`.
  - Acceptance check: authenticated request includes the expected headers.
  - _Requirements: 1, 17, 19_

- [x] 23. Add mobile query helper
  - Target area: `mobile/src/lib/api/mobileParams.ts`.
  - Add `mobile=true` and default `per_page=20` to list requests.
  - Acceptance check: helper does not override explicit page values.
  - _Requirements: 18_

- [x] 24. Add auth service
  - Target area: `mobile/src/features/auth/authApi.ts`.
  - Implement login, logout, and me API calls.
  - Acceptance check: login calls `POST /api/login`; me calls `GET /api/me`.
  - _Requirements: 1, 2_

- [x] 25. Add auth context
  - Target area: `mobile/src/features/auth/AuthProvider.tsx`.
  - Store user, employee, token state, and loading state.
  - Acceptance check: app can distinguish unauthenticated, loading, and authenticated states.
  - _Requirements: 1, 2_

- [x] 26. Add permission helpers
  - Target area: `mobile/src/lib/permissions.ts`.
  - Implement `can`, `hasModule`, and `isSuperAdmin`.
  - Acceptance check: helpers handle missing permissions safely.
  - _Requirements: 2, 4, 19_

- [x] 27. Add root navigation shell
  - Target area: `mobile/src/navigation`.
  - Create auth stack and app tabs with placeholder screens.
  - Acceptance check: unauthenticated user sees Login; authenticated user sees tabs.
  - _Requirements: 4_

- [x] 28. Add role-based tab visibility
  - Target area: `mobile/src/navigation/AppTabs.tsx`.
  - Hide BMN and Surat Tugas tabs when access is missing.
  - Acceptance check: tab visibility is driven by permission helpers, not hardcoded user names.
  - _Requirements: 4, 19_

### Milestone 2: BMN Alpha

- [x] 29. Verify mobile dashboard API contract
  - Target area: backend API documentation or route notes.
  - Confirm `GET /api/mobile/dashboard` returns lightweight summary data.
  - Acceptance check: endpoint does not return full asset or Surat Tugas lists.
  - _Requirements: 3, 18_

- [x] 30. Add dashboard API hook
  - Target area: `mobile/src/features/dashboard/useMobileDashboard.ts`.
  - Fetch `GET /api/mobile/dashboard`.
  - Acceptance check: hook exposes loading, data, error, and refetch.
  - _Requirements: 3, 17_

- [x] 31. Add dashboard summary components
  - Target area: `mobile/src/features/dashboard/components`.
  - Build profile summary, metric card, alert card, and quick action components.
  - Acceptance check: quick action receives permission state as props.
  - _Requirements: 3, 4, 20_

- [x] 32. Build dashboard screen
  - Target area: `mobile/src/features/dashboard/DashboardScreen.tsx`.
  - Render profile, metrics, alerts, quick actions, loading, empty, error, and pull-to-refresh.
  - Acceptance check: retry button calls refetch.
  - _Requirements: 3, 17, 20_

- [x] 33. Verify BMN asset list mobile API
  - Target area: backend BMN assets endpoint.
  - Confirm `GET /api/bmn/assets?mobile=true&page=1&per_page=20`.
  - Acceptance check: response includes lightweight card fields and pagination meta.
  - _Requirements: 5, 18_

- [ ] 34. Add BMN asset types
  - Target area: `mobile/src/features/bmn/types.ts`.
  - Define asset list item, asset detail, photo slot, and pagination meta types.
  - Acceptance check: no `any` is needed for asset card props.
  - _Requirements: 5, 6_

- [ ] 35. Add BMN asset list API hook
  - Target area: `mobile/src/features/bmn/useAssets.ts`.
  - Fetch paginated asset list with mobile params.
  - Acceptance check: hook supports page, search, and filters.
  - _Requirements: 5, 18_

- [ ] 36. Add AssetCard component
  - Target area: `mobile/src/features/bmn/components/AssetCard.tsx`.
  - Show name, code, NUP, condition, location, verification state, and vehicle plate if available.
  - Acceptance check: card has one clear tap target to open detail.
  - _Requirements: 5, 20_

- [ ] 37. Build BMN asset list screen shell
  - Target area: `mobile/src/features/bmn/AssetListScreen.tsx`.
  - Render header, search, filter button, and list container.
  - Acceptance check: no desktop table layout is used.
  - _Requirements: 5, 20_

- [ ] 38. Add BMN list pagination
  - Target area: asset list screen/hook.
  - Implement infinite load or page load.
  - Acceptance check: next page loads without refetching all previous data.
  - _Requirements: 5, 18_

- [ ] 39. Add BMN debounced search
  - Target area: asset list screen.
  - Debounce search 300-500ms.
  - Acceptance check: typing three letters does not send three immediate API calls.
  - _Requirements: 5, 18_

- [ ] 40. Add BMN filter sheet
  - Target area: `mobile/src/features/bmn/components/AssetFilterSheet.tsx`.
  - Include condition, type, location, status, and verification filters where supported.
  - Acceptance check: applying filter resets list to page 1.
  - _Requirements: 5, 18, 20_

- [ ] 41. Add BMN list states
  - Target area: asset list screen.
  - Add loading skeleton, empty state, error state, retry, and pull-to-refresh.
  - Acceptance check: each state can be triggered in mock/dev mode.
  - _Requirements: 5, 17, 20_

- [ ] 42. Add BMN asset detail API hook
  - Target area: `mobile/src/features/bmn/useAssetDetail.ts`.
  - Fetch `GET /api/bmn/assets/{id}`.
  - Acceptance check: hook exposes not-found and forbidden states.
  - _Requirements: 6, 17_

- [ ] 43. Add asset detail section components
  - Target area: `mobile/src/features/bmn/components/detail`.
  - Create `AssetSummarySection`, `AssetIdentitySection`, `AssetLocationSection`, `AssetDocumentSection`, `AssetFinanceSection`, `AssetOrganizationSection`.
  - Acceptance check: each section accepts typed asset detail props.
  - _Requirements: 6, 20_

- [ ] 44. Build asset detail screen
  - Target area: `mobile/src/features/bmn/AssetDetailScreen.tsx`.
  - Render sections, loading, not found, forbidden, and retry states.
  - Acceptance check: vehicle fields appear only when present.
  - _Requirements: 6, 17, 20_

- [ ] 45. Add asset action bar
  - Target area: asset detail components.
  - Show edit, upload photo, verify, loan, and return actions based on permissions.
  - Acceptance check: action bar receives permission booleans from helper/backend state.
  - _Requirements: 6, 9, 10, 19_

- [ ] 46. Add BMN asset form schema
  - Target area: `mobile/src/features/bmn/assetFormSchema.ts`.
  - Define validation for required asset fields used on mobile.
  - Acceptance check: invalid required fields return readable Indonesian messages.
  - _Requirements: 7, 17_

- [ ] 47. Build asset form screen shell
  - Target area: `mobile/src/features/bmn/AssetFormScreen.tsx`.
  - Build sectioned form layout with placeholders for fields.
  - Acceptance check: layout works on small Android screen without horizontal scroll.
  - _Requirements: 7, 20_

- [ ] 48. Wire asset create/update submit
  - Target area: BMN asset form API.
  - Submit create/update only when permission allows.
  - Acceptance check: backend 422 errors are mapped to fields.
  - _Requirements: 7, 17, 19_

- [ ] 49. Add photo slot component
  - Target area: `mobile/src/features/bmn/components/PhotoSlot.tsx`.
  - Render image/placeholder, slot label, upload action, delete action if allowed.
  - Acceptance check: geotag slot is visually distinct from normal slots.
  - _Requirements: 8, 20_

- [ ] 50. Add camera permission helper
  - Target area: `mobile/src/features/bmn/photoPermissions.ts`.
  - Request camera permission before capture.
  - Acceptance check: denied permission shows user-friendly message.
  - _Requirements: 8, 17_

- [ ] 51. Add location permission helper for geotag
  - Target area: photo/geotag helpers.
  - Request location only for geotag capture.
  - Acceptance check: normal photo slot does not request location.
  - _Requirements: 8, 16_

- [ ] 52. Build photo capture screen
  - Target area: `mobile/src/features/bmn/PhotoCaptureScreen.tsx`.
  - Capture photo, show preview, allow retake/cancel/submit.
  - Acceptance check: submit is disabled until a photo exists.
  - _Requirements: 8, 20_

- [ ] 53. Wire photo upload API
  - Target area: BMN photo API helper.
  - Upload `photo`, `type`, optional `latitude`, `longitude`, and `location_note`.
  - Acceptance check: upload progress is shown for uploads over 1 second.
  - _Requirements: 8, 17, 19_

- [ ] 54. Build asset verification action
  - Target area: asset detail action components.
  - Add confirm dialog and call verification endpoint.
  - Acceptance check: success refreshes detail status.
  - _Requirements: 9, 17, 19_

- [ ] 55. Build BMN loan form shell
  - Target area: `mobile/src/features/bmn/LoanFormScreen.tsx`.
  - Include asset summary, employee selector placeholder, date, and notes.
  - Acceptance check: submit disabled until required fields exist.
  - _Requirements: 10, 15, 20_

- [ ] 56. Wire BMN loan and return submit
  - Target area: BMN loan API helper.
  - Submit loan and return actions with confirmation.
  - Acceptance check: success refreshes asset detail and loan history.
  - _Requirements: 10, 17, 19_

### Milestone 3: Surat Tugas Alpha

- [ ] 57. Verify Surat Tugas list API
  - Target area: backend Surat Tugas endpoint.
  - Confirm personal and management list endpoints support pagination.
  - Acceptance check: endpoint can return page 1 with mobile-friendly fields.
  - _Requirements: 11, 18_

- [ ] 58. Verify Surat Tugas detail API
  - Target area: backend Surat Tugas detail endpoint.
  - Confirm response includes personel, status, dates, file state, and allowed actions where possible.
  - Acceptance check: forbidden user receives 403, not hidden data.
  - _Requirements: 11, 14, 19_

- [ ] 59. Add Surat Tugas types
  - Target area: `mobile/src/features/surat-tugas/types.ts`.
  - Define list item, detail, personel, status, file, and action types.
  - Acceptance check: assignment card does not use `any`.
  - _Requirements: 11_

- [ ] 60. Add Surat Tugas list API hook
  - Target area: `mobile/src/features/surat-tugas/useAssignments.ts`.
  - Support personal mode, management mode, page, search, and status filter.
  - Acceptance check: hook uses mobile params and pagination meta.
  - _Requirements: 11, 18_

- [ ] 61. Add AssignmentCard component
  - Target area: `mobile/src/features/surat-tugas/components/AssignmentCard.tsx`.
  - Show number, activity/destination, date range, status, and personel summary.
  - Acceptance check: status badge includes text.
  - _Requirements: 11, 20_

- [ ] 62. Build Surat Tugas list screen shell
  - Target area: `mobile/src/features/surat-tugas/AssignmentListScreen.tsx`.
  - Render header, search, status filter, and list.
  - Acceptance check: personal/management mode label is visible.
  - _Requirements: 11, 20_

- [ ] 63. Add Surat Tugas list pagination and states
  - Target area: assignment list screen.
  - Add pagination, loading skeleton, empty, error, retry, and pull-to-refresh.
  - Acceptance check: empty state is different from error state.
  - _Requirements: 11, 17, 18, 20_

- [ ] 64. Add Surat Tugas detail API hook
  - Target area: `mobile/src/features/surat-tugas/useAssignmentDetail.ts`.
  - Fetch detail by id.
  - Acceptance check: hook exposes loading, detail, forbidden, not found, and refetch.
  - _Requirements: 11, 17_

- [ ] 65. Build Surat Tugas detail sections
  - Target area: `mobile/src/features/surat-tugas/components/detail`.
  - Create summary, dates, personel, content, file, and status sections.
  - Acceptance check: long content is readable without horizontal scroll.
  - _Requirements: 11, 14, 20_

- [ ] 66. Build Surat Tugas detail screen
  - Target area: `mobile/src/features/surat-tugas/AssignmentDetailScreen.tsx`.
  - Render detail sections and permission-gated actions.
  - Acceptance check: file action appears only if backend says file is available/allowed.
  - _Requirements: 11, 14, 19_

- [ ] 67. Add Surat Tugas form schema
  - Target area: `mobile/src/features/surat-tugas/assignmentFormSchema.ts`.
  - Validate core fields, dates, location, personel, and transport where required.
  - Acceptance check: validation messages are in Indonesian.
  - _Requirements: 12, 17_

- [ ] 68. Build Surat Tugas form shell
  - Target area: `mobile/src/features/surat-tugas/AssignmentFormScreen.tsx`.
  - Build sectioned layout for info, dates/location, personel, funding/transport, and review.
  - Acceptance check: keyboard does not hide active input on Android.
  - _Requirements: 12, 20_

- [ ] 69. Wire Surat Tugas create/edit submit
  - Target area: Surat Tugas form API helper.
  - Submit create/edit and map 422 errors to fields.
  - Acceptance check: success opens detail or refreshes relevant list.
  - _Requirements: 12, 17, 19_

- [ ] 70. Add approval/status action component
  - Target area: `mobile/src/features/surat-tugas/components/AssignmentActions.tsx`.
  - Render approve, reject, and status update actions based on allowed actions.
  - Acceptance check: each action requires confirmation.
  - _Requirements: 13, 19, 20_

- [ ] 71. Wire approval/status API
  - Target area: Surat Tugas action API helper.
  - Call backend status endpoints and handle invalid transition errors.
  - Acceptance check: success refreshes list and detail.
  - _Requirements: 13, 17, 19_

- [ ] 72. Add authenticated file download helper
  - Target area: `mobile/src/lib/files/download.ts`.
  - Download files with auth header and save to app cache/documents.
  - Acceptance check: helper does not expose unauthenticated file URLs.
  - _Requirements: 14, 19_

- [ ] 73. Add file viewer/share helper
  - Target area: `mobile/src/lib/files/share.ts`.
  - Open file with viewer or share sheet.
  - Acceptance check: missing file shows user-friendly error.
  - _Requirements: 14, 17_

- [ ] 74. Build employee selector API hook
  - Target area: `mobile/src/features/employees/useEmployeeSearch.ts`.
  - Search employees by name and NIP with pagination.
  - Acceptance check: hook does not fetch all employees at once.
  - _Requirements: 15, 18, 19_

- [ ] 75. Build employee selector sheet
  - Target area: `mobile/src/features/employees/EmployeeSelectorSheet.tsx`.
  - Display name, NIP, jabatan, and unit kerja summary.
  - Acceptance check: selector can be reused by BMN loan and Surat Tugas forms.
  - _Requirements: 15, 20_

### Milestone 4: Android Internal Beta

- [ ] 76. Build profile screen
  - Target area: `mobile/src/features/profile/ProfileScreen.tsx`.
  - Show user identity, employee data, role, access modules, and logout action.
  - Acceptance check: token/session values are never displayed.
  - _Requirements: 2, 19, 20_

- [ ] 77. Add logout confirmation flow
  - Target area: profile/auth flow.
  - Confirm logout, call API, clear secure storage, reset navigation.
  - Acceptance check: logout works even if API request fails.
  - _Requirements: 1, 19_

- [ ] 78. Add online-only network state
  - Target area: `mobile/src/hooks/useOnlineStatus.ts`.
  - Detect no connection and expose status to screens.
  - Acceptance check: offline banner appears when network request fails due to connection.
  - _Requirements: 16_

- [ ] 79. Add foreground refresh behavior
  - Target area: app shell/query setup.
  - Refresh key screens when app returns to foreground.
  - Acceptance check: stale dashboard/list refetches after app resume.
  - _Requirements: 16, 18_

- [ ] 80. Add unit tests for API client
  - Target area: mobile test files.
  - Test response normalizer, error normalizer, mobile params, and auth headers.
  - Acceptance check: tests pass through mobile test script.
  - _Requirements: 17, 18, 19_

- [ ] 81. Add unit tests for permissions
  - Target area: permission helper tests.
  - Test can, hasModule, isSuperAdmin, empty permission state, and missing module state.
  - Acceptance check: helpers fail closed, not open.
  - _Requirements: 2, 19_

- [ ] 82. Add form validation tests
  - Target area: BMN and Surat Tugas schema tests.
  - Test required fields and invalid dates.
  - Acceptance check: validation messages are readable and stable.
  - _Requirements: 7, 12, 17_

- [ ] 83. Add accessibility pass for base components
  - Target area: shared components.
  - Check labels for buttons, icon buttons, inputs, cards, and tabs.
  - Acceptance check: icon-only action has accessible label.
  - _Requirements: 20_

- [ ] 84. Add security hardening pass
  - Target area: auth/API/files/photo helpers.
  - Ensure no password, token, or sensitive document path is logged.
  - Acceptance check: `rg` finds no token/password debug logging in mobile source.
  - _Requirements: 19_

- [ ] 85. Validate Android superadmin path
  - Target area: Android device/emulator.
  - Login as superadmin and test dashboard, BMN list/detail, and Surat Tugas list/detail.
  - Acceptance check: no crash in the tested path.
  - _Requirements: all MVP requirements_

- [ ] 86. Validate Android regular employee path
  - Target area: Android device/emulator.
  - Login as regular employee and test personal dashboard, personal BMN visibility, and personal Surat Tugas visibility.
  - Acceptance check: forbidden/admin-only actions are hidden or blocked.
  - _Requirements: all MVP requirements_

### Milestone 5: Android Internal Release

- [ ] 87. Configure Android app metadata
  - Target area: Expo app config.
  - Set app name, package id, icon, splash, and build profile.
  - Acceptance check: metadata does not use placeholder app name.
  - _Requirements: 20_

- [ ] 88. Build internal Android artifact
  - Target area: mobile build pipeline.
  - Build APK/AAB for internal testing.
  - Acceptance check: artifact is generated and installable on a test device.
  - _Requirements: 19, 20_

- [ ] 89. Write internal release notes
  - Target area: `mobile/docs/release-notes.md` or root docs.
  - Include included features, known limitations, install notes, and rollback notes.
  - Acceptance check: notes mention online-only MVP and no BMN document generator.
  - _Requirements: all MVP requirements_

- [ ] 90. Update progress after release preparation
  - Target area: `docs/progress.md`.
  - Record completed mobile planning/build progress and next recommended milestone.
  - Acceptance check: progress entry includes date, completed work, verification, and next steps.
  - _Requirements: all MVP requirements_
