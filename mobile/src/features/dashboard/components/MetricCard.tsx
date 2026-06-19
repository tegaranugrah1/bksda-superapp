import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface MetricCardProps {
  count: number;
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
  accessibilityLabel?: string;
}

export default function MetricCard({
  count,
  label,
  variant = 'primary',
  accessibilityLabel,
}: MetricCardProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  // Pick colors based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: colors.success + '10',
          textColor: colors.success,
        };
      case 'warning':
        return {
          bgColor: colors.warning + '10',
          textColor: colors.warning,
        };
      case 'info':
        return {
          bgColor: colors.info + '10',
          textColor: colors.info,
        };
      case 'neutral':
        return {
          bgColor: colors.muted,
          textColor: colors.mutedForeground,
        };
      case 'primary':
      default:
        return {
          bgColor: colors.primary + '10',
          textColor: colors.primary,
        };
    }
  };

  const { bgColor, textColor } = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
      accessibilityLabel={accessibilityLabel || `${label}: ${count}`}
    >
      <View style={[styles.badgeContainer, { backgroundColor: bgColor, borderRadius: radius.md }]}>
        <Text
          style={[
            styles.countText,
            {
              color: textColor,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: typography.fontWeights.bold,
            },
          ]}
        >
          {count}
        </Text>
      </View>
      <Text
        style={[
          styles.labelText,
          {
            color: colors.foreground,
            fontFamily: typography.fontFamilies.sans,
            fontWeight: typography.fontWeights.medium,
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  badgeContainer: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 18,
  },
  labelText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
