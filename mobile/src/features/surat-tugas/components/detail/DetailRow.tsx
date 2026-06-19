import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface DetailRowProps {
  label: string;
  value?: React.ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  const { colors, spacing, typography } = useAppTheme();

  if (value === undefined || value === null || value === '') {
    return null;
  }

  return (
    <View style={[styles.row, { marginBottom: spacing.sm }]}>
      <Text
        style={[
          styles.label,
          {
            color: colors.mutedForeground,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
          },
        ]}
      >
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text
          style={[
            styles.value,
            {
              color: colors.foreground,
              fontSize: typography.fontSizes.sm,
            },
          ]}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  label: {
    lineHeight: 16,
    marginBottom: 2,
  },
  value: {
    flexShrink: 1,
    lineHeight: 20,
  },
});
