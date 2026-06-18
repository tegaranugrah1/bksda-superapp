# Implementation Plan

## Score

Rencana implementasi ini saya nilai **9.5/10** setelah audit dan penyelarasan dengan requirement/design.

Alasan:

- Urutannya memaksa fondasi API/auth/design system beres sebelum fitur besar dibangun.
- Setiap task bisa dipisah menjadi issue/PR kecil.
- MVP tetap online-only dan tidak membawa generator dokumen BMN yang berat.
- Permission backend tetap jadi sumber kebenaran.
- Pagination, response ringan, loading/error state, dan aksesibilitas masuk sejak awal.
- Milestone dan exit criteria sudah ditambahkan supaya tiap fase bisa dinilai selesai atau belum.

Sisa risiko yang diterima:

- Daftar final permission per tombol tetap perlu diverifikasi langsung dari kode backend saat implementation spike.
- Detail endpoint Surat Tugas mobile mungkin masih membutuhkan penyesuaian setelah spike pertama.
- Validasi iOS belum masuk target eksekusi awal.

## Milestones and Exit Criteria

### Milestone 1: Foundation Alpha

Exit criteria:

- Expo React Native workspace bisa dijalankan di Android.
- API client, secure auth, `/api/me`, permission context, and role-based navigation berjalan.
- Base UI components memenuhi touch target dan accessibility label minimum.
- 401 logout, 403 forbidden, 422 validation, network error, and retry state sudah teruji.

Covered tasks: 1-8.

### Milestone 2: BMN Alpha

Exit criteria:

- Asset list/detail memakai pagination mobile dan card layout.
- Search/filter tidak mengambil dataset penuh.
- Photo/geotag upload, verification, create/edit, loan, and return flows berjalan sesuai permission.
- Backend tetap menolak aksi tanpa permission walau UI disembunyikan.

Covered tasks: 9-15.

### Milestone 3: Surat Tugas Alpha

Exit criteria:

- Personal and management assignment lists bekerja sesuai role.
- Detail, create/edit, approval/status action, and authenticated download/share flows berjalan.
- Employee selector paginated dipakai di form terkait.

Covered tasks: 16-22.

### Milestone 4: Android Internal Beta

Exit criteria:

- Security hardening, profile/logout, online-only behavior, accessibility pass, and automated tests selesai.
- Validasi perangkat Android minimal mencakup superadmin, admin/operator BMN, dan pegawai biasa.

Covered tasks: 23-28.

### Milestone 5: Android Internal Release

Exit criteria:

- APK/AAB internal build tersedia.
- Release notes, install guide, rollback guide, environment notes, and known limitations terdokumentasi.
- iOS readiness notes dibuat tanpa memblokir Android MVP.

Covered tasks: 29-30.

## Tasks

- [ ] 1. Prepare mobile workspace and project conventions
  - Create an Expo React Native + TypeScript mobile app workspace.
  - Decide folder location, for example `mobile/`, without disturbing existing backend/frontend apps.
  - Configure path aliases, linting, formatting, env loading, and basic app metadata.
  - Add development README for running Android emulator/device builds.
  - _Requirements: 1, 19, 20_

- [ ] 2. Build shared mobile design foundation
  - Create design tokens for color, spacing, typography, radius, shadow, and status colors.
  - Build base components: `AppButton`, `IconButton`, `AppTextInput`, `SearchInput`, `StatusBadge`, `SectionCard`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, and `ConfirmDialog`.
  - Ensure touch targets meet Android 48dp and iOS 44pt minimum.
  - Add accessibility labels for all interactive base components.
  - _Requirements: 4, 20_

- [ ] 3. Build API client and response normalizer
  - Create a central API client with `Authorization`, `Accept: application/json`, and `X-Client: mobile` headers.
  - Add `mobile=true` helper for mobile list requests.
  - Normalize success response shapes into `data`, `meta`, and `message`.
  - Normalize API errors for 401, 403, 404, 422, 429, 500, and network failures.
  - Add unit tests for response and error normalization.
  - _Requirements: 1, 17, 18, 19_

- [ ] 4. Implement secure authentication flow
  - Build login screen with username/NIP and password.
  - Call `POST /api/login`.
  - Store token/session only in secure storage.
  - Implement logout through `POST /api/logout` and local secure storage cleanup.
  - Implement automatic logout on 401.
  - Show online-only connection state when network is unavailable.
  - _Requirements: 1, 16, 19_

