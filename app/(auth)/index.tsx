import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, spacing, borderRadius, getShadows } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

type AuthMode = "signIn" | "signUp";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { colors, isDark } = useTheme();
  const shadows = getShadows(isDark);
  const styles = getStyles(colors, shadows);

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (mode === "signUp" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signUp") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // Navigation handled by NavigationGuard in _layout.tsx
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header decoration */}
          <View style={styles.headerDecoration}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.moonContainer}>
              <Ionicons name="moon" size={40} color={colors.secondary} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={mode === "signIn" ? "log-in-outline" : "person-add-outline"}
                size={48}
                color={colors.primary}
              />
            </View>

            <Text style={styles.title}>
              {mode === "signIn" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signIn"
                ? "Sign in to continue your Ramadan journey"
                : "Start your blessed Ramadan companion experience"}
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password (Sign up only) */}
            {mode === "signUp" && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {mode === "signIn" ? "Sign In" : "Create Account"}
                  </Text>
                  <Ionicons
                    name={mode === "signIn" ? "arrow-forward" : "checkmark-circle"}
                    size={20}
                    color={colors.textOnPrimary}
                  />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {mode === "signIn"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={styles.toggleLink}>
                  {mode === "signIn" ? "Sign Up" : "Sign In"}
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonDisabled]}
              disabled
            >
              <Ionicons name="logo-google" size={24} color={colors.textMuted} />
              <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>
                Continue with Google
              </Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonDisabled]}
              disabled
            >
              <Ionicons name="logo-apple" size={24} color={colors.textMuted} />
              <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>
                Continue with Apple
              </Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{" "}
              <Text style={styles.footerLink} onPress={() => router.push("/privacy")}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    headerDecoration: {
      height: 120,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
    },
    decorCircle1: {
      position: "absolute",
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primary + "10",
      top: -100,
      right: -50,
    },
    decorCircle2: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: colors.secondary + "15",
      top: -50,
      left: -30,
    },
    moonContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.lg,
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.sizes.xxl,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: typography.sizes.md * 1.5,
      marginBottom: spacing.xxl,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    inputIcon: {
      paddingLeft: spacing.lg,
    },
    eyeIcon: {
      paddingRight: spacing.lg,
      paddingVertical: spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.medium,
      color: colors.text,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.medium,
      color: colors.error,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
      ...shadows.md,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.semiBold,
      color: colors.textOnPrimary,
    },
    toggleButton: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    toggleText: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
    },
    toggleLink: {
      fontFamily: typography.fonts.semiBold,
      color: colors.primary,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      paddingHorizontal: spacing.lg,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
    },
    socialButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      gap: spacing.md,
      marginBottom: spacing.sm,
      position: "relative",
    },
    socialButtonDisabled: {
      opacity: 0.6,
      backgroundColor: colors.surfaceElevated,
    },
    socialButtonText: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
    },
    socialButtonTextDisabled: {
      color: colors.textMuted,
    },
    comingSoonBadge: {
      position: "absolute",
      right: spacing.sm,
      backgroundColor: colors.secondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    comingSoonText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bold,
      color: colors.textOnPrimary,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    footerText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: typography.sizes.xs * 1.6,
    },
    footerLink: {
      color: colors.primary,
      fontFamily: typography.fonts.medium,
    },
  });
