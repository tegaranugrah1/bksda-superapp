import React, { useState } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  View,
  ScrollView,
  Platform,
} from "react-native";
import {
  PORTAL_5_TOKENS,
  usePortalResponsive,
  type ThemeColors,
  useTheme,
} from "../../theme/ThemeContext";
import { AnimateUiScreen } from "../../components/motion/AnimateUi";
import { useAuth } from "../auth/AuthProvider";
import { apiClient } from "../../lib/api/client";
import { PratinjauSuratTugasModal, PratinjauSuratTugasItem } from "../../components/PratinjauSuratTugasModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";
import { ProfileSettingsModal, type ProfileSetting } from "../profile/ProfileSettingsModal";
import { FormulirCutiModal } from "./FormulirCutiModal";
import { FormulirCutiPrintModal } from "../../components/FormulirCutiPrintModal";
import { PortalNotifications, usePortalNotifications } from "./PortalNotifications";
import { createPortalStyles } from "./portalStyles";
import { DashboardData } from "./types";
import { PortalHeader, BKSDA_FOREST } from "./PortalHeader";
import { PortalBottomNav } from "./PortalBottomNav";
import { PortalHomeTab } from "./PortalHomeTab";
import { PortalQuickActionsModal } from "./PortalQuickActionsModal";
import { PortalLoansModal } from "./PortalLoansModal";
import { PortalSbmModal } from "./PortalSbmModal";
import { PortalLeaveCancelModal, PortalLeaveScanModal } from "./PortalLeaveModals";
import { PortalProfileTab } from "./PortalProfileTab";
import { PortalServicesMenu } from "./PortalServicesMenu";
import { PortalAssetsView } from "./PortalAssetsView";
import { PortalLeaveView } from "./PortalLeaveView";
import type { PortalServiceScreen } from "./portalViewTypes";
import { usePortalData } from "./usePortalData";
import { PortalTasksTab, type PortalTaskFilter } from "./PortalTasksTab";
import { PortalLeaveCardActions } from "./PortalLeaveCardActions";
import { usePortalLeaveActions } from "./usePortalLeaveActions";
export { extractSuratTugasDalamRangka } from "./portalHelpers";

interface PortalDashboardScreenProps {
  onNavigateToModule?: (moduleKey: string) => void;
  userProfile?: {
    name: string;
    nip: string;
    avatarUrl?: string;
  };
  dashboardData?: DashboardData;
  requestedTab?: "profile";
  onTabRequestHandled?: () => void;
}

// Shared portal surfaces keep Beranda, Tugas, Layanan and Profil consistent.
const PORTAL_SURFACES = {
  light: {
    bgDark: "#f1f6f0",
    cardBg: "#ffffff",
    bgSurface: "#ffffff",
    surfaceRaised: "#ffffff",
    surfaceMuted: "#eaf1e8",
    glassBorder: "#d4e2d3",
    borderControl: "#71836f",
    headerBg: "#ffffff",
    headerBorder: "#d4e2d3",
  },
  dark: {
    bgDark: "#101813",
    cardBg: "#1b2820",
    bgSurface: "#1b2820",
    surfaceRaised: "#25362b",
    surfaceMuted: "#25362b",
    glassBorder: "#3b5242",
    borderControl: "#849387",
    headerBg: "#1b2820",
    headerBorder: "#3b5242",
  },
} satisfies Record<"light" | "dark", Partial<ThemeColors>>;

