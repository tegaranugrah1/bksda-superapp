import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../auth/AuthProvider";

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const { user, logout } = useAuth();

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

  const handleLogout = async () => {
    Alert.alert("Konfirmasi Keluar", "Apakah Anda yakin ingin keluar dari aplikasi BKSDA Superapp?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          if (logout) await logout();
          if (onLogout) onLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Profil Pengguna</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Presisi Screenshot 2 */}
        <GlassCard style={styles.profileCard}>
          {/* Avatar Circle */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>S</Text>
          </View>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#10b981" style={{ marginRight: 4 }} />
            <Text style={styles.statusBadgeText}>AKTIF</Text>
          </View>

          <Text style={styles.profileName}>{officerName}</Text>
          <Text style={styles.profileNip}>NIP {officerNip}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Super Admin</Text>
          </View>
        </GlassCard>

        {/* Details Card Presisi Screenshot 2 */}
        <GlassCard style={styles.detailsCard}>
          {profileDetails.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.detailRow,
                index < profileDetails.length - 1 && styles.detailRowBorder,
              ]}
            >
              <View style={styles.detailIconBg}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => Alert.alert("Ganti Password", "Formulir ubah kata sandi akun.")}
          activeOpacity={0.8}
        >
          <Ionicons name="key-outline" size={18} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.changePasswordText}>Ganti Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitleRow: {
    flex: 1,
  },
  headerTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 34,
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
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileNip: {
    color: "#64748b",
    fontSize: 13,
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#f8fafc",
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
    color: "#0f172a",
    fontSize: 13.5,
    fontWeight: "700",
  },
  changePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
