import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface FloatingNavProps {
  currentTab: string;
  onSelectTab: (tabKey: string) => void;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { isDark, colors } = useTheme();

  const navItems = [
    { key: "home", label: "Beranda", iconName: "home-outline", iconActive: "home" },
    { key: "bmn", label: "Aset BMN", iconName: "car-sport-outline", iconActive: "car-sport" },
    { key: "surat", label: "Surat", iconName: "document-text-outline", iconActive: "document-text" },
    { key: "inventory", label: "Inventaris", iconName: "cube-outline", iconActive: "cube" },
    { key: "profile", label: "Profil", iconName: "person-outline", iconActive: "person" },
  ];

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          backgroundColor: isDark ? "rgba(9, 35, 24, 0.95)" : "rgba(255, 255, 255, 0.95)",
          borderColor: colors.glassBorder,
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = currentTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => onSelectTab(item.key)}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons
                name={(isActive ? item.iconActive : item.iconName) as any}
                size={20}
                color={isActive ? "#059669" : "#64748b"}
              />
            </View>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 58,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: "#ecfdf5",
  },
  navLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  navLabelActive: {
    color: "#059669",
    fontWeight: "800",
  },
});
