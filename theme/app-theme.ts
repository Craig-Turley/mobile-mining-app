import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { darkColors, lightColors, type ColorTokens, type ThemeName } from './colors';

// Dark is the only exposed choice for now. Keep all appearance outputs derived from it.
export const DEFAULT_THEME: ThemeName = 'dark';

function navigationTheme(base: Theme, colors: ColorTokens): Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.foreground,
      border: colors.border,
      notification: colors.primary,
    },
  };
}

const themes = {
  light: {
    colors: lightColors,
    navigationTheme: navigationTheme(DefaultTheme, lightColors),
    statusBarStyle: 'dark' as const,
  },
  dark: {
    colors: darkColors,
    navigationTheme: navigationTheme(DarkTheme, darkColors),
    statusBarStyle: 'light' as const,
  },
};

export function getAppTheme(theme: ThemeName) {
  return themes[theme];
}
