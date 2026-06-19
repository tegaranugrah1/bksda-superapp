import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type StatusBadgeProps = {
  text: string;
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
};

export function StatusBadge({ text, status }: StatusBadgeProps) {
  const { isDark, spacing, radius, typography } = useAppTheme();

  // Color mapping for badge styles
  const getBadgeColors = () => {
    if (isDark) {
      switch (status) {
        case 'success':
          return { bg: '#064e3b', text: '#a7f3d0' };
        case 'warning':
          return { bg: '#78350f', text: '#fde68a' };
        case 'danger':
          return { bg: '#7f1d1d', text: '#fecaca' };
        case 'info':
          return { bg: '#1e3a8a', text: '#bfdbfe' };
        case 'neutral':
        default:
          return { bg: '#1f2937', text: '#e5e7eb' };
      }
    } else {
      switch (status) {
        case 'success':
          return { bg: '#d1fae5', text: '#065f46' };
        case 'warning':
          return { bg: '#fef3c7', text: '#92400e' };
        case 'danger':
          return { bg: '#fee2e2', text: '#991b1b' };
        case 'info':
          return { bg: '#dbeafe', text: '#1e40af' };
        case 'neutral':
        default:
          return { bg: '#f3f4f6', text: '#374151' };
      }
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
