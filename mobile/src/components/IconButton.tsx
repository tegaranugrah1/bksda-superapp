import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string; // Mandatory, not optional
  variant?: 'plain' | 'soft' | 'danger';
  disabled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  disabled = false,
}: IconButtonProps) {
  const { colors, spacing, radius, isDark } = useAppTheme();

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'soft':
        return {
          backgroundColor: colors.secondary,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: isDark ? '#450a0a' : '#fee2e2',
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'plain':
      default:
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          borderRadius: radius.full, // Circle shape for icon button
          padding: spacing.sm,
        },
        variantStyle,
        disabled && styles.disabledButton,
      ]}
    >
      <View style={styles.iconContainer}>{icon}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,  // Minimum touch target 48dp
    height: 48, // Minimum touch target 48dp
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
