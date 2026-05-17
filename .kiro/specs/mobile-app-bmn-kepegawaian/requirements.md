# Requirements Document

## Introduction

Mobile application for BKSDA Kalimantan Timur SuperApp that provides field staff access to BMN (Barang Milik Negara / State Asset Management) and Kepegawaian (Surat Tugas / Assignment Letters) modules. The app connects to the existing Laravel backend API (`/api/`) using Sanctum token-based authentication, enabling staff to manage assets and assignment letters from mobile devices in the field.

## Glossary

- **Mobile_App**: The cross-platform mobile application (React Native) for BKSDA field staff
- **Backend_API**: The existing Laravel API server at `/api/` with Sanctum authentication
- **BMN_Module**: Barang Milik Negara module — state asset management system tracking 1613+ assets with 80 data columns
- **Kepegawaian_Module**: HR module for Surat Tugas (assignment letters) with submission, approval, and distribution workflows
- **Surat_Tugas**: Official assignment letter (ST) issued to employees for field duties
- **Field_Staff**: BKSDA employees who operate in the field and need mobile access to their assets and assignments
- **Asset_Photo**: Geotagged photograph of a BMN asset taken from one of 5 angles (Depan/Geotag, Belakang, Kiri, Kanan, Lokasi Barang)
- **Portal_Dashboard**: The home screen showing user's borrowed assets, assigned assets, and approved Surat Tugas
- **Sanctum_Token**: Laravel Sanctum bearer token used for API authentication
- **STNK_Countdown**: Vehicle tax expiry countdown for motorized BMN assets

## Requirements

### Requirement 1: Authentication

**User Story:** As a field staff member, I want to log in to the mobile app with my existing credentials, so that I can securely access my work data on mobile.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (NIP and password), THE Mobile_App SHALL authenticate via `POST /api/login` and store the returned Sanctum_Token securely on the device
2. WHEN a user opens the Mobile_App with a valid stored Sanctum_Token, THE Mobile_App SHALL skip the login screen and navigate directly to the Portal_Dashboard
3. WHEN the Backend_API returns a 401 Unauthorized response, THE Mobile_App SHALL clear the stored token and redirect the user to the login screen
4. WHEN a user taps the logout button, THE Mobile_App SHALL call `POST /api/logout`, clear the local Sanctum_Token, and return to the login screen
5. IF the device has no network connection during login, THEN THE Mobile_App SHALL display an informative error message indicating no connectivity

### Requirement 2: Portal Dashboard (Home Screen)

**User Story:** As a field staff member, I want to see a summary of my assets and assignments on the home screen, so that I can quickly access what I need.

#### Acceptance Criteria

1. WHEN the Portal_Dashboard loads, THE Mobile_App SHALL fetch and display the user's profile information (nama, NIP, jabatan, unit kerja) from `GET /api/user`
2. WHEN the Portal_Dashboard loads, THE Mobile_App SHALL display three tabs: "Aset Saya", "Pinjaman Aktif", and "Surat Tugas" with dynamic count badges
3. WHEN the user selects the "Aset Saya" tab, THE Mobile_App SHALL display a list of assets assigned to the current user via `GET /api/bmn/assets?pengguna={user_name}`
4. WHEN the user selects the "Pinjaman Aktif" tab, THE Mobile_App SHALL display active loans associated with the current user via `GET /api/bmn/loans?status=active`
5. WHEN the user selects the "Surat Tugas" tab, THE Mobile_App SHALL display approved assignment letters for the current user via `GET /api/surat-tugas?employee_id={id}&status=approved`
6. THE Mobile_App SHALL support pull-to-refresh on the Portal_Dashboard to reload all tab data

### Requirement 3: BMN Asset List and Search

**User Story:** As a field staff member, I want to browse and search my organization's assets, so that I can find specific items quickly in the field.

#### Acceptance Criteria

1. WHEN the user navigates to the BMN asset list, THE Mobile_App SHALL fetch paginated assets from `GET /api/bmn/assets` and display them in a scrollable list
2. WHEN the user types in the search field, THE Mobile_App SHALL filter assets by nama barang, kode barang, merk, or no polisi via the API search parameter
3. WHEN the user applies a filter (Jenis BMN, Lokasi Ruang, Kondisi), THE Mobile_App SHALL pass the filter parameters to the API and display filtered results
4. THE Mobile_App SHALL display each asset card with: nama barang, kode barang, merk/tipe, lokasi (shortened), kondisi badge, and verification status badge
5. WHEN the user scrolls to the bottom of the asset list, THE Mobile_App SHALL load the next page of results (infinite scroll pagination)

### Requirement 4: BMN Asset Detail

**User Story:** As a field staff member, I want to view full details of an asset, so that I can verify and inspect assets during field operations.

#### Acceptance Criteria

1. WHEN the user taps an asset in the list, THE Mobile_App SHALL fetch full asset details from `GET /api/bmn/assets/{id}` and display them in a detail screen
2. THE Mobile_App SHALL organize asset details into collapsible sections: Identitas, Lokasi, Dokumen, Nilai, and Organisasi
3. WHEN the asset is a vehicle (has no_polisi), THE Mobile_App SHALL display STNK_Countdown information showing days until tax expiry
4. THE Mobile_App SHALL display the asset's photo gallery with all available photos (up to 5 angles) in a swipeable carousel
5. WHEN the user taps a photo in the gallery, THE Mobile_App SHALL display the photo in a full-screen lightbox with pinch-to-zoom capability

### Requirement 5: Asset Photo Capture

**User Story:** As a field staff member, I want to take geotagged photos of assets from my mobile device, so that I can update asset documentation while in the field.

#### Acceptance Criteria

