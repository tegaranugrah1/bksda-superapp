import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../auth/AuthProvider";
import { FabMenu } from "../../components/ui/FabMenu";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onLogout,
  onNavigateToModule,
}) => {
  const { isDark, colors } = useTheme();
  const { user, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const officerName = user?.name || user?.employee?.name || "Super Admin System";
  const officerNip = user?.username || user?.employee?.nip || "superadmin";
  const officerEmail = user?.email || "superadmin@bksdakaltim.net";

  const profileDetails = [
    { label: "JABATAN", value: user?.employee?.position || "-", icon: "finger-print-outline", color: "#10b981" },
    { label: "UNIT KERJA", value: "-", icon: "business-outline", color: "#3b82f6" },
    { label: "SISA CUTI (2026)", value: "12 Hari Kerja", icon: "calendar-outline", color: "#f97316" },
    { label: "EMAIL", value: officerEmail, icon: "mail-outline", color: "#ef4444" },
    { label: "TELEPON", value: "-", icon: "call-outline", color: "#0d9488" },
  ];

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    if (logout) await logout();
    if (onLogout) onLogout();
  };

  const handlePressBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToModule) {
      onNavigateToModule("home");
    }
  };

  const handleSelectNavTab = (tabKey: string) => {
    if (onNavigateToModule) {
      onNavigateToModule(tabKey);
    } else if (tabKey === "home" && onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header with Clickable Back Button */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handlePressBack}
          style={styles.backBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
          <Text style={[styles.backText, { color: colors.textDark }]}> Kembali</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Profil Pengguna</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <GlassCard style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* Avatar Circle */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>S</Text>
          </View>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#10b981" style={{ marginRight: 4 }} />
            <Text style={styles.statusBadgeText}>AKTIF</Text>
          </View>

          <Text style={[styles.profileName, { color: colors.textDark }]}>{officerName}</Text>
          <Text style={[styles.profileNip, { color: colors.textMuted }]}>NIP {officerNip}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Super Admin</Text>
          </View>
        </GlassCard>

        {/* Details Card */}
        <GlassCard style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {profileDetails.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.detailRow,
                index < profileDetails.length - 1 && styles.detailRowBorder,
              ]}
            >
              <View style={[styles.detailIconBg, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f8fafc" }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: colors.textDark }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.changePasswordBtn, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
          onPress={() => Alert.alert("Ganti Password", "Formulir ubah kata sandi akun.")}
          activeOpacity={0.8}
        >
          <Ionicons name="key-outline" size={18} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.changePasswordText}>Ganti Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button (FAB ☰ Menu) */}
      <FabMenu onNavigateToModule={handleSelectNavTab} />

      {/* Custom Premium Logout Confirm Modal */}
      <ConfirmModal
        visible={logoutModalVisible}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari aplikasi BKSDA Superapp?"
        confirmText="Ya, Keluar"
        cancelText="Batal"
        iconName="log-out-outline"
        variant="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 16,
  },
  backText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  headerTitleRow: {
    flex: 1,
    alignItems: "center",
    paddingRight: 70,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  profileCard: {
    alignItems: "center",
    padding: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    marginBottom: 12,
  },
  statusBadgeText: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileNip: {
    fontSize: 12.5,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: "#ecfdf5",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
  },
  roleBadgeText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    color: "#94a3b8",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  changePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    marginBottom: 12,
  },
  changePasswordText: {
    color: "#059669",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: RADIUS.button,
    paddingVertical: 14,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
});
