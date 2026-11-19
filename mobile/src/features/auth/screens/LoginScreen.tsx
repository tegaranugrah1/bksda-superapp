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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView, BlurView } from "expo-blur";
import { RADIUS, SHADOWS } from "../../../theme";
import { GlassCard } from "../../../components/ui/GlassCard";
import { EmeraldButton } from "../../../components/ui/EmeraldButton";
import { NotificationModal } from "../../../components/ui/NotificationModal";
import { ProfileSheet, ProfileSaveButton, profileStyles as otpStyles } from "@/features/profile/ProfileSheet";
import { useAuth } from "../AuthProvider";
import { useTheme, type ThemeColors } from "../../../theme/ThemeContext";

export default function LoginScreen() {
  const { login, isLoading, twoFactorChallenge, verifyTwoFactor, cancelTwoFactor } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = React.useMemo(() => createLoginStyles(isDark, colors, width), [isDark, colors, width]);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const otpLock = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const backgroundRef = useRef<View>(null);

  const showAlert = (title: string, message: string, variant: "danger" | "warning" | "info" | "success" = "danger") => {
    setModalConfig({
      visible: true,
      title,
      message,
      variant,
    });
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      const msg = !username.trim() && !password
        ? "Username dan Password wajib diisi."
        : !username.trim()
        ? "Username wajib diisi."
        : "Password wajib diisi.";
      setErrorMessage(msg);
      showAlert("Perhatian", msg, "warning");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      setPassword("");
    } catch (err: any) {
      const rawMsg = err?.message || "";
      const displayMsg =
        rawMsg.toLowerCase().includes("sesi anda telah berakhir") || err?.status === 401
          ? "NIP / Username atau kata sandi yang Anda masukkan salah. Silakan periksa kembali."
          : "Login gagal. Periksa username dan password, lalu coba lagi.";
      setErrorMessage(displayMsg);
      showAlert("Gagal Masuk", displayMsg, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOtp = async () => {
    if (otpLock.current) return;
    if (!otp.trim()) {setOtpError("Masukkan kode authenticator atau kode pemulihan.");return;}
    otpLock.current = true; setIsSubmitting(true); setOtpError("");
    try {await verifyTwoFactor(otp.trim());setOtp("");}
    catch (failure: any) {
      if (failure?.fieldErrors?.challenge_token) {cancelTwoFactor();setOtp("");setErrorMessage(failure.fieldErrors.challenge_token.join(" "));}
      else setOtpError(Object.values(failure?.fieldErrors || {}).flat().join(" ") || failure?.message || "Kode belum dapat diverifikasi.");
    } finally {otpLock.current = false;setIsSubmitting(false);}
  };

  const isBusy = isSubmitting || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ProfileSheet visible={!!twoFactorChallenge} title="Verifikasi dua langkah" busy={isBusy} onClose={() => {cancelTwoFactor();setOtp("");setOtpError("");}}>
        <Text style={[otpStyles.text,{color:colors.textMuted}]}>Masukkan kode dari authenticator atau salah satu kode pemulihan akun Anda.</Text>
        {!!otpError && <Text accessibilityRole="alert" style={[otpStyles.text,{color:colors.dangerFg}]}>{otpError}</Text>}
        <TextInput accessibilityLabel="Kode verifikasi 2FA" value={otp} onChangeText={setOtp} autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!isBusy} onSubmitEditing={() => void submitOtp()} style={[otpStyles.input,{color:colors.textDark,borderColor:colors.borderControl}]} />
        <ProfileSaveButton label="Verifikasi dan masuk" busy={isBusy} onPress={() => void submitOtp()} />
      </ProfileSheet>
      <BlurTargetView ref={backgroundRef} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require("../../../../assets/sangalaki.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
          accessible={false}
        />
        <View style={styles.backgroundOverlay} />
      </BlurTargetView>
      <TouchableOpacity
        style={styles.themeToggle}
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
        activeOpacity={0.8}
      >
        <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.accentFg} />
      </TouchableOpacity>
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

        {/* Login Form Card */}
        <GlassCard style={styles.formCard} highlighted>
          <BlurView
            intensity={65}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            {...(Platform.OS === "android" ? {
              blurTarget: backgroundRef,
              blurMethod: "dimezisBlurViewSdk31Plus" as const,
            } : {})}
          />
          {/* Same official identity as web, inside the glass login card. */}
          <View style={styles.logoSection}>
            <View style={styles.logoFrame}>
              <Image
                source={require("../../../../assets/kemenhutlogo.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logo Kementerian Kehutanan"
              />
            </View>
            <View style={styles.institutionText}>
              <Text style={styles.ministryTitle}>Kementerian Kehutanan</Text>
              <Text style={styles.institutionSubtitle}>Balai KSDA Kalimantan Timur</Text>
            </View>
          </View>

          <Text style={styles.cardHeader}>Selamat Datang</Text>
          <Text style={styles.cardSub}>Silakan masukkan NIP atau akun resmi Anda untuk mengakses portal BKSDA Kalimantan Timur.</Text>

          {errorMessage && (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={20} color={colors.dangerFg} style={{ marginRight: 8 }} />
              <Text style={styles.errorAlertText}>{errorMessage}</Text>
            </View>
          )}

          {/* Username Input Box */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIP / Username</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, errorMessage && !username.trim() ? styles.inputErrorBorder : null]}
              activeOpacity={1}
              onPress={() => usernameInputRef.current?.focus()}
            >
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputLeftIcon} />
              <TextInput
                ref={usernameInputRef}
                style={styles.input}
                placeholder="Contoh: 19850412 201012 1 002"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Username"
                editable={!isBusy}
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
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
          </View>

          {/* Password Input Box */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, errorMessage && !password ? styles.inputErrorBorder : null]}
              activeOpacity={1}
              onPress={() => passwordInputRef.current?.focus()}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputLeftIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Password"
                editable={!isBusy}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
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
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Submit Login Button */}
          <EmeraldButton
            title={isBusy ? "Memproses..." : "Masuk ke Akun"}
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
            <Ionicons name="finger-print" size={24} color={colors.accentFg} />
            <Text style={styles.biometricText}>Masuk Cepat dengan Biometrik</Text>
          </TouchableOpacity>

          {/* Footer stays inside the glass card in both themes. */}
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Balai KSDA Kalimantan Timur
            {"\n"}
            <Text style={styles.footerInstitution}>Kementerian Kehutanan Republik Indonesia</Text>
          </Text>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createLoginStyles(isDark: boolean, colors: ThemeColors, width: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#123b31",
    },
    backgroundImage: {
      ...StyleSheet.absoluteFill,
      width: "100%",
      height: "100%",
    },
    backgroundOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: isDark ? "rgba(2, 18, 13, 0.62)" : "rgba(5, 35, 27, 0.42)",
    },
    themeToggle: {
      position: "absolute",
      zIndex: 10,
      top: Platform.OS === "web" ? 20 : 48,
      right: 20,
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)",
      backgroundColor: isDark ? "rgba(8,30,24,0.72)" : "rgba(255,255,255,0.7)",
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 40,
      alignItems: "center",
    },
    logoSection: {
      width: "100%",
      maxWidth: 448,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      justifyContent: "flex-start",
      marginBottom: 24,
    },
    logo: {
      width: 48,
      height: 48,
    },
    logoFrame: {
      width: 66,
      height: 66,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
      backgroundColor: "rgba(255,255,255,0.7)",
    },
    institutionText: {
      flexShrink: 1,
    },
    ministryTitle: {
      color: colors.accentFg,
      fontSize: width < 390 ? 13 : 14,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    institutionSubtitle: {
      color: colors.textSecondary,
      fontSize: width < 390 ? 13 : 14,
      marginTop: 2,
    },
    formCard: {
      width: "100%",
      maxWidth: 448,
      padding: 22,
      backgroundColor: isDark ? "rgba(8,30,24,0.48)" : "rgba(255,255,255,0.4)",
      borderColor: isDark ? "rgba(134,239,172,0.45)" : "#059669",
      overflow: "hidden",
    },
    cardHeader: {
      color: colors.textDark,
      fontSize: 26,
      fontWeight: "800",
      marginBottom: 4,
    },
    cardSub: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 16,
    },
    errorAlertBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: RADIUS.input,
      padding: 10,
      marginBottom: 14,
    },
    errorAlertText: {
      color: colors.dangerFg,
      fontSize: 12,
      flex: 1,
    },
    inputGroup: {
      marginBottom: 14,
      width: "100%",
    },
    label: {
      color: colors.textDark,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(2,17,12,0.4)" : "rgba(255,255,255,0.7)",
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: RADIUS.input,
      paddingHorizontal: 12,
      height: 48,
    },
    inputErrorBorder: {
      borderColor: colors.dangerSolid,
    },
    inputLeftIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: colors.textDark,
      fontSize: 14,
      height: "100%",
    },
    clearBtn: {
      padding: 6,
    },
    submitBtn: {
      backgroundColor: "#1e5433",
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
      borderTopColor: colors.glassBorder,
    },
    biometricText: {
      color: colors.accentFg,
      fontSize: 12.5,
      fontWeight: "600",
      marginLeft: 8,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 20,
      textAlign: "center",
    },
    footerInstitution: {
      fontSize: 11,
    },
  });
}
