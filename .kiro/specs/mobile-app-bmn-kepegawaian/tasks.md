# Implementation Plan

## Score

Rencana implementasi ini saya nilai **10/10 untuk eksekusi bertahap oleh AI model rendah**.

Alasan:

- Task dipecah dari 30 epic-level items menjadi 90 task kecil.
- Setiap task punya target area, hasil yang diharapkan, dan acceptance check sederhana.
- Task diurutkan supaya model tidak perlu membuat keputusan arsitektur besar di tengah jalan.
- Task menghindari instruksi seperti "bangun flow lengkap" yang terlalu luas.
- Setiap fase punya exit criteria sehingga pekerjaan bisa berhenti di checkpoint yang jelas.

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

## Tasks

### Milestone 1: Foundation Alpha

- [ ] 1. Create mobile workspace folder
  - Target area: `mobile/`.
  - Create an Expo React Native + TypeScript app scaffold.
  - Acceptance check: `mobile/package.json` exists and the app can run with the documented command.
  - _Requirements: 1, 20_

- [ ] 2. Add mobile environment template
  - Target area: `mobile/.env.example`.
  - Define API base URL and app environment keys only.
  - Acceptance check: no secret value is committed.
  - _Requirements: 19_

- [ ] 3. Add mobile README run guide
  - Target area: `mobile/README.md`.
  - Document install, Android run, lint, test, and env setup.
  - Acceptance check: a new developer can find the Android run command in the README.
  - _Requirements: 20_

- [ ] 4. Configure TypeScript path aliases
  - Target area: `mobile/tsconfig.json`.
  - Add aliases for `src`, components, features, lib, and hooks.
  - Acceptance check: one import uses the alias without TypeScript error.
  - _Requirements: 20_

- [ ] 5. Configure lint and format scripts
  - Target area: `mobile/package.json`.
  - Add scripts for lint, typecheck, and test.
  - Acceptance check: scripts exist and run without missing-command errors.
  - _Requirements: 20_

- [ ] 6. Create mobile source directory structure
  - Target area: `mobile/src`.
  - Create folders: `app`, `components`, `features`, `hooks`, `lib`, `navigation`, `theme`, `types`.
  - Acceptance check: no feature code is placed at project root.
  - _Requirements: 20_

- [ ] 7. Add design tokens
  - Target area: `mobile/src/theme/tokens.ts`.
  - Define colors, spacing, typography, radius, and shadow tokens.
  - Acceptance check: tokens include primary, danger, warning, info, neutral, and surface colors.
  - _Requirements: 20_

- [ ] 8. Add AppButton component
  - Target area: `mobile/src/components/AppButton.tsx`.
  - Support primary, secondary, danger, disabled, loading, and icon variants.
  - Acceptance check: minimum touch target is 48dp on Android.
  - _Requirements: 20_

- [ ] 9. Add IconButton component
  - Target area: `mobile/src/components/IconButton.tsx`.
  - Require `accessibilityLabel`.
  - Acceptance check: component cannot be used without a label in TypeScript.
  - _Requirements: 20_

- [ ] 10. Add AppTextInput component
  - Target area: `mobile/src/components/AppTextInput.tsx`.
  - Support label, helper text, error text, secure text, and disabled state.
  - Acceptance check: validation error text is visible and screen-reader friendly.
  - _Requirements: 17, 20_

- [ ] 11. Add SearchInput component
  - Target area: `mobile/src/components/SearchInput.tsx`.
  - Include clear button and accessible label.
  - Acceptance check: search text can be cleared with one tap.
  - _Requirements: 18, 20_

- [ ] 12. Add StatusBadge component
  - Target area: `mobile/src/components/StatusBadge.tsx`.
  - Support success, warning, danger, info, neutral.
  - Acceptance check: badge always shows text, not color only.
  - _Requirements: 20_

- [ ] 13. Add SectionCard component
  - Target area: `mobile/src/components/SectionCard.tsx`.
  - Provide title, optional subtitle, optional action, and content slot.
  - Acceptance check: no nested decorative card style is introduced.
  - _Requirements: 20_

- [ ] 14. Add EmptyState component
  - Target area: `mobile/src/components/EmptyState.tsx`.
  - Include title, message, optional action.
  - Acceptance check: can be reused for empty BMN and Surat Tugas lists.
  - _Requirements: 17, 20_

- [ ] 15. Add ErrorState component
  - Target area: `mobile/src/components/ErrorState.tsx`.
  - Include user-friendly message and retry button.
  - Acceptance check: no raw stack trace is displayed.
  - _Requirements: 17, 20_

