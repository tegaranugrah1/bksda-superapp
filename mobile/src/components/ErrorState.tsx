import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Terjadi Kesalahan',
  message,
  onRetry,
}: ErrorStateProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      {/* Error Icon (using cross-platform warning emoji) */}
      <Text style={[styles.icon, { fontSize: typography.fontSizes.xxxl, marginBottom: spacing.md }]}>
        ⚠️
      </Text>

      <Text
        style={[
          styles.title,
          {
            color: colors.danger,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            color: colors.mutedForeground,
            fontSize: typography.fontSizes.sm,
            marginBottom: onRetry ? spacing.lg : 0,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <View style={styles.actionContainer}>
          <AppButton
            title="Coba Lagi"
            onPress={onRetry}
            variant="danger"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
