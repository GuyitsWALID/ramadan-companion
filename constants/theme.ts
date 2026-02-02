// Modern Islamic-inspired color palette
// Light mode colors (default)
export const lightColors = {
  // Primary colors
  primary: "#0D5C4D",      // Deep teal - main brand color
  primaryLight: "#1A8A75", // Lighter teal
  primaryDark: "#073D33",  // Darker teal
  
  // Secondary colors
  secondary: "#D4AF37",    // Islamic gold
  secondaryLight: "#E5C767",
  secondaryDark: "#B8960C",
  
  // Accent colors
  accent: "#2E7D5A",       // Emerald green
  accentLight: "#4CAF7D",
  
  // Backgrounds
  background: "#FAFBFC",   // Clean off-white
  surface: "#FFFFFF",      // Pure white cards
  surfaceElevated: "#F5F7F9",
  
  // Text colors
  text: "#1A1D21",         // Near black for primary text
  textSecondary: "#5C6670", // Gray for secondary text
  textMuted: "#9CA3AF",    // Light gray for muted text
  textOnPrimary: "#FFFFFF", // White text on primary color
  
  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Border colors
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  
  // Special
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.08)",
};

// Dark mode colors
export const darkColors = {
  // Primary colors (slightly brighter for dark mode)
  primary: "#1A9A80",      // Brighter teal for dark mode
  primaryLight: "#2ABFA0", // Even lighter
  primaryDark: "#0D5C4D",  // Original as dark
  
  // Secondary colors (gold works well in both modes)
  secondary: "#E5C767",    // Brighter gold
  secondaryLight: "#F5D87D",
  secondaryDark: "#D4AF37",
  
  // Accent colors
  accent: "#4CAF7D",       // Brighter emerald
  accentLight: "#6BCF9D",
  
  // Backgrounds - dark surfaces
  background: "#0F1419",   // Very dark blue-gray
  surface: "#1A1F26",      // Dark card background
  surfaceElevated: "#242B35",  // Elevated surface
  
  // Text colors - inverted for dark mode
  text: "#F7FAFC",         // Off-white for primary text
  textSecondary: "#A0AEC0", // Light gray for secondary
  textMuted: "#718096",    // Muted text
  textOnPrimary: "#FFFFFF", // White stays white
  
  // Status colors (slightly adjusted for dark mode visibility)
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#60A5FA",
  
  // Border colors - darker variants
  border: "#2D3748",
  borderLight: "#1E2530",
  
  // Special
  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.3)",
};

// Default to light colors (will be dynamically swapped by ThemeContext)
export let colors = { ...lightColors };

// Function to update colors based on theme
export function setThemeColors(isDark: boolean): void {
  colors = isDark ? darkColors : lightColors;
}

// Get colors for a specific theme
export function getThemeColors(isDark: boolean): typeof lightColors {
  return isDark ? darkColors : lightColors;
}

// Typography using Inter font
export const typography = {
  fonts: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extraBold: "Inter_800ExtraBold",
  },
  sizes: {
    xxs: 9,
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

// Shadows (these will use colors dynamically)
export const getShadows = (isDark: boolean) => {
  const shadowColor = isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.08)";
  return {
    sm: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 6,
    },
  };
};

// Default shadows (light mode)
export const shadows = getShadows(false);

// Common component styles
export const commonStyles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  commonStyles,
};
