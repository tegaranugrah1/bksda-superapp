import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../features/auth/AuthProvider";
import { ConfirmModal } from "./ConfirmModal";

interface FabMenuProps {
  onNavigateToModule: (moduleKey: string) => void;
  userProfile?: {
    name: string;
    role?: string;
  };
}

export const FabMenu: React.FC<FabMenuProps> = ({
  onNavigateToModule,
  userProfile = {
    name: "Super Admin System",
    role: "super_admin",
  },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { isDark, colors } = useTheme();
  const { logout } = useAuth();

  const menuItems = [
    { key: "home", title: "Beranda / Portal Hub", icon: "home-outline", color: "#059669" },
    { key: "bmn", title: "Aset BMN", icon: "car-sport-outline", color: "#10b981" },
    { key: "surat", title: "Persuratan & Disposisi", icon: "document-text-outline", color: "#3b82f6" },
    { key: "inventory", title: "Stok Inventaris", icon: "cube-outline", color: "#f97316" },
    { key: "kepegawaian", title: "Kepegawaian", icon: "people-outline", color: "#8b5cf6" },
    { key: "profile", title: "Profil Pengguna", icon: "person-outline", color: "#0d9488" },
  ];

  const handleSelect = (key: string) => {
    setIsOpen(false);
    onNavigateToModule(key);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    setIsOpen(false);
    if (logout) await logout();
  };

  return (
    <>
      {/* Floating Action Button (FAB) in Bottom Right Corner */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: colors.emeraldPrimary }]}
        activeOpacity={0.8}
        onPress={() => setIsOpen(true)}
      >
        <Ionicons name="menu-outline" size={26} color="#ffffff" />
      </TouchableOpacity>

      {/* Slide / Overlay Drawer Menu */}
      <Modal visible={isOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />

          <View
            style={[
              styles.drawerCard,
              {
                backgroundColor: isDark ? "#092318" : "#ffffff",
                borderColor: colors.glassBorder,
              },
            ]}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.moduleBadge}>
                <Ionicons name="apps" size={22} color="#059669" />
              </View>
              <View style={styles.headerTitleCol}>
                <Text style={[styles.drawerTitle, { color: colors.textDark }]}>BKSDA Superapp</Text>
                <Text style={styles.drawerSubtitle}>NAVIGASI MODUL CEPAT</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Menu Options List */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuRow,
                    { borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item.key)}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.textDark }]}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.menuRow, { borderBottomWidth: 0, marginTop: 10 }]}
                activeOpacity={0.7}
                onPress={() => setLogoutModalVisible(true)}
              >
                <View style={[styles.menuIconBg, { backgroundColor: "#fef2f2" }]}>
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                </View>
                <Text style={[styles.menuText, { color: "#ef4444" }]}>Keluar Sistem</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Drawer Footer User Info */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.glassBorder }]}>
              <View style={styles.userBadgeRow}>
                <View style={styles.userAvatarCircle}>
                  <Text style={styles.userAvatarText}>S</Text>
                </View>
                <View>
                  <Text style={[styles.userName, { color: colors.textDark }]}>
                    {userProfile.name}
                  </Text>
                  <Text style={styles.userRoleTag}>{userProfile.role}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
    </>
  );
};

const styles = StyleSheet.create({
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  drawerCard: {
    width: "78%",
    height: "100%",
    borderLeftWidth: 1,
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 12,
  },
  moduleBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  drawerSubtitle: {
    color: "#059669",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  menuScroll: {
    flex: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
  },
  drawerFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  userBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
  },
  userRoleTag: {
    color: "#64748b",
    fontSize: 11,
  },
});