export const PortalDashboardScreen: React.FC<PortalDashboardScreenProps> = ({
  onNavigateToModule,
  userProfile,
  dashboardData, requestedTab, onTabRequestHandled,
}) => {
  const isScreenFocused = useIsFocused();
  const { isDark, toggleTheme, colors: themeColors } = useTheme();
  const { user, employee, logout, refreshUser } = useAuth();
  const r = usePortalResponsive();
  const styles = React.useMemo(() => createPortalStyles(r), [r]);

  React.useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (!document.getElementById("portal-inter-font")) {
      const link = document.createElement("link");
      link.id = "portal-inter-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    const bodyStyle = document.body?.style as any;
    if (bodyStyle) {
      bodyStyle.webkitFontSmoothing = "antialiased";
      bodyStyle.mozOsxFontSmoothing = "grayscale";
    }
  }, []);

  // Bottom Navigation state: 'dashboard' | 'surattugas' | 'layanan' | 'profile'
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [profileSetting, setProfileSetting] = useState<ProfileSetting | null>(null);
  const [profilePasswordVisible, setProfilePasswordVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const notifications = usePortalNotifications();
  const [profileNotice, setProfileNotice] = useState("");
  const [failedProfilePhoto, setFailedProfilePhoto] = useState<string | null>(null);
  useFocusEffect(React.useCallback(() => {
    if (requestedTab) {setActiveTab(requestedTab);onTabRequestHandled?.();}
  }, [requestedTab, onTabRequestHandled]));
  const isDashboard = activeTab === "dashboard";
  const colors = React.useMemo(() => ({
    ...themeColors,
    ...PORTAL_SURFACES[isDark ? "dark" : "light"],
  }), [isDark, themeColors]);

  // Center FAB Quick Action Modal
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const pendingAssignmentNavigation = React.useRef(false);

  // SBM Calculator Modal
  const [sbmModalVisible, setSbmModalVisible] = useState(false);

  // Surat Tugas filter: 'all' | 'running' | 'completed'
  const [stFilter, setStFilter] = useState<PortalTaskFilter>("all");

  const [selectedPreviewSt, setSelectedPreviewSt] = useState<PratinjauSuratTugasItem | null>(null);

  const handleOpenStPreview = React.useCallback(async (stItem: any) => {
    setSelectedPreviewSt(stItem);
    if (stItem?.id) {
      try {
        const response = await apiClient.get<any>(`/surat-tugas/my/${stItem.id}`);
        const detail = response.data?.data || response.data;
        if (detail) {
          setSelectedPreviewSt(detail);
        }
      } catch {}
    }
  }, []);

  // Layanan Sub-screens: 'menu' (cards) | 'bmn' (inventaris bmn screen) | 'cuti' (riwayat cuti screen)
  const [layananSubScreen, setLayananSubScreen] = useState<PortalServiceScreen>("menu");
  const [bmnActiveTab, setBmnActiveTab] = useState<"aset" | "pinjaman">("aset");
  const [bmnViewMode, setBmnViewMode] = useState<"grid" | "list">("grid");
  const [failedBmnThumbs, setFailedBmnThumbs] = useState<Record<string, boolean>>({});
  const [bmnSearchQuery, setBmnSearchQuery] = useState("");
  const [bmnCategoryFilter, setBmnCategoryFilter] = useState<string>("all");
  const [cutiYearFilter, setCutiYearFilter] = useState<number | "all">("all");

  const [cutiModalVisible, setCutiModalVisible] = useState(false);
  const [pinjamanModalVisible, setPinjamanModalVisible] = useState(false);
  const {
    myStList, leaveRequests, leaveBalance, canFetchLeaveBalance,
    myAssetsList, activeLoansList, loanCheckNowTs,
    fetchMyLeaveRequests, fetchMyLeaveBalance, refreshAllPortalData,
  } = usePortalData(employee ?? user?.employee);

  const {
    cutiPreviewItem, setCutiPreviewItem, cutiPreviewVisible, setCutiPreviewVisible,
    cancelLeaveTarget, setCancelLeaveTarget, isCancellingLeave,
    leaveScanModal, closeLeaveScanModal, handleOpenLeaveScan, handleConfirmCancelLeave,
  } = usePortalLeaveActions({ fetchMyLeaveRequests, fetchMyLeaveBalance });

  // Dynamic user profile resolution
  const resolvedSisaCuti =
    leaveBalance?.sisa_cuti_tersedia ??
    leaveBalance?.sisa_cuti_n ??
    null;

  const summary = dashboardData?.summary;
  const stBadgeCount = summary?.active_my_letters_count || summary?.pending_my_letters_count || myStList.length || 0;
  const assetsBadgeCount = myAssetsList.length;
  const shadowXs = PORTAL_5_TOKENS.shadow.xs(isDark);
  const shadowLg = PORTAL_5_TOKENS.shadow.lg(isDark);

  const displayStList = myStList;
  const displayLeaveRequests = leaveRequests;

  const cutiPendingHari = Number(leaveBalance?.pending_cuti_tahunan ?? 0);

  const renderLeaveCardActions = (req: any, beforeModalOpen?: () => void) => (
    <PortalLeaveCardActions
      styles={styles} colors={colors} r={r} req={req} beforeModalOpen={beforeModalOpen}
      handleOpenLeaveScan={handleOpenLeaveScan} setCancelLeaveTarget={setCancelLeaveTarget}
      setCutiPreviewItem={setCutiPreviewItem} setCutiPreviewVisible={setCutiPreviewVisible} />
  );

  const isLoanOverdue = (loan: any) => {
    const st = String(loan?.status || "").toLowerCase();
    const isBorrowed = st === "dipinjam" || st === "terlambat";
    const dueRaw = loan?.due_date || loan?.tanggal_kembali;
    const dueTs = dueRaw ? new Date(dueRaw).getTime() : NaN;
    return isBorrowed && (st === "terlambat" || (!Number.isNaN(dueTs) && dueTs < loanCheckNowTs));
  };
  const handleLogout = () => setLogoutModalVisible(true);

  // Match the app-bar backing so fractional web pixels cannot expose a pale seam.
  return (
    <View testID="portal-surface" style={[styles.container, { backgroundColor: BKSDA_FOREST }]}>
      {isScreenFocused && <StatusBar style="light" />}
      {/* All portal tabs share the official ministry brand bar. */}
      <PortalHeader
        styles={styles} colors={colors} r={r} isDark={isDark} toggleTheme={toggleTheme}
        notifications={notifications} setNotificationsVisible={setNotificationsVisible} />

      <View testID="portal-body" style={[styles.portalBody, { backgroundColor: colors.bgDark }]}>
      <ScrollView
        style={styles.portalScroll}
        contentContainerStyle={[styles.scrollContent, styles.scrollContentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <AnimateUiScreen style={[styles.contentWidthWrap, isDashboard && styles.dashboardContentWidth]} transitionKey={`${activeTab}:${layananSubScreen}`}>
        {/* ========================================================================= */}
        {/* TAB 1: BERANDA PORTAL ASN (FOREST GREEN HERO, 3 MAIN CARDS, 5 TOKENS)     */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <PortalHomeTab
            styles={styles} colors={colors} r={r} shadowXs={shadowXs}
            userProfile={userProfile} user={user} employee={employee} stBadgeCount={stBadgeCount}
            resolvedSisaCuti={resolvedSisaCuti} assetsBadgeCount={assetsBadgeCount} myStList={myStList} activeLoansList={activeLoansList}
            isLoanOverdue={isLoanOverdue} onNavigateToModule={onNavigateToModule} handleOpenStPreview={handleOpenStPreview} setActiveTab={setActiveTab}
            setLayananSubScreen={setLayananSubScreen} setBmnActiveTab={setBmnActiveTab} setPinjamanModalVisible={setPinjamanModalVisible} />
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SURAT TUGAS ASN (BOTTOM NAV 2, FILTER, EYE PREVIEW, LIST ST)       */}
        {/* ========================================================================= */}
        {activeTab === "surattugas" && (
          <PortalTasksTab styles={styles} colors={colors} r={r} shadowXs={shadowXs}
            displayStList={displayStList} stFilter={stFilter} setStFilter={setStFilter}
            handleOpenStPreview={handleOpenStPreview} />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LAYANAN TERPADU ASN (MENU, SUB-SCREEN BMN, SUB-SCREEN CUTI)        */}
        {/* ========================================================================= */}
        {activeTab === "layanan" && (
          <>
            {/* SUB-VIEW 1: MENU UTAMA 4 KARTU LAYANAN */}
            {layananSubScreen === "menu" && (
              <PortalServicesMenu
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                myAssetsList={myAssetsList} activeLoansList={activeLoansList} resolvedSisaCuti={resolvedSisaCuti} displayLeaveRequests={displayLeaveRequests}
                setLayananSubScreen={setLayananSubScreen} setBmnActiveTab={setBmnActiveTab} setSbmModalVisible={setSbmModalVisible} />
            )}
            {/* SUB-VIEW 2: DEDICATED FULL SCREEN INVENTARIS BMN SAYA */}
            {layananSubScreen === "bmn" && (
              <PortalAssetsView
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                myAssetsList={myAssetsList} activeLoansList={activeLoansList} bmnActiveTab={bmnActiveTab} bmnSearchQuery={bmnSearchQuery}
                bmnCategoryFilter={bmnCategoryFilter} bmnViewMode={bmnViewMode} failedBmnThumbs={failedBmnThumbs} loanCheckNowTs={loanCheckNowTs}
                isLoanOverdue={isLoanOverdue} setLayananSubScreen={setLayananSubScreen} setBmnActiveTab={setBmnActiveTab} setBmnSearchQuery={setBmnSearchQuery}
                setBmnCategoryFilter={setBmnCategoryFilter} setBmnViewMode={setBmnViewMode} setFailedBmnThumbs={setFailedBmnThumbs} />
            )}
            {/* SUB-VIEW 3: DEDICATED FULL SCREEN RIWAYAT PENGAJUAN CUTI */}
            {layananSubScreen === "cuti" && (
              <PortalLeaveView
                styles={styles} colors={colors} r={r} shadowXs={shadowXs}
                leaveBalance={leaveBalance} resolvedSisaCuti={resolvedSisaCuti} cutiPendingHari={cutiPendingHari} cutiYearFilter={cutiYearFilter}
                displayLeaveRequests={displayLeaveRequests} setLayananSubScreen={setLayananSubScreen} setCutiModalVisible={setCutiModalVisible} setCutiYearFilter={setCutiYearFilter}
                renderLeaveCardActions={renderLeaveCardActions} />
            )}

          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROFIL PEGAWAI ASN (BOTTOM NAV 5: PALING AKHIR, LOGOUT)            */}
        {/* ========================================================================= */}
        {activeTab === "profile" && (
          <PortalProfileTab
            styles={styles} colors={colors} r={r} shadowXs={shadowXs}
            user={user} employee={employee} leaveBalance={leaveBalance} canFetchLeaveBalance={canFetchLeaveBalance}
            myAssetsList={myAssetsList} activeLoansList={activeLoansList} failedProfilePhoto={failedProfilePhoto} setFailedProfilePhoto={setFailedProfilePhoto}
            profileNotice={profileNotice} setProfileNotice={setProfileNotice} setProfileSetting={setProfileSetting} setActiveTab={setActiveTab}
            setLayananSubScreen={setLayananSubScreen} setProfilePasswordVisible={setProfilePasswordVisible} refreshUser={refreshUser} refreshAllPortalData={refreshAllPortalData}
            handleLogout={handleLogout} />
        )}
        </AnimateUiScreen>
      </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* FLOATING BOTTOM NAVIGATION (EXACT 5 ITEMS: BERANDA, TUGAS, FAB, LAYANAN, PROFIL) */}
      {/* ========================================================================= */}
      <PortalBottomNav
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        activeTab={activeTab} stBadgeCount={stBadgeCount} assetsBadgeCount={assetsBadgeCount}
        setActiveTab={setActiveTab} setLayananSubScreen={setLayananSubScreen} setFabModalVisible={setFabModalVisible} />

      <PortalNotifications visible={notificationsVisible} model={notifications} onClose={() => setNotificationsVisible(false)} onSelect={type => {
        if(type === "surat_tugas") setActiveTab("surattugas");
        else if(type === "cuti" || type === "bmn") {setActiveTab("layanan");setLayananSubScreen(type === "cuti" ? "cuti" : "bmn");}
      }} />
      <ConfirmModal visible={logoutModalVisible} title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari SuperApp BKSDA Kaltim?"
        confirmText="Ya, Keluar" cancelText="Batal" variant="danger"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={() => {setLogoutModalVisible(false);void logout();}} />
      {profileSetting && <ProfileSettingsModal mode={profileSetting} onClose={() => setProfileSetting(null)} onSaved={message => {setProfileSetting(null);setProfileNotice(message);}} />}
      <ChangePasswordModal visible={profilePasswordVisible} onClose={() => setProfilePasswordVisible(false)} onSuccessLogout={() => {void logout();}} />

      {/* ========================================================================= */}
      {/* QUICK ACTION MODAL BOTTOM SHEET (CENTER FAB)                              */}
      {/* ========================================================================= */}
      <PortalQuickActionsModal
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        fabModalVisible={fabModalVisible} setFabModalVisible={setFabModalVisible} pendingAssignmentNavigation={pendingAssignmentNavigation} setCutiModalVisible={setCutiModalVisible}
        resolvedSisaCuti={resolvedSisaCuti} onNavigateToModule={onNavigateToModule} />

      {/* ========================================================================= */}
      {/* PINJAMAN BMN AKTIF MODAL (PERSONAL LOANS LIST)                             */}
      {/* ========================================================================= */}
      <PortalLoansModal
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        pinjamanModalVisible={pinjamanModalVisible} setPinjamanModalVisible={setPinjamanModalVisible} activeLoansList={activeLoansList} />

      {/* ========================================================================= */}
      {/* SBM CALCULATOR MODAL                                                      */}
      {/* ========================================================================= */}
      <PortalSbmModal
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        sbmModalVisible={sbmModalVisible} setSbmModalVisible={setSbmModalVisible} />

      {/* Official Print Preview Modal Presisi Web Portal */}
      <PratinjauSuratTugasModal
        visible={!!selectedPreviewSt}
        data={selectedPreviewSt}
        onClose={() => setSelectedPreviewSt(null)}
      />

      {/* Formulir Pengajuan Cuti Baru Modal */}
      <FormulirCutiModal
        visible={cutiModalVisible}
        balanceAvailable={resolvedSisaCuti != null}
        sisaCuti={Number(leaveBalance?.sisa_cuti_dapat_diajukan ?? Math.max(0, (resolvedSisaCuti ?? 0) - cutiPendingHari))}
        pendingCutiHari={cutiPendingHari}
        onClose={() => setCutiModalVisible(false)}
        onSuccess={() => {
          fetchMyLeaveRequests();
          fetchMyLeaveBalance();
        }}
      />

      <FormulirCutiPrintModal
        visible={cutiPreviewVisible}
        data={cutiPreviewItem}
        onClose={() => setCutiPreviewVisible(false)}
      />

      {/* Confirm Cancel Leave Request Modal */}
      <PortalLeaveCancelModal
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        cancelLeaveTarget={cancelLeaveTarget} isCancellingLeave={isCancellingLeave} setCancelLeaveTarget={setCancelLeaveTarget} handleConfirmCancelLeave={handleConfirmCancelLeave} />

      {/* Official Scan Document Preview Modal (Surat Izin TTE / Formulir Scan) */}
      <PortalLeaveScanModal
        styles={styles} colors={colors} r={r} shadowLg={shadowLg}
        leaveScanModal={leaveScanModal} closeLeaveScanModal={closeLeaveScanModal} />
    </View>
  );
};
