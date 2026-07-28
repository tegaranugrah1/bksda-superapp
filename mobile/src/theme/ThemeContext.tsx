import React, { createContext, useContext, useState } from "react";

export interface ThemeColors {
  bgDark: string;
  bgSurface: string;
  textDark: string;
  textMuted: string;
  glassBorder: string;
  cardBg: string;
  headerBg: string;
  headerBorder: string;
  emeraldPrimary: string;
}

export const lightColors: ThemeColors = {
  bgDark: "#f8fafc",
  bgSurface: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  glassBorder: "#e2e8f0",
  cardBg: "#ffffff",
  headerBg: "#ffffff",
  headerBorder: "#e2e8f0",
  emeraldPrimary: "#059669",
};

export const darkColors: ThemeColors = {
  bgDark: "#061a12",
  bgSurface: "#092318",
  textDark: "#ffffff",
  textMuted: "#a7f3d0",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  cardBg: "rgba(15, 41, 30, 0.85)",
  headerBg: "rgba(15, 41, 30, 0.95)",
  headerBorder: "rgba(255, 255, 255, 0.12)",
  emeraldPrimary: "#10b981",
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
