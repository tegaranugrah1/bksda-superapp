import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";

export interface NotificationModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: "danger" | "warning" | "success" | "info";
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  title,
  message,
  buttonText = "Saya Mengerti",
  iconName,
  variant = "danger",
  onClose,
}) => {
  const { isDark, colors } = useTheme();

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";
  const isSuccess = variant === "success";

  const defaultIcon = isDanger
    ? "alert-circle"
    : isWarning
    ? "warning-outline"
    : isSuccess
    ? "checkmark-circle-outline"
    : "information-circle-outline";

  const resolvedIcon = iconName || defaultIcon;

  const accentColor = isDanger
    ? "#ef4444"
    : isWarning
    ? "#d97706"
    : isSuccess
    ? "#059669"
    : "#3b82f6";

  const badgeBg = isDanger
    ? "#fef2f2"
    : isWarning
    ? "#fffbe8"
    : isSuccess
    ? "#ecfdf5"
    : "#eff6ff";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.card,
            SHADOWS.cardGlass,
            {
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderColor: colors.glassBorder || "rgba(0,0,0,0.08)",
            },
          ]}
        >
          {/* Circular Badge Icon */}
          <View style={[styles.iconCircle, { backgroundColor: badgeBg }]}>
            <Ionicons name={resolvedIcon} size={32} color={accentColor} />
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: isDark ? "#f8fafc" : "#0f172a" }]}>{title}</Text>
          <Text style={[styles.message, { color: isDark ? "#94a3b8" : "#64748b" }]}>{message}</Text>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  closeBtn: {
    width: "100%",
    height: 48,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
