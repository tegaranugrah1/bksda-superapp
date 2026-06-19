import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { AppTextInput } from '@/components/AppTextInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function LoginScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    const nextUsernameError = username.trim() ? '' : 'Username wajib diisi.';
    const nextPasswordError = password ? '' : 'Password wajib diisi.';

    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    setSubmitError('');

    if (nextUsernameError || nextPasswordError) {
      return;
    }

    try {
      await login(username.trim(), password);
    } catch {
      setSubmitError('Login gagal. Periksa username dan password, lalu coba lagi.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            padding: spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.brandMark,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
              },
            ]}
            accessibilityLabel="BKSDA"
          >
            <Text
              style={[
                styles.brandMarkText,
                {
                  color: colors.primaryForeground,
                  fontWeight: typography.fontWeights.bold,
                },
              ]}
            >
              BK
            </Text>
          </View>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            BKSDA SuperApp
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Masuk untuk mengakses BMN dan Surat Tugas.
          </Text>
        </View>

        <View
          style={[
            styles.form,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <AppTextInput
            label="Username"
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              if (usernameError) setUsernameError('');
              if (submitError) setSubmitError('');
            }}
            placeholder="Masukkan username"
            error={usernameError}
            disabled={isLoading}
          />
          <AppTextInput
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError('');
              if (submitError) setSubmitError('');
            }}
            placeholder="Masukkan password"
            error={passwordError}
            secureTextEntry
            disabled={isLoading}
          />

          {submitError ? (
            <Text
              accessibilityLiveRegion="assertive"
              style={[
                styles.submitError,
                {
                  color: colors.danger,
                  marginBottom: spacing.md,
                },
              ]}
            >
              {submitError}
            </Text>
          ) : null}

          <AppButton
            title="Masuk"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            accessibilityLabel="Masuk"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  brandMark: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  brandMarkText: {
    fontSize: 18,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  form: {
    borderWidth: 1,
    width: '100%',
  },
  submitError: {
    fontSize: 14,
    lineHeight: 20,
  },
});
