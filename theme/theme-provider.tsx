import React, { createContext, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import { darkColors, lightColors, type ThemeName } from "./colors";
import { createThemeVars } from "./theme-vars";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("dark");

  const themeVars = useMemo(() => {
    return createThemeVars(theme === "dark" ? darkColors : lightColors);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => {
        setTheme((current) => (current === "dark" ? "light" : "dark"));
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={themeVars} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return context;
}
