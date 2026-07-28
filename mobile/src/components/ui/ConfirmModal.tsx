import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, SHADOWS } from "../../theme";
import { useTheme } from "../../theme/ThemeContext";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = "Ya, Keluar",
  cancelText = "Batal",
  iconName = "log-out-outline",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  const { isDark, colors } = useTheme();

  const isDanger = variant === "danger";
  const accentColor = isDanger ? "#ef4444" : "#059669";
  const badgeBg = isDanger ? "#fef2f2" : "#ecfdf5";

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />

        <View
          style={[
            styles.card,
            SHADOWS.cardGlass,
            {
              backgroundColor: isDark ? "#092318" : "#ffffff",
              borderColor: colors.glassBorder,
            },
          ]}
        >
          {/* Circular Badge Icon */}
          <View style={[styles.iconCircle, { backgroundColor: badgeBg }]}>
            <Ionicons name={iconName} size={28} color={accentColor} />
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: colors.textDark }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          {/* Buttons Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1" }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textDark }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
