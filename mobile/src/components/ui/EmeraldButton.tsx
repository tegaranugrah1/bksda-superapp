import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../theme";

interface EmeraldButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const EmeraldButton: React.FC<EmeraldButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
  textStyle,
}) => {
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isOutline && styles.buttonOutline,
        isSecondary && styles.buttonSecondary,
        !isOutline && !isSecondary && SHADOWS.glowEmerald,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.emeraldElectric : COLORS.textDark} />
      ) : (
        <Text
          style={[
            styles.text,
            isOutline && styles.textOutline,
            isSecondary && styles.textSecondary,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.emeraldElectric,
    borderRadius: RADIUS.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonSecondary: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.glassBorderHighlight,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.emeraldElectric,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  textSecondary: {
    color: COLORS.textMint,
  },
  textOutline: {
    color: COLORS.emeraldElectric,
  },
});
