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
    name: "Super",
    nip: "superadmin",
    avatarUrl: "https://bksdakaltim.net/assets/img/logobksda.png",
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

  return (
    <View style={styles.container}>
      {/* Web Portal Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: userProfile.avatarUrl }}
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
            <Ionicons name="sunny-outline" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#64748b" />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => onNavigateToModule && onNavigateToModule("profile")}
          >
            <Text style={styles.avatarInitial}>S</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => onNavigateToModule && onNavigateToModule("profile")}
          >
            <Ionicons name="exit-outline" size={18} color="#64748b" />
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
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modul Akses</Text>
        </View>

        {/* Module Access Grid */}
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
                  <Ionicons name={mod.iconName as any} size={24} color={mod.iconColor} />
                </View>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSubtitle}>{mod.subtitle}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horizontal Segmented Tab Controller */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
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
                  size={16}
                  color={isActive ? "#ffffff" : "#64748b"}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content / Empty State Card */}
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="cube-outline" size={36} color="#cbd5e1" />
          </View>
          <Text style={styles.emptyText}>Tidak ada pinjaman aktif</Text>
        </GlassCard>
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
    paddingBottom: 14,
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
    marginRight: 10,
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
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.emeraldElectric,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: COLORS.emeraldElectric,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 20,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  heroGreeting: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 20,
  },
  moduleCardWrapper: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  moduleCard: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  moduleIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  moduleTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  moduleSubtitle: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
  },
  tabScroll: {
    marginBottom: 16,
  },
  tabScrollContent: {
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabButtonActive: {
    backgroundColor: COLORS.emeraldElectric,
    borderColor: COLORS.emeraldElectric,
  },
  tabButtonText: {
    color: "#64748b",
    fontSize: 12.5,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptyCard: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  emptyIconBg: {
    marginBottom: 10,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13.5,
    fontWeight: "600",
  },
});
