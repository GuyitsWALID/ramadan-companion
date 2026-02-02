/**
 * Theme Context
 * Manages dark/light mode theme throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, getThemeColors, getShadows } from "../constants/theme";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  // Current state
  themeMode: ThemeMode;
  isDark: boolean;
  
  // Theme colors and shadows for the current mode
  colors: typeof lightColors;
  shadows: ReturnType<typeof getShadows>;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = "@app_theme_mode";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate if we're in dark mode based on theme mode and system preference
  const isDark = useMemo(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark";
    }
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  // Get theme colors and shadows based on dark mode
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const shadows = useMemo(() => getShadows(isDark), [isDark]);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only affects if we're in system mode
      if (themeMode === "system") {
        // The component will re-render automatically due to useColorScheme
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    } finally {
      setIsInitialized(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const toggleTheme = async () => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    await setThemeMode(nextMode);
  };

  const value: ThemeContextType = {
    themeMode,
    isDark,
    colors,
    shadows,
    setThemeMode,
    toggleTheme,
  };

  // Don't render until we've loaded the saved preference
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Hook for components that just need colors
export function useColors() {
  const { colors } = useTheme();
  return colors;
}

// Hook for components that just need to know if dark mode
export function useIsDark() {
  const { isDark } = useTheme();
  return isDark;
}

export default ThemeContext;
