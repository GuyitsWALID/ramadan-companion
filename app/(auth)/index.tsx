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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

type AuthStep = "email" | "verify";

export default function AuthScreen() {
  const { signInWithEmail, verifyCode } = useAuth();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await signInWithEmail(email);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await verifyCode(fullCode);
      if (result.needsOnboarding) {
        router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    
    // Handle paste
    if (text.length > 1) {
      const pastedCode = text.slice(0, 6).split("");
      for (let i = 0; i < pastedCode.length; i++) {
        newCode[i] = pastedCode[i];
      }
      setCode(newCode);
      return;
    }

    newCode[index] = text;
    setCode(newCode);
  };

  const renderEmailStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={48} color={colors.primary} />
      </View>
      
      <Text style={styles.title}>Sign in with Email</Text>
      <Text style={styles.subtitle}>
        Enter your email to receive a verification code.{"\n"}
        <Text style={styles.demoNotice}>(Demo: Code will appear in a popup)</Text>
      </Text>

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
          autoFocus
        />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Send Magic Link</Text>
            <Ionicons name="sparkles" size={20} color={colors.textOnPrimary} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity 
        style={[styles.socialButton, styles.socialButtonDisabled]}
        disabled
        onPress={() => {}}
      >
        <Ionicons name="logo-google" size={24} color={colors.textMuted} />
        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Continue with Google</Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.socialButton, styles.socialButtonDisabled]}
        disabled
        onPress={() => {}}
      >
        <Ionicons name="logo-apple" size={24} color={colors.textMuted} />
        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Continue with Apple</Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
      </View>
      
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit verification code to{"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : null,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Verify Code</Text>
            <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setStep("email");
          setCode(["", "", "", "", "", ""]);
          setError("");
        }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Use a different email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={handleSendCode}>
        <Text style={styles.resendText}>
          Didn't receive the code? <Text style={styles.resendLink}>Resend</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header decoration */}
        <View style={styles.headerDecoration}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.moonContainer}>
            <Ionicons name="moon" size={40} color={colors.secondary} />
          </View>
        </View>

        {step === "email" ? renderEmailStep() : renderVerifyStep()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{" "}
            <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  emailHighlight: {
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  inputIcon: {
    paddingLeft: spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: "center",
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
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
    marginBottom: spacing.lg,
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
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  resendText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  resendLink: {
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
  demoNotice: {
    fontFamily: typography.fonts.medium,
    color: colors.secondary,
    fontSize: typography.sizes.sm,
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
