import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  accessibilityLabel?: string;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  accessibilityLabel,
}: AppButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  // Determine button styles based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  // Determine text styles based on variant
  const getTextStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          color: colors.secondaryForeground,
        };
      case 'danger':
        return {
          color: colors.dangerForeground,
        };
      case 'ghost':
        return {
          color: colors.primary,
        };
      case 'primary':
      default:
        return {
          color: colors.primaryForeground,
        };
    }
  };

  const buttonStyle = getButtonStyles();
  const textStyle = getTextStyles();
  const isClickable = !disabled && !loading;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!isClickable}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{
        disabled: !isClickable,
        busy: loading,
      }}
      style={[
        styles.button,
        {
          borderRadius: radius.lg,
          paddingHorizontal: spacing.lg,
        },
        buttonStyle,
        disabled && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color} size="small" />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              {
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.semibold,
              },
              textStyle,
              disabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48, // Minimum touch target 48dp
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.8,
  },
});
