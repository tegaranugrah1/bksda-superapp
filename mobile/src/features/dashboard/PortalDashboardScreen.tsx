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
import { useTheme } from "../../theme/ThemeContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { FloatingNav } from "../../components/ui/FloatingNav";

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
    name: "Drs. Ahmad Subagja, M.Si.",
    nip: "19850412 201012 1 002",
  },
}) => {
  const { isDark, toggleTheme, colors } = useTheme();
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

  const handleSelectNavTab = (tabKey: string) => {
    if (onNavigateToModule) {
      if (tabKey === "home") onNavigateToModule("home");
      else if (tabKey === "bmn") onNavigateToModule("bmn");
      else if (tabKey === "surat") onNavigateToModule("surat");
      else if (tabKey === "inventory") onNavigateToModule("inventory");
      else if (tabKey === "profile") onNavigateToModule("profile");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "pinjaman":
        return (
          <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Tidak ada pinjaman aktif saat ini
            </Text>
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
          <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.contentItemRow}>
              <View style={styles.contentIconBg}>
                <Ionicons name="car-sport-outline" size={18} color="#059669" />
              </View>
              <View style={styles.contentMain}>
                <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                  Toyota Hilux Double Cabin 4x4
                </Text>
                <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                  Plat: KT 8192 BKS • NUP: 00012
                </Text>
                <Text style={styles.contentMeta}>Status: Dipinjam (Sisa 3 Hari)</Text>
              </View>
            </View>
          </GlassCard>
        );

      case "surattugas":
        return (
          <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.contentItemRow}>
              <View style={[styles.contentIconBg, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
              </View>
              <View style={styles.contentMain}>
                <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                  ST Patroli Pengamanan Kawasan #1015
                </Text>
                <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                  Tujuan: Cagar Alam Wilayah I Kaltim
                </Text>
                <Text style={styles.contentMeta}>Tanggal: 25 Juli 2026 - 30 Juli 2026</Text>
              </View>
            </View>
          </GlassCard>
        );

      case "cuti":
        return (
          <GlassCard style={[styles.tabContentCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.contentItemRow}>
              <View style={[styles.contentIconBg, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="calendar-outline" size={18} color="#f97316" />
              </View>
              <View style={styles.contentMain}>
                <Text style={[styles.contentTitle, { color: colors.textDark }]}>
                  Pengajuan Cuti Tahunan (2026)
                </Text>
                <Text style={[styles.contentSubtitle, { color: colors.textMuted }]}>
                  Hak Cuti: 12 Hari Kerja • Terpakai: 0 Hari
                </Text>
                <Text style={styles.contentMeta}>Status: Disetujui (Sisa 12 Hari)</Text>
              </View>
            </View>
          </GlassCard>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Web Portal Header Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/logo_bksda.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerTitleCol}>
            <Text style={[styles.brandTitle, { color: colors.textDark }]}>BKSDA Kaltim</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>SUPERAPP PORTAL</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Active Light / Dark Mode Toggle */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon-outline"}
              size={18}
              color={isDark ? "#f59e0b" : "#64748b"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color={isDark ? "#a7f3d0" : "#64748b"} />
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
          <Text style={styles.heroGreeting}>Selamat Siang, {userProfile.name}! ☀️</Text>
          <Text style={styles.heroSubtitle}>Selamat datang di portal BKSDA Kalimantan Timur.</Text>

          {/* Dedicated Sisa Cuti Box Card */}
          <View style={styles.sisaCutiBox}>
            <Ionicons name="calendar-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.sisaCutiLabel}>Sisa Cuti (2026):</Text>
            <Text style={styles.sisaCutiValue}> 12 Hari Kerja</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Modul Akses</Text>
        </View>

        {/* Compact 3-Column Module Grid (Lebih Kecil Lagi untuk Mobile) */}
        <View style={styles.moduleGrid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={styles.moduleCardWrapper}
              activeOpacity={0.8}
              onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
            >
              <GlassCard
                style={[
                  styles.moduleCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                ]}
              >
                <View style={[styles.moduleIconBadge, { backgroundColor: mod.badgeBg }]}>
                  <Ionicons name={mod.iconName as any} size={16} color={mod.iconColor} />
                </View>
                <Text style={[styles.moduleTitle, { color: colors.textDark }]} numberOfLines={1}>
                  {mod.title}
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {mod.subtitle}
                </Text>
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
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.cardBg, borderColor: colors.glassBorder },
                  isActive && styles.tabButtonActive,
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? "#ffffff" : isDark ? "#a7f3d0" : "#64748b"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isDark ? "#a7f3d0" : "#64748b" },
                    isActive && styles.tabButtonTextActive,
                  ]}
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

      {/* Custom Floating Pill Bottom Navigation Bar */}
      <FloatingNav currentTab="home" onSelectTab={handleSelectNavTab} />
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitleCol: {
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 8.5,
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
    paddingBottom: 90, // Spacing for floating nav
  },
  heroBanner: {
    backgroundColor: COLORS.emeraldElectric,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 14,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroGreeting: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11.5,
    marginBottom: 10,
  },
  sisaCutiBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: RADIUS.button,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  sisaCutiLabel: {
    color: "#0f172a",
    fontSize: 11.5,
    fontWeight: "600",
  },
  sisaCutiValue: {
    color: "#059669",
    fontSize: 11.5,
    fontWeight: "800",
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },

  /* Ultra-Compact 3-Column Module Grid */
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
    marginBottom: 12,
  },
  moduleCardWrapper: {
    width: "33.33%",
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  moduleCard: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  moduleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 1,
  },
  moduleSubtitle: {
    fontSize: 9,
    textAlign: "center",
  },

  /* 2 Baris x 2 Kolom Tab Grid */
  tabGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 10,
  },
  tabButton: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.emeraldElectric,
    borderColor: COLORS.emeraldElectric,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /* Dynamic Tab Content Box */
  tabContentCard: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  emptyIconBg: {
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "center",
  },
  actionLinkBtn: {
    marginTop: 6,
    backgroundColor: "#ecfdf5",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  actionLinkText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },

  contentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  contentIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contentMain: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  contentSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  contentMeta: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 1,
  },
});
