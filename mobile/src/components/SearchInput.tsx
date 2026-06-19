import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  accessibilityLabel?: string;
};

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onClear,
  accessibilityLabel = 'Cari',
}: SearchInputProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.card,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      {/* Left Search Icon (unicode emoji/icon for cross-platform robustness) */}
      <Text style={[styles.searchIcon, { fontSize: typography.fontSizes.md, color: colors.mutedForeground }]}>
        🔍
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.input,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.md,
          },
        ]}
      />

      {/* Clear button when value is not empty */}
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          accessibilityLabel="Bersihkan pencarian"
          accessibilityRole="button"
          style={styles.clearButton}
        >
          <Text style={[styles.clearIcon, { fontSize: typography.fontSizes.sm, color: colors.mutedForeground }]}>
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 48, // Minimum height 48dp
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearIcon: {
    fontWeight: 'bold',
  },
});
