import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../theme";
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
    avatarUrl: "https://bksdakaltim.net/assets/img/logobksda.png",
  },
}) => {
  const modules = [
    { key: "bmn", title: "Aset BMN", icon: "🚗", badgeColor: COLORS.emeraldElectric },
    { key: "surat", title: "Surat & Disposisi", icon: "✉️", badgeColor: "#3b82f6" },
    { key: "inventory", title: "Stok Inventaris", icon: "📦", badgeColor: "#f59e0b" },
    { key: "kepegawaian", title: "Kepegawaian", icon: "👤", badgeColor: "#8b5cf6" },
    { key: "dereporting", title: "DeReporting", icon: "🛡️", badgeColor: "#ef4444" },
    { key: "portal", title: "Portal Publik", icon: "🌐", badgeColor: "#06b6d4" },
  ];

  const recentActivities = [
    {
      id: 1,
      title: "Surat Tugas Patroli Kawasan",
      subtitle: "Menunggu Persetujuan Kepala Balai",
      time: "10:30 AM",
      status: "Menunggu",
      statusColor: COLORS.statusPending,
      icon: "✉️",
    },
    {
      id: 2,
      title: "Peminjaman Kendaraan Dinas",
      subtitle: "Disetujui - No. Polisi KT 8192 BKS",
      time: "Kemarin",
      status: "Disetujui",
      statusColor: COLORS.statusAvailable,
      icon: "🚗",
    },
    {
      id: 3,
      title: "Laporan Monitoring Badak",
      subtitle: "Terverifikasi oleh Tim Teknis",
      time: "2 Hari Lalu",
      status: "Selesai",
      statusColor: COLORS.statusInfo,
      icon: "🛡️",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🏛️</Text>
          <Text style={styles.headerTitle}>BKSDA KALTIM</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Welcome Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingTitle}>Halo, {userProfile.name} 👋</Text>
            <Text style={styles.greetingNip}>NIP: {userProfile.nip}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Aktif</Text>
          </View>
        </View>

        {/* Hero Stats Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Overview Status</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>14</Text>
              <Text style={styles.statLabel}>Disposisi{"\n"}Aktif</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Peminjaman{"\n"}Aset</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Laporan{"\n"}Masuk</Text>
            </View>
          </View>
        </View>

        {/* Module Navigation Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Layanan Utama</Text>
        </View>

        <View style={styles.moduleGrid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={styles.moduleCardWrapper}
              activeOpacity={0.8}
              onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
            >
              <GlassCard style={styles.moduleCard}>
                <View style={[styles.moduleIconBadge, { backgroundColor: `${mod.badgeColor}20` }]}>
                  <Text style={styles.moduleIcon}>{mod.icon}</Text>
                </View>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity Feed */}
        <View style={styles.sectionHeaderBetween}>
          <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {recentActivities.map((act) => (
            <GlassCard key={act.id} style={styles.activityCard}>
              <View style={[styles.activityIconBg, { backgroundColor: `${act.statusColor}20` }]}>
                <Text style={styles.activityIcon}>{act.icon}</Text>
              </View>

              <View style={styles.activityMain}>
                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activitySubtitle}>{act.subtitle}</Text>
              </View>

              <View style={styles.activityRight}>
                <Text style={styles.activityTime}>{act.time}</Text>
                <View style={[styles.activityStatusTag, { borderColor: act.statusColor }]}>
                  <Text style={[styles.activityStatusText, { color: act.statusColor }]}>
                    {act.status}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Nav Bar */}
      <View style={[styles.bottomNav, SHADOWS.glowEmerald]}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateToModule && onNavigateToModule("bmn")}
        >
          <Text style={styles.navIcon}>🚗</Text>
          <Text style={styles.navText}>Assets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateToModule && onNavigateToModule("surat")}
        >
          <Text style={styles.navIcon}>✉️</Text>
          <Text style={styles.navText}>Letters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateToModule && onNavigateToModule("profile")}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: "rgba(15, 41, 30, 0.8)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  headerTitle: {
    color: COLORS.emeraldElectric,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notifBtn: {
    position: "relative",
    padding: 8,
    marginRight: 12,
  },
  notifIcon: {
    fontSize: 20,
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.statusUrgent,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.emeraldElectric,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greetingTitle: {
    color: COLORS.textWhite,
    fontSize: 20,
    fontWeight: "700",
  },
  greetingNip: {
    color: COLORS.textMint,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emeraldElectric,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.emeraldElectric,
    fontSize: 11.5,
    fontWeight: "700",
  },
  heroBanner: {
    borderRadius: RADIUS.card,
    padding: 20,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: 24,
  },
  heroTitle: {
    color: COLORS.textWhite,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(6, 26, 18, 0.6)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statNumber: {
    color: COLORS.textWhite,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textMint,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: "700",
  },
  seeAllText: {
    color: COLORS.emeraldElectric,
    fontSize: 12.5,
    fontWeight: "600",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
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
  },
  moduleIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  moduleIcon: {
    fontSize: 22,
  },
  moduleTitle: {
    color: COLORS.textWhite,
    fontSize: 13.5,
    fontWeight: "600",
    textAlign: "center",
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  activityIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityMain: {
    flex: 1,
  },
  activityTitle: {
    color: COLORS.textWhite,
    fontSize: 13.5,
    fontWeight: "600",
  },
  activitySubtitle: {
    color: COLORS.textMint,
    fontSize: 11.5,
    marginTop: 2,
    opacity: 0.75,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityTime: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    marginBottom: 4,
  },
  activityStatusTag: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  activityStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "rgba(15, 41, 30, 0.92)",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.glassBorderHighlight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navItem: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  navItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  navIconActive: {
    fontSize: 18,
  },
  navText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  navTextActive: {
    color: COLORS.emeraldElectric,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 2,
  },
});
