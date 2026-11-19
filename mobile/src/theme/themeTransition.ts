// Native platforms keep the Animated fade in ThemeProvider.
export const startThemeTransition: (
  update: () => void,
  origin?: { x: number; y: number }
) => boolean = () => false;

export const cancelThemeTransition = () => {};
