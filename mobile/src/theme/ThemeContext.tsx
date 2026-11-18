import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { cancelThemeTransition, startThemeTransition } from "./themeTransition";

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
  toggleTheme: (event?: GestureResponderEvent) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [transitionColor, setTransitionColor] = useState(lightColors.bgDark);
  const [transitionOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    const updatePreference = (reduce: boolean) => {
      if (!mounted) return;
      setReduceMotion(reduce);
      if (reduce) {
        cancelThemeTransition();
        transitionOpacity.stopAnimation();
        transitionOpacity.setValue(0);
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(updatePreference).catch(() => updatePreference(true));
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', updatePreference);
    return () => {
      mounted = false;
      listener.remove();
      cancelThemeTransition();
      transitionOpacity.stopAnimation();
    };
  }, [transitionOpacity]);

  const toggleTheme = (event?: GestureResponderEvent) => {
    transitionOpacity.stopAnimation();
    transitionOpacity.setValue(0);
    const origin = event ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : undefined;
    if (!reduceMotion && startThemeTransition(() => setIsDark((prev) => !prev), origin)) return;
    setTransitionColor(isDark ? darkColors.bgDark : lightColors.bgDark);
    setIsDark((prev) => !prev);
    transitionOpacity.setValue(reduceMotion ? 0 : 0.35);
    if (!reduceMotion) {
      Animated.timing(transitionOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }).start();
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
        {children}
        <Animated.View
          testID="theme-transition-overlay"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            zIndex: 9999,
            backgroundColor: transitionColor, opacity: transitionOpacity,
          }}
        />
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const roundPx = (value: number) => Math.round(value);
const roundHalf = (value: number) => Math.round(value * 2) / 2;

export interface ResponsivePortalMetrics {
  width: number;
  height: number;
  isCompact: boolean;
  isExtraNarrow: boolean;
  isTablet: boolean;
  fontScale: number;
  spaceScale: number;
  space: {
    x1: number;
    x2: number;
    x3: number;
    x4: number;
    x6: number;
    x8: number;
    x12: number;
  };
  type: {
    xs: number;
    sm: number;
    xl: number;
    xxl: number;
  };
  lineHeight: {
    tight: number;
    body: number;
  };
  radius: {
    inner: number;
    segment: number;
    card: number;
    pill: number;
    bar: number;
  };
  size: {
    iconXs: number;
    iconSm: number;
    iconMd: number;
    iconLg: number;
    iconXl: number;
    iconEmpty: number;
    iconBox: number;
    serviceIconBox: number;
    profileAvatar: number;
    fab: number;
    bottomNavHeight: number;
    bottomNavBottom: number;
    bmnPhotoHeight: number;
    scanBodyHeight: number;
    modalScrollMaxH: number;
    maxContentWidth: number | undefined;
  };
  grid: {
    quickStatCols: 1 | 2;
    moduleCols: 2 | 3 | 4;
    bmnCols: 1 | 2 | 3;
  };
}

/**
 * Compute fluid spacing, card sizing, typography, and grid column counts from viewport dimensions.
 */
