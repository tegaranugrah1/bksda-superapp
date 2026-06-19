import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type AppTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  multiline?: boolean;
  disabled?: boolean;
};

export function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  disabled = false,
}: AppTextInputProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) {
      return colors.danger;
    }
    if (isFocused) {
      return colors.primary;
    }
    return colors.border;
  };

  return (
    <View style={styles.container}>
      {/* Label is always rendered */}
      <Text
        style={[
          styles.label,
          {
            color: error ? colors.danger : colors.foreground,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={label}
        accessibilityHint={helperText}
        accessibilityState={{
          disabled,
        }}
        // Screen reader custom invalid flag
        aria-invalid={!!error}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: getBorderColor(),
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: typography.fontSizes.md,
            backgroundColor: disabled ? colors.muted : 'transparent',
            minHeight: multiline ? 100 : 48,
          },
        ]}
      />

      {/* Error text is visible below input */}
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: typography.fontSizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.mutedForeground,
              fontSize: typography.fontSizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    alignSelf: 'flex-start',
  },
  helperText: {
    alignSelf: 'flex-start',
  },
});
