import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to\nRamadan Companion",
    subtitle: "Your personal guide for a blessed Ramadan journey",
    icon: "moon",
  },
  {
    id: "name",
    title: "What should we\ncall you?",
    subtitle: "We'll use this to personalize your experience",
    icon: "person",
  },
  {
    id: "location",
    title: "Set your location",
    subtitle: "For accurate prayer times and Qibla direction",
    icon: "location",
  },
  {
    id: "prayer",
    title: "Prayer calculation",
    subtitle: "Choose your preferred calculation method",
    icon: "time",
  },
  {
    id: "goals",
    title: "Set your goals",
    subtitle: "Customize your Quran reading and reminder preferences",
    icon: "flag",
  },
];

const calculationMethods = [
  { id: "MuslimWorldLeague", name: "Muslim World League", region: "Global" },
  { id: "Egyptian", name: "Egyptian General Authority", region: "Africa, Syria, Lebanon" },
  { id: "Karachi", name: "University of Islamic Sciences", region: "Pakistan, Bangladesh" },
  { id: "UmmAlQura", name: "Umm al-Qura", region: "Saudi Arabia" },
  { id: "NorthAmerica", name: "ISNA", region: "North America" },
  { id: "Dubai", name: "Dubai", region: "UAE" },
];

const madhabs = [
  { id: "Shafi", name: "Shafi'i", description: "Earlier Asr time" },
  { id: "Hanafi", name: "Hanafi", description: "Later Asr time" },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Form data
  const [name, setName] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState("MuslimWorldLeague");
  const [madhab, setMadhab] = useState("Shafi");
  const [quranGoal, setQuranGoal] = useState(20);
  const [prayerReminders, setPrayerReminders] = useState(true);
  const [ramadanReminders, setRamadanReminders] = useState(true);

  const goToStep = (stepIndex: number) => {
    scrollViewRef.current?.scrollTo({ x: stepIndex * width, animated: true });
    setCurrentStep(stepIndex);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Try to get city name
      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: reverseGeocode?.city || reverseGeocode?.district || undefined,
        country: reverseGeocode?.country || undefined,
      });
    } catch (error) {
      console.error("Error getting location:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        name,
        location: location || undefined,
        calculationMethod,
        madhab,
        prayerReminders,
        quranGoal,
        ramadanReminders,
      });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case "name":
        return name.trim().length >= 2;
      case "location":
        return location !== null;
      default:
        return true;
    }
  };

  const renderStepContent = (step: OnboardingStep, index: number) => {
    switch (step.id) {
      case "welcome":
        return (
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="moon" size={80} color={colors.secondary} />
            </View>
            <Text style={styles.welcomeText}>
              Prepare for a spiritually enriching Ramadan with personalized prayer times, 
              Quran reading plans, and mindful reminders.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: "time-outline", text: "Accurate prayer times for your location" },
                { icon: "book-outline", text: "Personalized Quran reading goals" },
                { icon: "notifications-outline", text: "Sehri & Iftar reminders" },
                { icon: "compass-outline", text: "Qibla direction finder" },
              ].map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case "name":
        return (
          <View style={styles.formContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
              />
            </View>
          </View>
        );

      case "location":
        return (
          <View style={styles.formContent}>
            {location ? (
              <View style={styles.locationCard}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={styles.locationCity}>
                  {location.city || "Location detected"}
                </Text>
                <Text style={styles.locationCountry}>
                  {location.country || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                </Text>
                <TouchableOpacity
                  style={styles.changeLocationButton}
                  onPress={handleGetLocation}
                >
                  <Text style={styles.changeLocationText}>Update Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetLocation}
                disabled={locationLoading}
              >
                <Ionicons
                  name={locationLoading ? "hourglass-outline" : "location"}
                  size={32}
                  color={colors.textOnPrimary}
                />
                <Text style={styles.locationButtonText}>
                  {locationLoading ? "Detecting..." : "Detect My Location"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case "prayer":
        return (
          <View style={styles.formContent}>
            <Text style={styles.sectionLabel}>Calculation Method</Text>
            <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
              {calculationMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.optionCard,
                    calculationMethod === method.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setCalculationMethod(method.id)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionTitle,
                      calculationMethod === method.id && styles.optionTitleSelected,
                    ]}>
                      {method.name}
                    </Text>
                    <Text style={styles.optionSubtitle}>{method.region}</Text>
                  </View>
                  {calculationMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Asr Calculation</Text>
              {madhabs.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.optionCard,
                    madhab === m.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setMadhab(m.id)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionTitle,
                      madhab === m.id && styles.optionTitleSelected,
                    ]}>
                      {m.name}
                    </Text>
                    <Text style={styles.optionSubtitle}>{m.description}</Text>
                  </View>
                  {madhab === m.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case "goals":
        return (
          <View style={styles.formContent}>
            <Text style={styles.sectionLabel}>Daily Quran Goal</Text>
            <View style={styles.goalSelector}>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setQuranGoal(Math.max(5, quranGoal - 5))}
              >
                <Ionicons name="remove" size={24} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.goalDisplay}>
                <Text style={styles.goalValue}>{quranGoal}</Text>
                <Text style={styles.goalLabel}>verses/day</Text>
              </View>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setQuranGoal(Math.min(100, quranGoal + 5))}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>Notifications</Text>
            
            <TouchableOpacity
              style={[styles.toggleCard, prayerReminders && styles.toggleCardActive]}
              onPress={() => setPrayerReminders(!prayerReminders)}
            >
              <View style={styles.toggleContent}>
                <Ionicons name="time-outline" size={24} color={prayerReminders ? colors.primary : colors.textSecondary} />
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleTitle, prayerReminders && styles.toggleTitleActive]}>
                    Prayer Reminders
                  </Text>
                  <Text style={styles.toggleSubtitle}>Get notified before each prayer</Text>
                </View>
              </View>
              <View style={[styles.toggle, prayerReminders && styles.toggleActive]}>
                <View style={[styles.toggleDot, prayerReminders && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleCard, ramadanReminders && styles.toggleCardActive]}
              onPress={() => setRamadanReminders(!ramadanReminders)}
            >
              <View style={styles.toggleContent}>
                <Ionicons name="moon-outline" size={24} color={ramadanReminders ? colors.primary : colors.textSecondary} />
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleTitle, ramadanReminders && styles.toggleTitleActive]}>
                    Ramadan Reminders
                  </Text>
                  <Text style={styles.toggleSubtitle}>Sehri & Iftar notifications</Text>
                </View>
              </View>
              <View style={[styles.toggle, ramadanReminders && styles.toggleActive]}>
                <View style={[styles.toggleDot, ramadanReminders && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Steps */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
        >
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconContainer}>
                  <Ionicons name={step.icon as any} size={32} color={colors.primary} />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>
              {renderStepContent(step, index)}
            </View>
          ))}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={currentStep === steps.length - 1 ? handleComplete : nextStep}
            disabled={!canProceed() || loading}
          >
            <Text style={styles.nextButtonText}>
              {loading
                ? "Setting up..."
                : currentStep === steps.length - 1
                ? "Get Started"
                : "Continue"}
            </Text>
            {!loading && (
              <Ionicons
                name={currentStep === steps.length - 1 ? "checkmark" : "arrow-forward"}
                size={20}
                color={colors.textOnPrimary}
              />
            )}
          </TouchableOpacity>
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
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    width,
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  stepIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "center",
    lineHeight: typography.sizes.xxxl * 1.2,
  },
  stepSubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeIconContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.sizes.md * 1.6,
    marginBottom: spacing.xxl,
  },
  featureList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  featureText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    flex: 1,
  },
  formContent: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadows.md,
  },
  locationCity: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  locationCountry: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  changeLocationButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  changeLocationText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  locationButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.md,
  },
  locationButtonText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  optionsScroll: {
    flex: 1,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  optionSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  goalSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  goalButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  goalDisplay: {
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  goalValue: {
    fontSize: typography.sizes.display,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  goalLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  toggleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  toggleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  toggleTitleActive: {
    color: colors.primary,
  },
  toggleSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleDotActive: {
    alignSelf: "flex-end",
  },
  navigation: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  nextButtonDisabled: {
    backgroundColor: colors.border,
  },
  nextButtonText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
});