- [ ] 5. Implement profile bootstrap and permission context
  - Call `GET /api/me` after login/session restore.
  - Store user, employee, role, access modules, and permissions in an app context.
  - Build helpers: `can(permission)`, `hasModule(module)`, and `isSuperAdmin()`.
  - Add forbidden and limited-profile states.
  - Verify actual backend permission names and document the final mapping in code comments or a developer note.
  - _Requirements: 2, 4, 19_

- [ ] 6. Implement root navigation and role-based tabs
  - Build auth stack and app tab navigation.
  - Add tabs: Beranda, BMN, Surat Tugas, and Profil.
  - Hide BMN and Surat Tugas tabs when the user has no related access.
  - Add deep-link forbidden handling for screens opened without permission.
  - _Requirements: 4, 20_

- [ ] 7. Implement mobile dashboard backend endpoint if still missing
  - Verify `GET /api/mobile/dashboard` contract.
  - Return only lightweight summary data, not large lists.
  - Include profile summary, BMN counts, active loans, Surat Tugas counts, pending approvals, and vehicle tax alerts when relevant.
  - Protect the endpoint with auth and backend permission checks.
  - _Requirements: 3, 17, 18, 19_

- [ ] 8. Build Portal Mobile dashboard screen
  - Render profile summary, role badge, summary cards, alerts, and quick actions based on permission.
  - Add pull-to-refresh, skeleton loading, empty state, error state, and retry action.
  - Ensure quick actions never appear without permission.
  - _Requirements: 3, 4, 20_

- [ ] 9. Prepare BMN list API for mobile usage
  - Verify `GET /api/bmn/assets?mobile=true&page=1&per_page=20`.
  - Ensure response contains lightweight fields for cards.
  - Ensure search supports useful mobile fields: nama barang, kode barang, NUP, merk/tipe, no polisi, pengguna, and lokasi when available.
  - Ensure filters work for condition, type, location, status, and verification state when available.
  - Keep backend permission checks active.
  - _Requirements: 5, 17, 18, 19_

- [ ] 10. Build BMN asset list screen
  - Use virtualized list with paginated/infinite loading.
  - Render assets as mobile cards, not tables.
  - Add debounced search and filter bottom sheet.
  - Add pull-to-refresh, loading skeleton, empty state, error state, and retry.
  - Show vehicle-specific details on vehicle cards.
  - _Requirements: 5, 18, 20_

- [ ] 11. Build BMN asset detail screen
  - Fetch `GET /api/bmn/assets/{id}`.
  - Group detail into Ringkasan, Identitas, Lokasi, Dokumen, Finansial, Organisasi, Foto, and Riwayat.
  - Display vehicle fields: no polisi, no mesin, no rangka, tanggal pajak, and tanggal ganti plat when available.
  - Show permission-gated actions for edit, photo, verification, loan, and return.
  - Add forbidden/not found states.
  - _Requirements: 6, 19, 20_

- [ ] 12. Build BMN asset create/edit forms
  - Build sectioned forms that do not feel like desktop tables.
  - Add client validation for required fields.
  - Submit create/update only for users with permission.
  - Map backend 422 validation errors to fields.
  - Refresh list/detail after successful save.
  - _Requirements: 7, 17, 19, 20_

- [ ] 13. Build BMN photo and geotag flow
  - Build photo slot UI for geotag and asset views.
  - Request camera permission before taking photos.
  - Request location permission only when geotag metadata is needed.
  - Upload `photo`, `type`, `latitude`, `longitude`, and `location_note` when applicable.
  - Show upload progress, success, failure, and retry states.
  - Respect upload/delete photo permissions.
  - _Requirements: 8, 16, 17, 19, 20_

- [ ] 14. Build BMN verification flow
  - Add verification action on eligible asset details.
  - Use confirmation dialog before verification.
  - Call the existing verification endpoint.
  - Refresh status, verifier, and verification time after success.
  - Handle forbidden and invalid-state backend responses.
  - _Requirements: 9, 17, 19_

- [ ] 15. Build BMN loan and return flows
  - Build loan/return entry points from asset detail.
  - Use paginated employee selector for borrower/user selection.
  - Validate asset, employee, dates, and notes before submit.
  - Show loan history when permission allows it.
  - Refresh asset status after loan/return changes.
  - _Requirements: 10, 15, 17, 18, 19_

- [ ] 16. Prepare Surat Tugas mobile list and detail APIs
  - Verify personal list endpoint for regular employees.
  - Verify management list endpoint for admin/operator/pimpinan roles.
  - Ensure pagination, search, status filters, and lightweight card payloads.
  - Ensure detail endpoint returns personel, status, dates, file/download state, and allowed actions.
  - Keep backend permission and ownership checks active.
  - _Requirements: 11, 14, 17, 18, 19_

