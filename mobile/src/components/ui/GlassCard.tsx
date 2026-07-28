import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, highlighted = false }) => {
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
    backgroundColor: COLORS.bgCardGlass,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 16,
  },
  highlightedCard: {
    borderColor: COLORS.glassBorderHighlight,
    backgroundColor: "rgba(16, 78, 59, 0.4)",
  },
});
