import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: SectionCardProps) {
  const { colors, spacing, radius, typography, shadows } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderColor: colors.border,
          borderWidth: 1,
          ...shadows.sm, // Using a clean, subtle shadow
        },
      ]}
    >
      {/* Header Container */}
      <View style={[styles.header, { marginBottom: spacing.md }]}>
        <View accessibilityRole="header" style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.mutedForeground,
                  fontSize: typography.fontSizes.xs,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {action && <View style={styles.actionContainer}>{action}</View>}
      </View>

      {/* Content Container */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    flexShrink: 1,
  },
  subtitle: {
    flexShrink: 1,
  },
  actionContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
});
