import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type OfflineBannerProps = {
  visible?: boolean;
  message?: string;
};

export function OfflineBanner({
  visible = true,
  message = 'Tidak ada koneksi internet. Beberapa data mungkin belum terbaru.',
}: OfflineBannerProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.warning,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Banner offline"
      accessibilityLiveRegion="polite"
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.warningForeground,
            fontWeight: typography.fontWeights.semibold,
          },
        ]}
      >
        Mode Offline
      </Text>
      <Text style={[styles.message, { color: colors.warningForeground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
