import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../../theme";
import { GlassCard } from "../../../components/ui/GlassCard";
import { EmeraldButton } from "../../../components/ui/EmeraldButton";
import { NotificationModal } from "../../../components/ui/NotificationModal";
import { useAuth } from "../AuthProvider";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info" | "success";
  }>({
    visible: false,
    title: "",
    message: "",
    variant: "danger",
  });

  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const showAlert = (title: string, message: string, variant: "danger" | "warning" | "info" | "success" = "danger") => {
    setModalConfig({
      visible: true,
      title,
      message,
      variant,
    });
  };

  const handleLogin = async () => {
    let hasValidationErr = false;
    let uErr: string | null = null;
    let pErr: string | null = null;

    if (!username.trim()) {
      uErr = "Username wajib diisi.";
      hasValidationErr = true;
    }
    if (!password) {
      pErr = "Password wajib diisi.";
      hasValidationErr = true;
    }

    setUsernameError(uErr);
    setPasswordError(pErr);

    if (hasValidationErr) {
      const msg = [uErr, pErr].filter(Boolean).join(" ");
      setErrorMessage(msg);
      showAlert("Perhatian", "Silakan masukkan NIP / Username dan Kata Sandi Anda.", "warning");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const rawMsg = err?.message || "Login gagal. Periksa username dan password, lalu coba lagi.";
      let displayMsg = rawMsg;
      if (
        rawMsg.toLowerCase().includes("sqlstate") ||
        rawMsg.toLowerCase().includes("exception") ||
        rawMsg.toLowerCase().includes("debug token")
      ) {
        displayMsg = "Login gagal. Periksa username dan password, lalu coba lagi.";
      } else if (
        rawMsg.toLowerCase().includes("sesi anda telah berakhir") ||
        err?.status === 401
      ) {
        displayMsg = "NIP / Username atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.";
      }
      setErrorMessage(displayMsg);
      showAlert("Gagal Masuk", displayMsg, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Custom Premium Notification Modal */}
        <NotificationModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          message={modalConfig.message}
          variant={modalConfig.variant}
          onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
        />
        {/* Top Crest Logomark */}
        <View style={styles.logoSection}>
          <Image
            source={require("../../../../assets/logo_bksda.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.portalTitle}>BALAI KONSERVASI SUMBER DAYA ALAM</Text>
          <Text style={styles.portalSubtitle}>KALIMANTAN TIMUR</Text>
        </View>

        {/* Login Form Card */}
        <GlassCard style={styles.formCard} highlighted>
          <Text style={styles.cardHeader}>Masuk ke Akun Anda</Text>
          <Text style={styles.cardSub}>Gunakan NIP / Username yang terdaftar di Superapp</Text>

          {errorMessage && (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorAlertText}>{errorMessage}</Text>
            </View>
          )}

          {/* Username Input Box */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIP / Username</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, usernameError ? styles.inputErrorBorder : null]}
              activeOpacity={1}
              onPress={() => usernameInputRef.current?.focus()}
            >
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputLeftIcon} />
              <TextInput
                ref={usernameInputRef}
                style={styles.input}
                placeholder="Contoh: 19850412 201012 1 002"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Username"
                editable={!isBusy}
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  if (usernameError) setUsernameError(null);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => setUsername("")} style={styles.clearBtn} disabled={isBusy}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {usernameError && <Text style={styles.fieldErrorText}>{usernameError}</Text>}
          </View>

          {/* Password Input Box */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, passwordError ? styles.inputErrorBorder : null]}
              activeOpacity={1}
              onPress={() => passwordInputRef.current?.focus()}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputLeftIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Password"
                editable={!isBusy}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (passwordError) setPasswordError(null);
                  if (errorMessage) setErrorMessage(null);
                }}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.clearBtn}
                disabled={isBusy}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#64748b"
                />
              </TouchableOpacity>
            </TouchableOpacity>
            {passwordError && <Text style={styles.fieldErrorText}>{passwordError}</Text>}
          </View>

          {/* Submit Login Button */}
          <EmeraldButton
            title={isBusy ? "MEMPROSES..." : "MASUK KE SUPERAPP ➔"}
            onPress={handleLogin}
            loading={isBusy}
            accessibilityLabel="Masuk"
            accessibilityState={{ disabled: isBusy, busy: isBusy }}
            style={[styles.submitBtn, SHADOWS.glowEmerald]}
          />

          {/* Biometric Quick Login Option */}
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={() => showAlert("Login Biometrik", "Pindai Sidik Jari / FaceID untuk masuk instan.", "info")}
            activeOpacity={0.7}
          >
            <Ionicons name="finger-print" size={24} color="#059669" />
            <Text style={styles.biometricText}>Masuk Cepat dengan Biometrik</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Footer Info */}
        <Text style={styles.footerText}>
          Kementerian Kehutanan © 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 8,
  },
  portalTitle: {
    color: "#0f172a",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  portalSubtitle: {
    color: "#059669",
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 2,
  },
  formCard: {
    width: "100%",
    padding: 22,
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSub: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 16,
  },
  errorAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: RADIUS.input,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
    width: "100%",
  },
  label: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 48,
  },
  inputErrorBorder: {
    borderColor: "#ef4444",
  },
  fieldErrorText: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
    height: "100%",
  },
  clearBtn: {
    padding: 6,
  },
  submitBtn: {
    marginTop: 8,
    height: 50,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  biometricText: {
    color: "#059669",
    fontSize: 12.5,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 20,
    textAlign: "center",
  },
});
