import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { COLORS, RADIUS } from "../../theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { EmeraldButton } from "../../components/ui/EmeraldButton";

interface LoginScreenProps {
  onLoginSuccess: (nip: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("19850412 201012 1 002");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan NIP/Username dan Password Anda.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(username.trim());
    }, 800);
  };

  const handleBiometricLogin = () => {
    Alert.alert("Biometrik", "Verifikasi Sidik Jari berhasil!", [
      { text: "Lanjutkan", onPress: () => onLoginSuccess("19850412 201012 1 002") },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={{ uri: "https://bksdakaltim.net/assets/img/logokemenhut.png" }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.logoDivider} />
            <Image
              source={{ uri: "https://bksdakaltim.net/assets/img/logobksda.png" }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>BKSDA Kaltim Superapp</Text>
          <Text style={styles.subtitle}>
            Sistem Informasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur
          </Text>
        </View>

        {/* Login Form Glass Card */}
        <GlassCard style={styles.formCard} highlighted>
          <Text style={styles.formTitle}>Masuk ke Akun Staf</Text>

          {/* Username / NIP Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIP / Username</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan NIP 18 Digit atau Username"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan Kata Sandi"
                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPassword ? "👁️" : "🙈"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Options Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Ingat Saya</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert("Bantuan", "Silakan hubungi Subbag TU untuk reset password.")}>
              <Text style={styles.forgotText}>Lupa Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <EmeraldButton
            title="MASUK KE APLIKASI  ➔"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          {/* Biometric Secondary Button */}
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleBiometricLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.biometricIcon}>👆</Text>
            <Text style={styles.biometricText}>Login dengan Sidik Jari / Touch ID</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BKSDA Kaltim © 2026. Mobile App v1.0</Text>
          <Text style={styles.footerSubtext}>Kementerian Lingkungan Hidup dan Kehutanan RI</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    width: 48,
    height: 48,
  },
  logoDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.glassBorder,
    marginHorizontal: 16,
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textMint,
    fontSize: 12.5,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 18,
    opacity: 0.85,
  },
  formCard: {
    padding: 22,
  },
  formTitle: {
    color: COLORS.textWhite,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textMint,
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 26, 18, 0.7)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 4,
  },
  eyeText: {
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.emeraldElectric,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.emeraldElectric,
  },
  checkmark: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: "900",
  },
  rememberText: {
    color: COLORS.textMint,
    fontSize: 12.5,
  },
  forgotText: {
    color: COLORS.emeraldElectric,
    fontSize: 12.5,
    fontWeight: "600",
  },
  loginBtn: {
    marginTop: 8,
    height: 50,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  biometricIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  biometricText: {
    color: COLORS.textMint,
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  footerSubtext: {
    color: "rgba(167, 243, 208, 0.4)",
    fontSize: 11,
    marginTop: 4,
  },
});
