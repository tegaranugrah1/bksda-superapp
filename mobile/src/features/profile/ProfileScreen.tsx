import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Switch,
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

  const officerName = user?.employee?.name || user?.name || "Drs. Ahmad Subagja, M.Si.";
  const officerNip = user?.employee?.nip || user?.username || "19850412 201012 1 002";
  const officerRole = user?.employee?.position || "Kepala Sub Bagian TU";

  const modulePermissions = [
    { key: "core", name: "Core Module", status: "Full Access", active: true },
    { key: "bmn", name: "BMN Assets", status: "Manager", active: true },
    { key: "inventory", name: "Stok Inventaris", status: "Manager", active: true },
    { key: "surat", name: "Surat & Disposisi", status: "Manager", active: true },
    { key: "dereporting", name: "DeReporting", status: "Read Only", active: true },
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
            <Ionicons name="arrow-back" size={22} color={COLORS.textWhite} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <Ionicons name="person-sharp" size={22} color={COLORS.emeraldElectric} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Profil & Pengaturan</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <GlassCard style={styles.profileCard} highlighted>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: "https://bksdakaltim.net/assets/img/logobksda.png" }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.profileName}>{officerName}</Text>
          <Text style={styles.profileRole}>{officerRole}</Text>
          <Text style={styles.profileNip}>NIP. {officerNip}</Text>

          <View style={styles.superAdminTag}>
            <Ionicons name="star" size={12} color={COLORS.emeraldElectric} style={{ marginRight: 4 }} />
            <Text style={styles.superAdminTagText}>Super Admin / Full Access</Text>
          </View>

          <View style={styles.profileBtnRow}>
            <TouchableOpacity
              style={styles.profileActionBtn}
              onPress={() => Alert.alert("Edit Profil", "Fitur ubah data biodata pegawai.")}
            >
              <Ionicons name="pencil" size={14} color={COLORS.textMint} style={{ marginRight: 4 }} />
              <Text style={styles.profileActionText}>Edit Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileActionBtn}
              onPress={() => Alert.alert("ID Card Digital", "Kartu Tanda Anggota Digital BKSDA Kaltim.")}
            >
              <Ionicons name="card-outline" size={14} color={COLORS.textMint} style={{ marginRight: 4 }} />
              <Text style={styles.profileActionText}>Kartu Pegawai</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Module Access Permissions Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="key-outline" size={18} color={COLORS.emeraldElectric} style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Hak Akses Modul Aktif</Text>
          </View>

          <View style={styles.permList}>
            {modulePermissions.map((item) => (
              <View key={item.key} style={styles.permRow}>
                <View style={styles.permMain}>
                  <Text style={styles.permName}>{item.name}</Text>
                  <Text style={styles.permStatus}>{item.status}</Text>
                </View>
                <Switch
                  value={item.active}
                  trackColor={{ false: "#3c4a42", true: "rgba(16, 185, 129, 0.4)" }}
                  thumbColor={item.active ? COLORS.emeraldElectric : "#bbcabf"}
                  disabled
                />
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Account Options & Security */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="settings-outline" size={18} color={COLORS.emeraldElectric} style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Pengaturan & Keamanan</Text>
          </View>

          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Keamanan", "Fitur Ubah Password & PIN Biometrik.")}
            >
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMint} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Keamanan & Ubah Password</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Surat Kuasa", "Riwayat Surat Kuasa Penggunaan Kendaraan.")}
            >
              <Ionicons name="document-attach-outline" size={16} color={COLORS.textMint} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Riwayat Surat Kuasa Kendaraan</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Notifikasi", "Pengaturan Push Notification Disposisi.")}
            >
              <Ionicons name="notifications-outline" size={16} color={COLORS.textMint} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Notifikasi Disposisi & Surat</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("SIMONDOK", "Panduan Penggunaan SIMONDOK & BKSDA Superapp.")}
            >
              <Ionicons name="book-outline" size={16} color={COLORS.textMint} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Panduan SIMONDOK Guide</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>KELUAR DARI APLIKASI</Text>
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
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: "rgba(15, 41, 30, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.emeraldElectric,
    marginBottom: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.emeraldElectric,
    borderWidth: 2,
    borderColor: COLORS.bgDark,
  },
  profileName: {
    color: COLORS.textWhite,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  profileRole: {
    color: COLORS.textMint,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  profileNip: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginBottom: 12,
  },
  superAdminTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    marginBottom: 16,
  },
  superAdminTagText: {
    color: COLORS.emeraldElectric,
    fontSize: 11.5,
    fontWeight: "700",
  },
  profileBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6, 26, 18, 0.7)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.button,
    paddingVertical: 10,
  },
  profileActionText: {
    color: COLORS.textMint,
    fontSize: 12.5,
    fontWeight: "600",
  },
  sectionCard: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    paddingBottom: 10,
  },
  cardHeaderTitle: {
    color: COLORS.textMint,
    fontSize: 15,
    fontWeight: "700",
  },
  permList: {
    gap: 12,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  permMain: {
    flex: 1,
  },
  permName: {
    color: COLORS.textWhite,
    fontSize: 13.5,
    fontWeight: "600",
  },
  permStatus: {
    color: COLORS.emeraldElectric,
    fontSize: 11,
    marginTop: 1,
  },
  menuList: {
    gap: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  menuIcon: {
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 13.5,
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    marginTop: 10,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
