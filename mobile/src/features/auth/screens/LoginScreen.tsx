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
        {/* Top Crest Logomark using Official Logo Asset */}
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
              <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorAlertText}>{errorMessage}</Text>
            </View>
          )}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIP / Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputLeftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contoh: 19850412 201012 1 002"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => setUsername("")} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputLeftIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#94a3b8"
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
                  color="#64748b"
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
            <Ionicons name="finger-print" size={24} color="#059669" />
            <Text style={styles.biometricText}>Masuk Cepat dengan Biometrik</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Footer info updated to Ministry of Forestry */}
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
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 86,
    height: 86,
    marginBottom: 12,
  },
  portalTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  portalSubtitle: {
    color: "#059669",
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSub: {
    color: "#64748b",
    fontSize: 12.5,
    marginBottom: 18,
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
    marginBottom: 16,
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
    height: 46,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#0f172a",
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
    marginTop: 24,
    textAlign: "center",
  },
});