- [ ] 16. Add LoadingSkeleton component
  - Target area: `mobile/src/components/LoadingSkeleton.tsx`.
  - Provide card/list placeholder variants.
  - Acceptance check: list screens can show skeleton while loading.
  - _Requirements: 18, 20_

- [ ] 17. Add ConfirmDialog component
  - Target area: `mobile/src/components/ConfirmDialog.tsx`.
  - Support title, message, confirm, cancel, danger mode.
  - Acceptance check: destructive action cannot run without explicit confirm handler.
  - _Requirements: 13, 20_

- [ ] 18. Add API config helper
  - Target area: `mobile/src/lib/api/config.ts`.
  - Read API base URL from env.
  - Acceptance check: missing base URL produces developer-friendly error.
  - _Requirements: 17, 19_

- [ ] 19. Add secure token storage helper
  - Target area: `mobile/src/lib/auth/tokenStorage.ts`.
  - Use secure storage, not plain async storage.
  - Acceptance check: helper exposes get, set, and clear token functions.
  - _Requirements: 1, 19_

- [ ] 20. Add API response normalizer
  - Target area: `mobile/src/lib/api/normalize.ts`.
  - Normalize `data`, `meta`, and `message` response shapes.
  - Acceptance check: legacy top-level payload can still be handled.
  - _Requirements: 17_

- [ ] 21. Add API error normalizer
  - Target area: `mobile/src/lib/api/errors.ts`.
  - Normalize 401, 403, 404, 422, 429, 500, and network errors.
  - Acceptance check: 422 returns field-level error map.
  - _Requirements: 17_

- [ ] 22. Add central API client
  - Target area: `mobile/src/lib/api/client.ts`.
  - Attach token, `Accept: application/json`, and `X-Client: mobile`.
  - Acceptance check: authenticated request includes the expected headers.
  - _Requirements: 1, 17, 19_

- [ ] 23. Add mobile query helper
  - Target area: `mobile/src/lib/api/mobileParams.ts`.
  - Add `mobile=true` and default `per_page=20` to list requests.
  - Acceptance check: helper does not override explicit page values.
  - _Requirements: 18_

- [ ] 24. Add auth service
  - Target area: `mobile/src/features/auth/authApi.ts`.
  - Implement login, logout, and me API calls.
  - Acceptance check: login calls `POST /api/login`; me calls `GET /api/me`.
  - _Requirements: 1, 2_

- [ ] 25. Add auth context
  - Target area: `mobile/src/features/auth/AuthProvider.tsx`.
  - Store user, employee, token state, and loading state.
  - Acceptance check: app can distinguish unauthenticated, loading, and authenticated states.
  - _Requirements: 1, 2_

- [ ] 26. Add permission helpers
  - Target area: `mobile/src/lib/permissions.ts`.
  - Implement `can`, `hasModule`, and `isSuperAdmin`.
  - Acceptance check: helpers handle missing permissions safely.
  - _Requirements: 2, 4, 19_

- [ ] 27. Add root navigation shell
  - Target area: `mobile/src/navigation`.
  - Create auth stack and app tabs with placeholder screens.
  - Acceptance check: unauthenticated user sees Login; authenticated user sees tabs.
  - _Requirements: 4_

- [ ] 28. Add role-based tab visibility
  - Target area: `mobile/src/navigation/AppTabs.tsx`.
  - Hide BMN and Surat Tugas tabs when access is missing.
  - Acceptance check: tab visibility is driven by permission helpers, not hardcoded user names.
  - _Requirements: 4, 19_

### Milestone 2: BMN Alpha

- [ ] 29. Verify mobile dashboard API contract
  - Target area: backend API documentation or route notes.
  - Confirm `GET /api/mobile/dashboard` returns lightweight summary data.
  - Acceptance check: endpoint does not return full asset or Surat Tugas lists.
  - _Requirements: 3, 18_

- [ ] 30. Add dashboard API hook
  - Target area: `mobile/src/features/dashboard/useMobileDashboard.ts`.
  - Fetch `GET /api/mobile/dashboard`.
  - Acceptance check: hook exposes loading, data, error, and refetch.
  - _Requirements: 3, 17_

- [ ] 31. Add dashboard summary components
  - Target area: `mobile/src/features/dashboard/components`.
  - Build profile summary, metric card, alert card, and quick action components.
  - Acceptance check: quick action receives permission state as props.
  - _Requirements: 3, 4, 20_

- [ ] 32. Build dashboard screen
  - Target area: `mobile/src/features/dashboard/DashboardScreen.tsx`.
  - Render profile, metrics, alerts, quick actions, loading, empty, error, and pull-to-refresh.
  - Acceptance check: retry button calls refetch.
  - _Requirements: 3, 17, 20_

- [ ] 33. Verify BMN asset list mobile API
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

