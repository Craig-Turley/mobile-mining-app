import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { Appearance, View } from 'react-native';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import type { ColorTokens, ThemeName } from './colors';
import { createThemeVars } from './theme-vars';
import { DEFAULT_THEME, getAppTheme } from './app-theme';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  colors: ColorTokens;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_THEME);
  const appearance = getAppTheme(theme);
  const { colors } = appearance;

  useLayoutEffect(() => {
    // NativeWind observes this same Appearance value. Navigation never writes it on focus.
    if (Appearance.getColorScheme() !== theme) Appearance.setColorScheme(theme);
    void SystemUI.setBackgroundColorAsync(colors.background).catch((error) => {
      console.error('Could not update native root background:', error);
    });
    // Keep the app-level override across navigation/unmounts; resetting it flashes the OS theme.
  }, [theme, colors.background]);

  const themeVars = useMemo(() => {
    return createThemeVars(colors);
  }, [colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
      },
      colors,
    }),
    [theme, colors]
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={appearance.navigationTheme}>
        <View style={[themeVars, { flex: 1, backgroundColor: colors.background }]}>
          <StatusBar style={appearance.statusBarStyle} />
          {children}
        </View>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
