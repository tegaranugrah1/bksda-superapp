import { useColorScheme } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '@/theme/tokens';

export function useAppTheme() {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? colors.dark : colors.light;

  return {
    colors: themeColors,
    spacing,
    typography,
    radius,
    shadows,
    isDark: scheme === 'dark',
  };
}
