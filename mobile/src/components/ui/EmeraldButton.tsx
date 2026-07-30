import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { COLORS, RADIUS } from "../../theme";

export interface EmeraldButtonProps extends TouchableOpacityProps {
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
  ...props
}) => {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      {...props}
      style={[
        styles.button,
        isPrimary && styles.primaryBtn,
        variant === "secondary" && styles.secondaryBtn,
        isOutline && styles.outlineBtn,
        (disabled || loading) && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.emeraldElectric : COLORS.textWhite} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            variant === "secondary" && styles.secondaryText,
            isOutline && styles.outlineText,
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
    height: 48,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryBtn: {
    backgroundColor: COLORS.emeraldElectric,
  },
  secondaryBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  outlineBtn: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.emeraldElectric,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryText: {
    color: COLORS.textWhite,
  },
  secondaryText: {
    color: COLORS.textDark,
  },
  outlineText: {
    color: COLORS.emeraldElectric,
  },
});
