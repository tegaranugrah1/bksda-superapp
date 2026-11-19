import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import type { PortalViewProps, PortalServiceScreen } from "./portalViewTypes";
import type { Employee, User } from "@/types/auth";
import type { ProfileSetting } from "@/features/profile/ProfileSettingsModal";
import { resolveMobilePhotoUrl } from "./portalAssetHelpers";

interface PortalProfileTabProps extends PortalViewProps {
  user: User | null;
  employee: Employee | null;
  leaveBalance: any;
  canFetchLeaveBalance: boolean;
  myAssetsList: any[];
  activeLoansList: any[];
  failedProfilePhoto: string | null;
  setFailedProfilePhoto: (value: string | null) => void;
  profileNotice: string;
  setProfileNotice: (value: string) => void;
  setProfileSetting: (value: ProfileSetting | null) => void;
  setActiveTab: (value: string) => void;
  setLayananSubScreen: (value: PortalServiceScreen) => void;
  setProfilePasswordVisible: (value: boolean) => void;
  refreshUser: () => Promise<void>;
  refreshAllPortalData: () => void;
  handleLogout: () => void;
}

export function PortalProfileTab({
  styles, colors, r, shadowXs,
  user, employee, leaveBalance, canFetchLeaveBalance,
  myAssetsList, activeLoansList, failedProfilePhoto, setFailedProfilePhoto,
  profileNotice, setProfileNotice, setProfileSetting, setActiveTab,
  setLayananSubScreen, setProfilePasswordVisible, refreshUser, refreshAllPortalData,
  handleLogout,
}: PortalProfileTabProps) {
  const profileEmployee = employee || user?.employee;
  const profileName = profileEmployee?.name || user?.name || "Pengguna BKSDA";
  const profilePhoto = resolveMobilePhotoUrl(profileEmployee?.photo);
  const profileLeaveDays = leaveBalance?.sisa_cuti_tersedia ?? leaveBalance?.sisa_cuti_n;
  const profileLeaveLabel = !canFetchLeaveBalance ? "Tidak tersedia" : profileLeaveDays == null ? "Belum tersedia" : `${profileLeaveDays} Hari Kerja`;

  return (
    <>
      <View style={styles.pageHeaderCol}>
        <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Profil Pegawai</Text>
        <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
          Identitas, kontak dan pengaturan akun Balai KSDA Kaltim
        </Text>
      </View>

      {/* Profile Hero Card */}
      <GlassCard style={[styles.profileHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ubah foto profil" disabled={!profileEmployee} onPress={() => setProfileSetting("photo")} style={[styles.profileAvatarBig, { backgroundColor: colors.accentSolid }]}>
          {profilePhoto && failedProfilePhoto !== profilePhoto ? <Image source={{uri:profilePhoto}} style={styles.profilePhoto} accessibilityLabel={`Foto ${profileName}`} onError={() => setFailedProfilePhoto(profilePhoto)} /> : <Text style={[styles.profileAvatarText, { color: colors.accentOnSolid }]}>{profileName.charAt(0).toUpperCase()}</Text>}
          {!!profileEmployee && <View style={[styles.profileCamera, {backgroundColor:colors.cardBg,borderColor:colors.glassBorder}]}><Ionicons name="camera-outline" size={16} color={colors.accentFg} /></View>}
        </TouchableOpacity>
        <View style={styles.profileHeroMain}>
          <Text style={[styles.profileHeroName, { color: colors.textDark }]}>{profileName}</Text>
          <Text selectable style={[styles.profileHeroNip, { color: colors.textMuted }]}>{profileEmployee?.nip ? `NIP: ${profileEmployee.nip}` : `Username: ${user?.username || "—"}`}</Text>
          <Text style={[styles.profileHeroJabatan, { color: colors.accentFg }]}>{profileEmployee?.position || "Jabatan belum diisi"}</Text>
          <Text style={[styles.profileHeroUnit, { color: colors.textMuted }]}>{profileEmployee?.department || (profileEmployee ? "Unit kerja belum diisi" : "Akun belum terhubung dengan data pegawai")}</Text>
        </View>
      </GlassCard>

      {/* 2 Metric Pills in Profile */}
      <View style={styles.profileMetricsRow}>
        <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
          <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>SISA CUTI TAHUNAN</Text>
          <Text style={[styles.profileMetricValue, { color: colors.warningFg }]}>{profileLeaveLabel}</Text>
        </GlassCard>
        <GlassCard style={[styles.profileMetricBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
          <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>TOTAL ASET DIPEGANG</Text>
          <Text style={[styles.profileMetricValue, { color: colors.accentFg }]}>
            {`${myAssetsList.length} Aset (${activeLoansList.length} Pinjaman)`}
          </Text>
        </GlassCard>
      </View>

      {!!profileNotice && <Text accessibilityLiveRegion="polite" style={[styles.profileContactValue,{color:colors.accentFg,marginBottom:12}]}>{profileNotice}</Text>}
      <GlassCard style={[styles.profileContactCard,{backgroundColor:colors.cardBg,borderColor:colors.glassBorder},shadowXs]}>
        <View style={styles.profileContactHeading}><Text style={[styles.profileContactTitle,{color:colors.textDark}]}>Informasi kontak</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit informasi kontak" onPress={() => {setProfileNotice("");setProfileSetting("contact");}} style={styles.profileEditButton}><Ionicons name="create-outline" size={21} color={colors.accentFg}/></TouchableOpacity></View>
        {[["Email",profileEmployee?.email || user?.email],["Telepon",profileEmployee?.phone],["Username",user?.username]].map(([label,value])=><View key={label} style={styles.profileContactRow}><Text style={[styles.profileContactLabel,{color:colors.textMuted}]}>{label}</Text><Text selectable style={[styles.profileContactValue,{color:colors.textDark}]}>{value || "Belum diisi"}</Text></View>)}
      </GlassCard>

      {/* Profile Menu Actions List */}
      <View style={styles.profileMenuStack}>
        {[
          {
            label: "Data Pangkat, Jabatan & Unit Kerja",
            icon: "ribbon-outline",
            color: colors.infoFg,
            action: () => setProfileSetting("employment"),
          },
          {
            label: "Riwayat Surat Tugas & SPPD",
            icon: "document-text-outline",
            color: colors.accentFg,
            action: () => setActiveTab("surattugas"),
          },
          {
            label: "Riwayat Pengajuan Cuti Online",
            icon: "calendar-outline",
            color: colors.warningFg,
            action: () => {setActiveTab("layanan");setLayananSubScreen("cuti");},
          },
          {
            label: "Keamanan Akun & Ubah Kata Sandi",
            icon: "shield-checkmark-outline",
            color: colors.textSecondary,
            action: () => setProfilePasswordVisible(true),
          },
          {
            label: "Perbarui Data Profil",
            icon: "refresh-outline",
            color: colors.accentFg,
            action: async () => {await refreshUser();refreshAllPortalData();setProfileNotice("Data profil diperbarui.");},
          },
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.action}
          >
            <GlassCard style={[styles.profileMenuItem, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
              <Ionicons name={item.icon as any} size={r.size.iconMd} color={item.color} style={styles.btnIcon} />
              <Text style={[styles.profileMenuItemLabel, { color: colors.textDark }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }, shadowXs]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Keluar Akun (Logout)"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={r.size.iconMd} color={colors.dangerFg} style={styles.btnIcon} />
        <Text style={[styles.logoutBtnText, { color: colors.dangerFg }]}>Keluar Akun (Logout)</Text>
      </TouchableOpacity>
    </>
  );
}