export function getResponsivePortalMetrics(width: number, height: number): ResponsivePortalMetrics {
  const w = Math.max(width || 390, 280);
  const h = Math.max(height || 800, 480);
  // Use shorter edge in landscape so rotated phones keep readable text instead of tablet scaling.
  const basis = w <= h ? w : Math.min(w, Math.max(h * 1.15, 360));
  const isTablet = w >= 600;
  const maxFontScale = isTablet ? 1.08 : 1.04;
  const maxSpaceScale = isTablet ? 1.15 : 1.05;

  const fontScale = clamp(basis / 412, 0.84, maxFontScale);
  const spaceScale = clamp(basis / 416, 0.76, maxSpaceScale);

  const type = {
    xs: roundHalf(PORTAL_5_TOKENS.type.xs * fontScale),
    sm: roundHalf(PORTAL_5_TOKENS.type.sm * fontScale),
    xl: roundHalf(PORTAL_5_TOKENS.type.xl * fontScale),
    xxl: roundHalf(PORTAL_5_TOKENS.type.xxl * fontScale),
  };

  const space = {
    x1: Math.max(3, roundPx(PORTAL_5_TOKENS.space.x1 * spaceScale)),
    x2: Math.max(6, roundPx(PORTAL_5_TOKENS.space.x2 * spaceScale)),
    x3: Math.max(9, roundPx(PORTAL_5_TOKENS.space.x3 * spaceScale)),
    x4: Math.max(12, roundPx(PORTAL_5_TOKENS.space.x4 * spaceScale)),
    x6: Math.max(18, roundPx(PORTAL_5_TOKENS.space.x6 * spaceScale)),
    x8: Math.max(26, roundPx(PORTAL_5_TOKENS.space.x8 * spaceScale)),
    x12: Math.max(36, roundPx(PORTAL_5_TOKENS.space.x12 * spaceScale)),
  };

  return {
    width: w,
    height: h,
    isCompact: w < 390,
    isExtraNarrow: w < 330,
    isTablet,
    fontScale,
    spaceScale,
    space,
    type,
    lineHeight: {
      tight: Math.max(14, roundPx(type.xs * 1.42)),
      body: Math.max(17, roundPx(type.sm * 1.42)),
    },
    radius: {
      inner: Math.max(6, roundPx(PORTAL_5_TOKENS.radius.inner * spaceScale)),
      segment: Math.max(10, roundPx(PORTAL_5_TOKENS.radius.segment * spaceScale)),
      card: Math.max(16, roundPx(PORTAL_5_TOKENS.radius.card * spaceScale)),
      pill: PORTAL_5_TOKENS.radius.pill,
      bar: Math.max(3, roundPx(PORTAL_5_TOKENS.radius.bar * spaceScale)),
    },
    size: {
      iconXs: Math.max(10, roundPx(12 * fontScale)),
      iconSm: Math.max(12, roundPx(14 * fontScale)),
      iconMd: Math.max(14, roundPx(16 * fontScale)),
      iconLg: Math.max(17, roundPx(20 * fontScale)),
      iconXl: Math.max(24, roundPx(28 * fontScale)),
      iconEmpty: Math.max(28, roundPx(38 * spaceScale)),
      iconBox: space.x8,
      serviceIconBox: Math.max(36, roundPx(44 * spaceScale)),
      profileAvatar: Math.max(44, roundPx(56 * spaceScale)),
      fab: Math.max(46, roundPx(56 * spaceScale)),
      bottomNavHeight: Math.max(54, roundPx(64 * spaceScale)),
      bottomNavBottom: Math.max(12, roundPx(22 * clamp(Math.min(spaceScale, h / 860), 0.72, 1.1))),
      bmnPhotoHeight: Math.max(76, roundPx(96 * spaceScale)),
      scanBodyHeight: Math.max(220, Math.min(460, roundPx(h * 0.48))),
      modalScrollMaxH: Math.max(220, Math.min(420, roundPx(h * 0.44))),
      maxContentWidth: w >= 640 ? 680 : undefined,
    },
    grid: {
      quickStatCols: w < 290 ? 1 : 2,
      moduleCols: w < 300 ? 2 : w < 390 ? 3 : 4,
      bmnCols: w < 320 ? 1 : w >= 600 ? 3 : 2,
    },
  };
}

/**
 * Split items into rows of at most `maxPerRow` so partial rows expand evenly via flex: 1.
 */
export function chunkGridRows<T>(items: readonly T[], maxPerRow: number): T[][] {
  const step = Math.max(1, Math.floor(maxPerRow));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += step) {
    rows.push(items.slice(i, i + step));
  }
  return rows;
}

/**
 * Subscribe to viewport dimension changes and return memoized responsive portal tokens.
 */
export function usePortalResponsive(): ResponsivePortalMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsivePortalMetrics(width, height), [width, height]);
}
