import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { apiClient } from "../../lib/api/client";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessLogout: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  onSuccessLogout,
}) => {
  const { isDark, colors } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirmation("");
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage("Password saat ini wajib diisi.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Password baru wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setErrorMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/me/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      setLoading(false);
      setSuccessMessage("Kata sandi Anda berhasil diperbarui. Silakan login kembali.");
    } catch (err: any) {
      setLoading(false);
      const apiErr = err.response?.data;
      if (apiErr?.errors?.current_password) {
        setErrorMessage("Password saat ini tidak sesuai.");
      } else if (apiErr?.errors?.new_password) {
        setErrorMessage(apiErr.errors.new_password[0]);
      } else if (apiErr?.message) {
        setErrorMessage(apiErr.message);
      } else {
        setErrorMessage("Gagal mengubah kata sandi. Periksa koneksi internet Anda.");
      }
    }
  };

  const handleSuccessLogout = () => {
    resetForm();
    onClose();
    onSuccessLogout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.cardBg || (isDark ? "#1e293b" : "#ffffff"),
                  borderColor: colors.glassBorder || (isDark ? "#334155" : "#e2e8f0"),
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="key" size={20} color="#10b981" />
                </View>
                <View style={styles.headerTextCol}>
                  <Text style={[styles.title, { color: colors.textDark }]}>
                    Ganti Password
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Perbarui kata sandi akun Anda secara aman
                  </Text>
                </View>
                {!loading && (
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Body Content */}
              {successMessage ? (
                /* Success View */
                <View style={styles.successContainer}>
                  <View style={styles.successIconWrapper}>
                    <Ionicons name="checkmark-circle" size={54} color="#10b981" />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.textDark }]}>
                    Berhasil Diperbarui!
                  </Text>
                  <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
                    {successMessage}
                  </Text>

                  <TouchableOpacity
                    style={styles.successBtn}
                    onPress={handleSuccessLogout}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.successBtnText}>Login Ulang Sekarang</Text>
                    <Ionicons name="log-in-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Form View */
                <View style={styles.formContent}>
                  {errorMessage && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}

                  {/* Input 1: Current Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                      Password Saat Ini <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        },
                      ]}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textDark }]}
                        placeholder="Masukkan password saat ini"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showCurrentPw}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPw(!showCurrentPw)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showCurrentPw ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Input 2: New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                      Password Baru <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        },
                      ]}
                    >
                      <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textDark }]}
                        placeholder="Minimal 8 karakter"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showNewPw}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPw(!showNewPw)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showNewPw ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Input 3: Confirm New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                      Konfirmasi Password Baru <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        },
                      ]}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textDark }]}
                        placeholder="Ulangi password baru"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showConfirmPw}
                        value={newPasswordConfirmation}
                        onChangeText={setNewPasswordConfirmation}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPw(!showConfirmPw)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showConfirmPw ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.cancelBtn,
                        {
                          backgroundColor: isDark ? "#334155" : "#f1f5f9",
                        },
                      ]}
                      onPress={handleClose}
                      disabled={loading}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.textDark }]}>Batal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                      onPress={handleSubmit}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>Simpan Password</Text>
                          <Ionicons name="save-outline" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardView: {
    width: "100%",
    maxWidth: 420,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  formContent: {
    gap: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12.5,
    color: "#ef4444",
    fontWeight: "600",
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: "#10b981",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  /* Success View */
  successContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  successIconWrapper: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  successBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  successBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
