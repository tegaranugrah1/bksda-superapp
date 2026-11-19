import React from "react";
import { View, Text, TouchableOpacity, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PortalServiceScreen, PortalViewProps } from "./portalViewTypes";

interface PortalBottomNavProps extends Pick<PortalViewProps, "styles" | "colors" | "r"> {
  shadowLg: ViewStyle;
  activeTab: string;
  stBadgeCount: number;
  assetsBadgeCount: number;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setLayananSubScreen: React.Dispatch<React.SetStateAction<PortalServiceScreen>>;
  setFabModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PortalBottomNav({
  styles, colors, r, shadowLg, activeTab, stBadgeCount, assetsBadgeCount,
  setActiveTab, setLayananSubScreen, setFabModalVisible,
}: PortalBottomNavProps) {
  return (
    <View style={[styles.bottomNavContainer, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowLg]}>
      {/* 1. Beranda */}
      <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("dashboard")}>
        <Ionicons
          name="home-outline"
          size={r.size.iconLg}
          color={activeTab === "dashboard" ? colors.accentFg : colors.textMuted}
        />
        <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "dashboard" ? colors.accentFg : colors.textMuted }]}>
          Beranda
        </Text>
      </TouchableOpacity>

      {/* 2. Tugas */}
      <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("surattugas")}>
        <View style={styles.navIconWrapper}>
          <Ionicons
            name="document-text-outline"
            size={r.size.iconLg}
            color={activeTab === "surattugas" ? colors.accentFg : colors.textMuted}
          />
          {stBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
        </View>
        <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "surattugas" ? colors.accentFg : colors.textMuted }]}>
          Tugas
        </Text>
      </TouchableOpacity>

      {/* 3. Center Elevated FAB (+) -> Opens Modal */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: colors.accentSolid, borderColor: colors.cardBg }, shadowLg]}
          onPress={() => setFabModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Buka aksi cepat"
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={r.size.iconXl} color={colors.accentOnSolid} />
        </TouchableOpacity>
      </View>

      {/* 4. Layanan Terpadu ASN */}
      <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab("layanan"); setLayananSubScreen("menu"); }}>
        <View style={styles.navIconWrapper}>
          <Ionicons
            name="grid-outline"
            size={r.size.iconLg}
            color={activeTab === "layanan" ? colors.accentFg : colors.textMuted}
          />
          {assetsBadgeCount > 0 && <View style={[styles.navBadge, { backgroundColor: colors.dangerSolid }]} />}
        </View>
        <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "layanan" ? colors.accentFg : colors.textMuted }]}>
          Layanan
        </Text>
      </TouchableOpacity>

      {/* 5. Profil Pegawai */}
      <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("profile")}>
        <View style={styles.navIconWrapper}>
          <Ionicons
            name="person-outline"
            size={r.size.iconLg}
            color={activeTab === "profile" ? colors.accentFg : colors.textMuted}
          />
        </View>
        <Text numberOfLines={1} style={[styles.navText, { color: activeTab === "profile" ? colors.accentFg : colors.textMuted }]}>
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
}