1. WHEN the user taps the camera button on an asset detail screen, THE Mobile_App SHALL open the device camera with a photo angle selector (Depan/Geotag, Belakang, Kiri, Kanan, Lokasi Barang)
2. WHEN a photo is captured, THE Mobile_App SHALL embed the current GPS coordinates (latitude, longitude) in the image EXIF metadata
3. WHEN a photo is captured and confirmed, THE Mobile_App SHALL upload the photo to `POST /api/bmn/assets/{id}/photos` with the selected angle and geolocation data
4. IF the device GPS is disabled when the user attempts to capture a photo, THEN THE Mobile_App SHALL prompt the user to enable location services before proceeding
5. IF the photo upload fails due to network issues, THEN THE Mobile_App SHALL queue the photo for upload and retry when connectivity is restored
6. WHEN a photo upload is queued for retry, THE Mobile_App SHALL display a pending upload indicator on the asset and in a dedicated upload queue screen

### Requirement 6: BMN Asset Verification

**User Story:** As a field staff member, I want to verify assets directly from my mobile device, so that I can confirm asset condition during field inspections.

#### Acceptance Criteria

1. WHEN the user taps the "Verifikasi" button on an unverified asset, THE Mobile_App SHALL call `POST /api/bmn/assets/{id}/verify` and update the verification badge
2. WHEN an asset is successfully verified, THE Mobile_App SHALL display the verification timestamp and the verifier's name on the asset detail screen
3. THE Mobile_App SHALL visually distinguish verified assets from unverified assets in the asset list using a badge or icon

### Requirement 7: Surat Tugas List and View

**User Story:** As a field staff member, I want to view my assignment letters on mobile, so that I can reference them while traveling or in the field.

#### Acceptance Criteria

1. WHEN the user navigates to the Surat Tugas list, THE Mobile_App SHALL fetch assignment letters from `GET /api/surat-tugas` filtered by the current user's employee_id
2. THE Mobile_App SHALL display each Surat Tugas card with: nomor surat, kegiatan (activity name), tanggal berangkat, tanggal kembali, and status badge (draft/pending/approved)
3. WHEN the user taps a Surat Tugas, THE Mobile_App SHALL display the full letter content including: dasar surat, menimbang, personil list, tujuan, and tembusan
4. WHEN the user taps the download button on an approved Surat Tugas, THE Mobile_App SHALL download the PDF file and open it with the device's default PDF viewer
5. WHEN the user taps the share button, THE Mobile_App SHALL allow sharing the Surat Tugas PDF via the device's native share sheet

### Requirement 8: Surat Tugas Submission

**User Story:** As a field staff member, I want to submit new Surat Tugas requests from my mobile device, so that I can initiate assignment letters without returning to the office.

#### Acceptance Criteria

1. WHEN the user taps "Ajukan ST Baru", THE Mobile_App SHALL display a submission form with fields: kegiatan, dasar surat, tujuan, tanggal berangkat, tanggal kembali, sumber dana, and transportasi
2. WHEN the user fills in the kegiatan field with text containing "konflik", THE Mobile_App SHALL auto-fill klasifikasi with "KSA.03.01"
3. WHEN the user submits a valid ST form, THE Mobile_App SHALL send the data to `POST /api/surat-tugas` and display a success confirmation
4. WHEN a Surat Tugas is successfully submitted, THE Mobile_App SHALL set its status to "draft" and show it in the user's Surat Tugas list
5. IF required fields are empty when the user attempts to submit, THEN THE Mobile_App SHALL highlight the missing fields with validation error messages

### Requirement 9: Offline Capabilities

**User Story:** As a field staff member working in remote areas with limited connectivity, I want to access previously loaded data offline, so that I can continue working without internet.

#### Acceptance Criteria

1. THE Mobile_App SHALL cache the most recently loaded asset list, asset details, and Surat Tugas data for offline viewing
2. WHILE the device has no network connection, THE Mobile_App SHALL display cached data with a visible "Offline Mode" indicator
3. WHILE the device has no network connection, THE Mobile_App SHALL allow photo capture and queue uploads for later synchronization
4. WHEN network connectivity is restored, THE Mobile_App SHALL automatically synchronize queued photo uploads and pending submissions
5. IF a data conflict occurs during synchronization, THEN THE Mobile_App SHALL display the conflict to the user and allow manual resolution

### Requirement 10: Push Notifications

**User Story:** As a field staff member, I want to receive notifications about my assignments and asset updates, so that I stay informed without constantly checking the app.

#### Acceptance Criteria

1. WHEN a Surat Tugas assigned to the user changes status (draft → pending → approved), THE Mobile_App SHALL display a push notification with the ST number and new status
2. WHEN a vehicle asset's STNK_Countdown reaches 30 days before expiry, THE Mobile_App SHALL send a reminder notification to the assigned user
3. WHEN the user taps a push notification, THE Mobile_App SHALL navigate directly to the relevant Surat Tugas or asset detail screen
4. THE Mobile_App SHALL allow users to configure notification preferences (enable/disable per notification type) in a settings screen

### Requirement 11: App Navigation and UX

**User Story:** As a field staff member, I want intuitive navigation between modules, so that I can work efficiently on mobile.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide a bottom tab navigation with tabs: Beranda (Portal Dashboard), BMN (asset list), Surat Tugas (ST list), and Profil (settings)
2. THE Mobile_App SHALL support both light and dark display modes, following the device system preference
3. THE Mobile_App SHALL display loading indicators during API calls and provide skeleton placeholders for content areas
4. WHEN an API call fails with a non-401 error, THE Mobile_App SHALL display a user-friendly error message with a retry option
5. THE Mobile_App SHALL support the Indonesian language (Bahasa Indonesia) for all user interface labels and messages