- [ ] 17. Build Surat Tugas list screen
  - Render assignment cards with nomor, kegiatan/tujuan, date range, status, and personel summary.
  - Add debounced search, status filter, pagination, pull-to-refresh, and retry.
  - Separate personal and management mode based on permission.
  - _Requirements: 11, 18, 20_

- [ ] 18. Build Surat Tugas detail screen
  - Show main assignment data, personel, dates, status, files, and available actions.
  - Show download/share action only when the user is allowed to access the file.
  - Add approval/status actions based on permission.
  - Add forbidden/not found/error states.
  - _Requirements: 11, 13, 14, 17, 19, 20_

- [ ] 19. Build Surat Tugas create/edit form
  - Build sectioned mobile form for core data, dates, location, personel, source of funds, transport, and review.
  - Use paginated employee selector.
  - Validate required fields before submit.
  - Map backend 422 errors to fields.
  - Refresh relevant list/detail after successful submit.
  - _Requirements: 12, 15, 17, 18, 20_

- [ ] 20. Build Surat Tugas approval and status actions
  - Add approve, reject, and status update buttons only for allowed users.
  - Use confirmation dialog for important transitions.
  - Handle backend permission and invalid transition errors.
  - Refresh list/detail after success.
  - _Requirements: 13, 17, 19_

- [ ] 21. Build authenticated download and share flow
  - Download Surat Tugas files through authenticated endpoints.
  - Store files only in app cache/documents as needed.
  - Open platform viewer or share sheet.
  - Handle file missing, permission denied, and network errors.
  - Avoid exposing unauthenticated private URLs.
  - _Requirements: 14, 19_

- [ ] 22. Build reusable paginated employee selector
  - Search by name and NIP.
  - Display name, NIP, jabatan, and unit kerja summary.
  - Do not load all employees at once.
  - Reuse selector in BMN loan/return and Surat Tugas forms.
  - Enforce backend permission restrictions.
  - _Requirements: 15, 18, 19, 20_

- [ ] 23. Build profile screen
  - Show user identity, employee data, role, access modules, and app session actions.
  - Add update profile and change password only if supported by current API.
  - Add logout action with confirmation.
  - Do not expose token/session data.
  - _Requirements: 2, 19, 20_

- [ ] 24. Add global online-only and app state behavior
  - Detect network availability.
  - Show offline banner or screen state for failed online requests.
  - Avoid offline mutation queues in MVP.
  - Refresh key screens when app returns to foreground.
  - _Requirements: 16, 18_

- [ ] 25. Add mobile security hardening
  - Ensure no password/token/document-sensitive values are logged.
  - Confirm production API base URL uses HTTPS.
  - Ensure secure storage cleanup on logout and 401.
  - Validate file upload type/size on backend.
  - Confirm all backend mutation endpoints enforce permissions.
  - _Requirements: 1, 8, 14, 19_

- [ ] 26. Add accessibility and UX quality pass
  - Check accessibility labels on buttons, icon buttons, inputs, cards, and tabs.
  - Verify status badges include text and do not rely on color alone.
  - Check touch target sizes.
  - Check text legibility and contrast.
  - Check loading, empty, error, retry, and success states across screens.
  - _Requirements: 20_

- [ ] 27. Add automated tests
  - Unit test API client, error normalizer, permission helpers, validation schemas, and date formatting.
  - Integration test login/logout, session restore, BMN list/detail, photo upload mocks, Surat Tugas list/detail, and permission-gated actions.
  - Add basic smoke tests for navigation.
  - _Requirements: 1, 2, 5, 6, 8, 11, 17, 19, 20_

- [ ] 28. Validate on Android devices
  - Test login as superadmin.
  - Test login as admin/operator BMN.
  - Test login as regular employee.
  - Test BMN search, detail, photo/geotag upload, verification, loan/return.
  - Test Surat Tugas list, detail, create/edit, approval, download/share.
  - Fix device-specific layout, keyboard, camera, and file viewer issues.
  - _Requirements: all MVP requirements_

- [ ] 29. Prepare internal Android release
  - Configure app icon, splash screen, package id, app name, and build profile.
  - Build internal Android APK/AAB.
  - Document installation and rollback steps.
  - Keep iOS notes for later release without blocking Android MVP.
  - _Requirements: 19, 20_

- [ ] 30. Update operational documentation and rollout notes
  - Document required API base URL, environment variables, and mobile build commands.
  - Document known out-of-scope features for MVP.
  - Document role/permission mapping used by mobile.
  - Update `docs/progress.md` after each completed implementation issue.
  - _Requirements: all MVP requirements_
