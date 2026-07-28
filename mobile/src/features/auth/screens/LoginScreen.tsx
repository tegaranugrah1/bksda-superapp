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
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../../../theme";
import { GlassCard } from "../../../components/ui/GlassCard";
import { EmeraldButton } from "../../../components/ui/EmeraldButton";
import { useAuth } from "../AuthProvider";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan NIP atau Username.");
      return;
    }
    if (!password) {
      Alert.alert("Perhatian", "Silakan masukkan Kata Sandi.");
      return;
    }

    setErrorMessage(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal masuk. Periksa username & kata sandi Anda.");
    }
  };

  const handleFillTestAccount = () => {
    setUsername("superadmin");
    setPassword("Lolipop@147258379");
    setErrorMessage(null);
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
        {/* Top Crest Logomark */}
        <View style={styles.logoSection}>
          <Image
            source={{ uri: "https://bksdakaltim.net/assets/img/logobksda.png" }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.portalTitle}>BALAI KONSERVASI SUMBER DAYA ALAM</Text>
          <Text style={styles.portalSubtitle}>KALIMANTAN TIMUR</Text>
          <View style={styles.goldBadge}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.emeraldElectric} style={{ marginRight: 4 }} />
            <Text style={styles.goldBadgeText}>SIMONDOK MOBILE PORTAL</Text>
          </View>
        </View>

        {/* Login Form Card */}
        <GlassCard style={styles.formCard} highlighted>
          <Text style={styles.cardHeader}>Masuk ke Akun Anda</Text>
          <Text style={styles.cardSub}>Gunakan NIP / Username yang terdaftar di Superapp</Text>

          {errorMessage && (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorAlertText}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Quick Fill Test Account Chip */}
          <TouchableOpacity
            style={styles.testAccountChip}
            onPress={handleFillTestAccount}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={14} color={COLORS.emeraldElectric} style={{ marginRight: 6 }} />
            <Text style={styles.testAccountText}>Isi Akun Test Super Admin</Text>
          </TouchableOpacity>

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIP / Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMint} style={styles.inputLeftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contoh: 19850412 201012 1 002"
                placeholderTextColor="rgba(167, 243, 208, 0.35)"
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => setUsername("")} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMint} style={{ opacity: 0.6 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMint} style={styles.inputLeftIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="rgba(167, 243, 208, 0.35)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.clearBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={COLORS.textMint}
                  style={{ opacity: 0.7 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Login Button */}
          <EmeraldButton
            title={isLoading ? "MEMPROSES..." : "MASUK KE SUPERAPP ➔"}
            onPress={handleLogin}
            loading={isLoading}
            style={[styles.submitBtn, SHADOWS.glowEmerald]}
          />

          {/* Biometric Quick Login Option */}
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={() => Alert.alert("Login Biometrik", "Pindai Sidik Jari / FaceID untuk masuk instan.")}
            activeOpacity={0.7}
          >
            <Ionicons name="finger-print" size={24} color={COLORS.emeraldElectric} />
            <Text style={styles.biometricText}>Masuk Cepat dengan Biometrik</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Footer info */}
        <Text style={styles.footerText}>
          Kementerian Lingkungan Hidup dan Kehutanan © 2026
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 84,
    height: 84,
    marginBottom: 12,
  },
  portalTitle: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  portalSubtitle: {
    color: COLORS.emeraldElectric,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 2,
  },
  goldBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: RADIUS.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  goldBadgeText: {
    color: COLORS.emeraldElectric,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  formCard: {
    width: "100%",
    padding: 22,
  },
  cardHeader: {
    color: COLORS.textWhite,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSub: {
    color: COLORS.textMint,
    fontSize: 12.5,
    opacity: 0.8,
    marginBottom: 16,
  },
  errorAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: RADIUS.input,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
  },
  testAccountChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  testAccountText: {
    color: COLORS.emeraldElectric,
    fontSize: 12,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    color: COLORS.textMint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 26, 18, 0.75)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 48,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 14,
  },
  clearBtn: {
    padding: 4,
  },
  submitBtn: {
    marginTop: 8,
    height: 50,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  biometricText: {
    color: COLORS.emeraldElectric,
    fontSize: 12.5,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 24,
    textAlign: "center",
    opacity: 0.6,
  },
});
