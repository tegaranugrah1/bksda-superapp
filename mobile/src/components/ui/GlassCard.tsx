import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  highlighted = false,
}) => {
  return (
    <View
      style={[
        styles.card,
        highlighted && styles.highlightedCard,
        SHADOWS.cardGlass,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  highlightedCard: {
    borderColor: COLORS.emeraldElectric,
  },
});
