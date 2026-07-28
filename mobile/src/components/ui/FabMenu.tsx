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
import { RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../features/auth/AuthProvider";
import { ConfirmModal } from "./ConfirmModal";

interface FabMenuProps {
  onNavigateToModule: (moduleKey: string) => void;
  activeModule?: string;
  activeSubmenu?: string;
  userProfile?: {
    name: string;
    role?: string;
  };
}

export const FabMenu: React.FC<FabMenuProps> = ({
  onNavigateToModule,
  activeModule = "kepegawaian",
  activeSubmenu = "daftar-pegawai",
  userProfile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, logout } = useAuth();

  const resolvedName = userProfile?.name || user?.name || "Super Admin System";
  const resolvedRole = userProfile?.role || user?.role || "super_admin";
  const avatarInitial = (resolvedName.charAt(0) || "S").toUpperCase();

  const moduleList = [
    { key: "kepegawaian", title: "Kepegawaian", icon: "people", color: "#2563eb" },
    { key: "bmn", title: "BMN & Aset", icon: "cube", color: "#10b981" },
    { key: "inventory", title: "Inventory", icon: "apps", color: "#f97316" },
    { key: "dereporting", title: "DeReporting", icon: "document-text", color: "#8b5cf6" },
    { key: "cms", title: "CMS Portal", icon: "grid", color: "#0d9488" },
    { key: "surat", title: "Persuratan", icon: "mail", color: "#0284c7" },
  ];

  const submenus = [
    { key: "daftar-pegawai", title: "Daftar Pegawai", icon: "people-outline" },
    { key: "tambah-pegawai", title: "Tambah Pegawai", icon: "person-add-outline" },
    { key: "inbox-surat-tugas", title: "Inbox Surat Tugas", icon: "tray-outline" },
    { key: "inbox-surat-cuti", title: "Inbox Surat Cuti", icon: "calendar-outline" },
    { key: "buat-surat-tugas", title: "Buat Surat Tugas", icon: "document-text-outline" },
    { key: "riwayat-surat-tugas", title: "Riwayat Surat Tugas", icon: "time-outline" },
  ];

  const handleSelectSubmenu = (key: string) => {
    setIsOpen(false);
    if (key === "daftar-pegawai" || key === "tambah-pegawai") {
      onNavigateToModule("kepegawaian");
    } else if (key === "inbox-surat-tugas" || key === "buat-surat-tugas" || key === "riwayat-surat-tugas") {
      onNavigateToModule("surat");
    } else {
      onNavigateToModule("kepegawaian");
    }
  };

  const handleSwitchModule = (modKey: string) => {
    setShowModuleSelector(false);
    setIsOpen(false);
    onNavigateToModule(modKey);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    setIsOpen(false);
    if (logout) await logout();
  };

  return (
    <>
      {/* Floating Action Button (FAB ☰) in Bottom Right Corner */}
      <TouchableOpacity
        style={styles.fabBtn}
        activeOpacity={0.8}
        onPress={() => setIsOpen(true)}
      >
        <Ionicons name="menu" size={26} color="#ffffff" />
      </TouchableOpacity>

      {/* Slide Drawer Navigation from Left Presisi Screenshot */}
      <Modal visible={isOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          {/* Left Drawer Body Panel */}
          <View
            style={[
              styles.drawerCard,
              {
                backgroundColor: isDark ? "#092318" : "#ffffff",
                borderColor: colors.glassBorder,
              },
            ]}
          >
            {/* Drawer Top Header Row */}
            <View style={styles.drawerHeaderRow}>
              <View style={styles.headerLeftInfo}>
                <View style={styles.moduleSquareIcon}>
                  <Ionicons name="people" size={22} color="#2563eb" />
                </View>
                <View>
                  <Text style={[styles.moduleTitleText, { color: colors.textDark }]}>
                    Kepegawaian
                  </Text>
                  <Text style={styles.moduleSubtext}>SDM & EMPLOYEE</Text>
                </View>
              </View>

              {/* Theme Toggle Button */}
              <TouchableOpacity
                style={[styles.themeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#fffbe8" }]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isDark ? "sunny" : "sunny-outline"}
                  size={18}
                  color={isDark ? "#f59e0b" : "#d97706"}
                />
              </TouchableOpacity>
            </View>

            {/* Active Module Dropdown Switcher Box */}
            <TouchableOpacity
              style={[
                styles.moduleDropdownCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc" },
              ]}
              onPress={() => setShowModuleSelector(!showModuleSelector)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="people-outline" size={16} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.dropdownLabel}>MODUL AKTIF</Text>
                  <Text style={[styles.dropdownValue, { color: colors.textDark }]}>
                    Kepegawaian
                  </Text>
                </View>
              </View>
              <Ionicons
                name={showModuleSelector ? "chevron-up" : "chevron-down"}
                size={18}
                color="#64748b"
              />
            </TouchableOpacity>

            {/* Expandable Module Selector Menu */}
            {showModuleSelector && (
              <View style={[styles.moduleSelectorBox, { backgroundColor: isDark ? "#092318" : "#f1f5f9" }]}>
                {moduleList.map((mod) => (
                  <TouchableOpacity
                    key={mod.key}
                    style={styles.moduleSelectorItem}
                    onPress={() => handleSwitchModule(mod.key)}
                  >
                    <Ionicons name={mod.icon as any} size={15} color={mod.color} style={{ marginRight: 8 }} />
                    <Text style={[styles.moduleSelectorText, { color: colors.textDark }]}>
                      {mod.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Submenu Links List Presisi Screenshot */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {submenus.map((item) => {
                const isActive = item.key === activeSubmenu;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.submenuRow,
                      isActive && styles.submenuRowActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectSubmenu(item.key)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isActive ? "#2563eb" : "#475569"}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[
                        styles.submenuText,
                        { color: colors.textDark },
                        isActive && styles.submenuTextActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Drawer Bottom User & Logout Section Presisi Screenshot */}
            <View style={[styles.drawerFooter, { borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }]}>
              <View style={styles.userInfoRow}>
                <View style={styles.userAvatarCircle}>
                  <Text style={styles.userAvatarText}>{avatarInitial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userNameText, { color: colors.textDark }]} numberOfLines={1}>
                    {resolvedName}
                  </Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>{resolvedRole}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.logoutRow}
                onPress={() => setLogoutModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.logoutIconCircle}>
                  <Ionicons name="power-outline" size={16} color="#ffffff" />
                </View>
                <Text style={styles.logoutText}>Keluar Sistem</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Backdrop Overlay */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
  },
  drawerCard: {
    width: "78%",
    height: "100%",
    borderRightWidth: 1,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  drawerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  moduleSquareIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  moduleTitleText: {
    fontSize: 17,
    fontWeight: "800",
  },
  moduleSubtext: {
    color: "#2563eb",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  moduleDropdownCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: RADIUS.card,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dropdownLabel: {
    color: "#94a3b8",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  moduleSelectorBox: {
    borderRadius: RADIUS.input,
    padding: 8,
    marginBottom: 12,
    gap: 6,
  },
  moduleSelectorItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  moduleSelectorText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  menuScroll: {
    flex: 1,
  },
  submenuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.input,
    marginBottom: 4,
  },
  submenuRowActive: {
    backgroundColor: "#eff6ff",
  },
  submenuText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  submenuTextActive: {
    color: "#2563eb",
    fontWeight: "800",
  },
  drawerFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userAvatarText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  userNameText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    marginTop: 1,
  },
  roleTagText: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "700",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  logoutIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
