import React, { createContext, useContext, useState } from "react";

export interface ThemeColors {
  bgDark: string;
  bgSurface: string;
  textDark: string;
  textSecondary: string;
  textMuted: string;
  glassBorder: string;
  borderControl: string;
  cardBg: string;
  surfaceRaised: string;
  surfaceMuted: string;
  headerBg: string;
  headerBorder: string;
  emeraldPrimary: string;
  accentSolid: string;
  accentHover: string;
  accentFg: string;
  accentOnSolid: string;
  accentSoft: string;
  accentSoftBorder: string;
  successBg: string;
  successFg: string;
  successBorder: string;
  warningBg: string;
  warningFg: string;
  warningBorder: string;
  dangerSolid: string;
  dangerBg: string;
  dangerFg: string;
  dangerBorder: string;
  infoBg: string;
  infoFg: string;
  infoBorder: string;
  neutralBg: string;
  neutralFg: string;
  neutralBorder: string;
}

export const PORTAL_5_TOKENS = {
  space: {
    x1: 4,
    x2: 8,
    x3: 12,
    x4: 16,
    x6: 24,
    x8: 32,
    x12: 48,
  },
  type: {
    xs: 12,
    sm: 14,
    xl: 20,
    xxl: 24,
  },
  radius: {
    inner: 8,
    segment: 12,
    card: 24,
    pill: 9999,
    bar: 4,
  },
  shadow: {
    xs: (isDark: boolean) => ({
      shadowColor: isDark ? "#000000" : "#0f172a",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.35 : 0.05,
      shadowRadius: 2,
      elevation: 1,
    }),
    lg: (isDark: boolean) => ({
      shadowColor: isDark ? "#000000" : "#0f172a",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.45 : 0.14,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
} as const;

export const lightColors: ThemeColors = {
  bgDark: "#f8fafc",
  bgSurface: "#ffffff",
  textDark: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#475569",
  glassBorder: "#e2e8f0",
  borderControl: "#7c899a",
  cardBg: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f1f5f9",
  headerBg: "#ffffff",
  headerBorder: "#e2e8f0",
  emeraldPrimary: "#1e5433",
  accentSolid: "#1e5433",
  accentHover: "#164227",
  accentFg: "#1e5433",
  accentOnSolid: "#ffffff",
  accentSoft: "#edf3ee",
  accentSoftBorder: "#dce8dd",
  successBg: "#ecfdf5",
  successFg: "#047857",
  successBorder: "#a7f3d0",
  warningBg: "#fffbeb",
  warningFg: "#92400e",
  warningBorder: "#fde68a",
  dangerSolid: "#be123c",
  dangerBg: "#fff1f2",
  dangerFg: "#be123c",
  dangerBorder: "#fecdd3",
  infoBg: "#eff6ff",
  infoFg: "#1d4ed8",
  infoBorder: "#bfdbfe",
  neutralBg: "#f1f5f9",
  neutralFg: "#475569",
  neutralBorder: "#e2e8f0",
};

export const darkColors: ThemeColors = {
  bgDark: "#09090b",
  bgSurface: "#18181b",
  textDark: "#f8fafc",
  textSecondary: "#d4d4d8",
  textMuted: "#a1a1aa",
  glassBorder: "#3f3f46",
  borderControl: "#71717a",
  cardBg: "#18181b",
  surfaceRaised: "#27272a",
  surfaceMuted: "#27272a",
  headerBg: "#18181b",
  headerBorder: "#3f3f46",
  emeraldPrimary: "#86efac",
  accentSolid: "#86efac",
  accentHover: "#bbf7d0",
  accentFg: "#86efac",
  accentOnSolid: "#0f172a",
  accentSoft: "#0d281a",
  accentSoftBorder: "#24583a",
  successBg: "#022c22",
  successFg: "#6ee7b7",
  successBorder: "#065f46",
  warningBg: "#451a03",
  warningFg: "#fcd34d",
  warningBorder: "#92400e",
  dangerSolid: "#fb7185",
  dangerBg: "#4c0519",
  dangerFg: "#fda4af",
  dangerBorder: "#9f1239",
  infoBg: "#172554",
  infoFg: "#93c5fd",
  infoBorder: "#1e40af",
  neutralBg: "#27272a",
  neutralFg: "#d4d4d8",
  neutralBorder: "#52525b",
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
