import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type EmptyStateProps = {
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${message || ''}`}
      style={[styles.container, { padding: spacing.xxl }]}
    >
      {/* Icon/Illustration Placeholder (using a modern cross-platform emoji) */}
      <Text
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
        style={[styles.icon, { fontSize: typography.fontSizes.xxxl, marginBottom: spacing.md }]}
      >
        📭
      </Text>

      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>

      {message && (
        <Text
          style={[
            styles.message,
            {
              color: colors.mutedForeground,
              fontSize: typography.fontSizes.sm,
              marginBottom: action ? spacing.lg : 0,
            },
          ]}
        >
          {message}
        </Text>
      )}

      {action && <View style={styles.actionContainer}>{action}</View>}
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
    opacity: 0.6,
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
