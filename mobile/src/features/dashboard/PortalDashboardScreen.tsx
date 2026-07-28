import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";

interface PortalDashboardScreenProps {
  onNavigateToModule?: (moduleKey: string) => void;
  userProfile?: {
    name: string;
    nip: string;
    avatarUrl?: string;
  };
}

export const PortalDashboardScreen: React.FC<PortalDashboardScreenProps> = ({
  onNavigateToModule,
  userProfile = {
    name: "Subagja",
    nip: "19850412 201012 1 002",
  },
}) => {
  const [activeTab, setActiveTab] = useState<string>("pinjaman");

  const modules = [
    {
      key: "kepegawaian",
      title: "Kepegawaian",
      subtitle: "Surat Tugas & SDM",
      iconName: "people-outline",
      badgeBg: COLORS.badgeBlueBg,
      iconColor: COLORS.badgeBlueIcon,
    },
    {
      key: "bmn",
      title: "BMN",
      subtitle: "Barang Milik Negara",
      iconName: "cube-outline",
      badgeBg: COLORS.badgeEmeraldBg,
      iconColor: COLORS.badgeEmeraldIcon,
    },
    {
      key: "inventory",
      title: "Persediaan",
      subtitle: "Stok & Distribusi",
      iconName: "apps-outline",
      badgeBg: COLORS.badgeOrangeBg,
      iconColor: COLORS.badgeOrangeIcon,
    },
    {
      key: "dereporting",
      title: "DeReporting",
      subtitle: "Pelaporan Digital",
      iconName: "document-text-outline",
      badgeBg: COLORS.badgePurpleBg,
      iconColor: COLORS.badgePurpleIcon,
    },
    {
      key: "cms",
      title: "CMS Portal",
      subtitle: "Manajemen Konten",
      iconName: "grid-outline",
      badgeBg: COLORS.badgeTealBg,
      iconColor: COLORS.badgeTealIcon,
    },
    {
      key: "surat",
      title: "Persuratan",
      subtitle: "Surat & Disposisi",
      iconName: "mail-outline",
      badgeBg: COLORS.badgeMintBg,
      iconColor: COLORS.badgeMintIcon,
    },
  ];

  const tabOptions = [
    { key: "pinjaman", label: "Pinjaman Aktif", icon: "swap-horizontal-outline" },
    { key: "aset", label: "Aset Saya", icon: "briefcase-outline" },
    { key: "surattugas", label: "Surat Tugas", icon: "document-text-outline" },
    { key: "cuti", label: "Pengajuan Cuti Saya", icon: "calendar-outline" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "pinjaman":
        return (
          <GlassCard style={styles.tabContentCard}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="cube-outline" size={32} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>Tidak ada pinjaman aktif saat ini</Text>
            <TouchableOpacity
              style={styles.actionLinkBtn}
              onPress={() => onNavigateToModule && onNavigateToModule("bmn")}
            >
              <Text style={styles.actionLinkText}>+ Ajukan Peminjaman BMN</Text>
            </TouchableOpacity>
          </GlassCard>
        );

      case "aset":
        return (
          <GlassCard style={styles.tabContentCard}>
            <View style={styles.contentItemRow}>
              <View style={styles.contentIconBg}>
                <Ionicons name="car-sport-outline" size={20} color="#059669" />
              </View>
              <View style={styles.contentMain}>
                <Text style={styles.contentTitle}>Toyota Hilux Double Cabin 4x4</Text>
                <Text style={styles.contentSubtitle}>Plat: KT 8192 BKS • NUP: 00012</Text>
                <Text style={styles.contentMeta}>Status: Dipinjam (Sisa 3 Hari)</Text>
              </View>
            </View>
          </GlassCard>
        );

      case "surattugas":
        return (
          <GlassCard style={styles.tabContentCard}>
            <View style={styles.contentItemRow}>
              <View style={[styles.contentIconBg, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.contentMain}>
                <Text style={styles.contentTitle}>ST Patroli Pengamanan Kawasan #1015</Text>
                <Text style={styles.contentSubtitle}>Tujuan: Cagar Alam Wilayah I Kaltim</Text>
                <Text style={styles.contentMeta}>Tanggal: 25 Juli 2026 - 30 Juli 2026</Text>
              </View>
            </View>
          </GlassCard>
        );

      case "cuti":
        return (
          <GlassCard style={styles.tabContentCard}>
            <View style={styles.contentItemRow}>
              <View style={[styles.contentIconBg, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="calendar-outline" size={20} color="#f97316" />
              </View>
              <View style={styles.contentMain}>
                <Text style={styles.contentTitle}>Cuti Tahunan Pegawai (2026)</Text>
                <Text style={styles.contentSubtitle}>Hak Cuti: 12 Hari Kerja • Terpakai: 0 Hari</Text>
                <Text style={styles.contentMeta}>Status: Tersedia (Sisa 12 Hari)</Text>
              </View>
            </View>
          </GlassCard>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Web Portal Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/logo_bksda.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerTitleCol}>
            <Text style={styles.brandTitle}>BKSDA Kaltim</Text>
            <Text style={styles.brandSubtitle}>SUPERAPP PORTAL</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="sunny-outline" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={18} color="#64748b" />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => onNavigateToModule && onNavigateToModule("profile")}
          >
            <Text style={styles.avatarInitial}>S</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emerald Hero Greeting Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroDate}>Selasa, 28 Juli 2026</Text>
          <Text style={styles.heroGreeting}>Selamat Siang, Drs. Ahmad Subagja, M.Si.! ☀️</Text>
          <Text style={styles.heroSubtitle}>Selamat datang di portal BKSDA Kalimantan Timur.</Text>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modul Akses</Text>
        </View>

        {/* Compact Module Access Grid (Lebih Kecil untuk Mobile) */}
        <View style={styles.moduleGrid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={styles.moduleCardWrapper}
              activeOpacity={0.8}
              onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
            >
              <GlassCard style={styles.moduleCard}>
                <View style={[styles.moduleIconBadge, { backgroundColor: mod.badgeBg }]}>
                  <Ionicons name={mod.iconName as any} size={18} color={mod.iconColor} />
                </View>
                <Text style={styles.moduleTitle} numberOfLines={1}>{mod.title}</Text>
                <Text style={styles.moduleSubtitle} numberOfLines={1}>{mod.subtitle}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2-Row x 2-Column Tab Buttons Grid Layout */}
        <View style={styles.tabGrid}>
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? "#ffffff" : "#64748b"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Tab Content Box */}
        {renderTabContent()}
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerTitleCol: {
    justifyContent: "center",
  },
  brandTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.emeraldElectric,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: COLORS.emeraldElectric,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 16,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11.5,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroGreeting: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Compact 2x3 Module Grid */
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 14,
  },
  moduleCardWrapper: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  moduleCard: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  moduleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moduleTitle: {
    color: "#0f172a",
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 1,
  },
  moduleSubtitle: {
    color: "#64748b",
    fontSize: 10,
    textAlign: "center",
  },

  /* 2 Baris x 2 Kolom Tab Grid */
  tabGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 12,
  },
  tabButton: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.emeraldElectric,
    borderColor: COLORS.emeraldElectric,
  },
  tabButtonText: {
    color: "#64748b",
    fontSize: 11.5,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /* Dynamic Tab Content Box */
  tabContentCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  emptyIconBg: {
    marginBottom: 6,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  actionLinkBtn: {
    marginTop: 8,
    backgroundColor: "#ecfdf5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  actionLinkText: {
    color: "#059669",
    fontSize: 11.5,
    fontWeight: "700",
  },

  contentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  contentIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contentMain: {
    flex: 1,
  },
  contentTitle: {
    color: "#0f172a",
    fontSize: 13.5,
    fontWeight: "700",
  },
  contentSubtitle: {
    color: "#64748b",
    fontSize: 11.5,
    marginTop: 2,
  },
  contentMeta: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
