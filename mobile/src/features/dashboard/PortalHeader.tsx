import React from "react";
import { View, Text, TouchableOpacity, Image, type GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { usePortalNotifications } from "./PortalNotifications";
import type { PortalViewProps } from "./portalViewTypes";

export const BKSDA_FOREST = "#1e5433";

interface PortalHeaderProps extends Pick<PortalViewProps, "styles" | "colors" | "r"> {
  isDark: boolean;
  toggleTheme: (event?: GestureResponderEvent) => void;
  notifications: ReturnType<typeof usePortalNotifications>;
  setNotificationsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PortalHeader({
  styles, colors, r, isDark, toggleTheme, notifications, setNotificationsVisible,
}: PortalHeaderProps) {
  return (
    <View
      testID="portal-header"
      style={[
        styles.header,
        styles.portalHeader,
        { backgroundColor: BKSDA_FOREST },
      ]}
    >
      <View style={[styles.headerInner, styles.portalHeaderInner]}>
        <View style={[styles.headerLeft, styles.portalHeaderLeft]}>
          <View style={styles.headerLogoBadge}>
            <Image
              source={require("../../../assets/kemenhutlogo.png")}
              style={[styles.logoImage, styles.portalLogoImage]}
              resizeMode="contain"
              accessibilityLabel="Logo Kementerian Kehutanan"
            />
          </View>
          <View testID="portal-brand-identity" style={styles.portalBrandText}>
            <Text style={styles.portalMinistry}>Kementerian Kehutanan</Text>
            <Text style={styles.portalInstitution}>Balai KSDA Kalimantan Timur</Text>
          </View>
        </View>

        <View style={[styles.headerRight, styles.portalHeaderRight]}>
          {/* Active Light / Dark Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, styles.portalHeaderControl]}
            accessibilityLabel={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon-outline"}
              size={r.size.iconMd}
              color="#ffffff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, styles.portalHeaderControl]}
            activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Buka notifikasi"
            onPress={() => {setNotificationsVisible(true);void notifications.refresh();}}
          >
            <Ionicons name="notifications-outline" size={r.size.iconMd} color="#ffffff" />
            {notifications.unread > 0 && <View style={[styles.notifDot, { backgroundColor: colors.dangerSolid }]} />}
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}
