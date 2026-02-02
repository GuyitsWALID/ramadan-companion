/**
 * Widget Configuration Screen
 * Allows users to configure home screen widgets
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Linking, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, typography, spacing, borderRadius, shadows } from "../constants/theme";
import { 
  getWidgetSettings, 
  saveWidgetSettings, 
  getAvailableWidgetTypes,
  WidgetSettings 
} from "../utils/widgetData";

export default function WidgetsScreen() {
  const [settings, setSettings] = useState<WidgetSettings>({
    showNextPrayer: true,
    showPrayerProgress: true,
    showRamadanCountdown: true,
    showQuranStreak: true,
    refreshInterval: 15,
    theme: "system",
  });
  const [loading, setLoading] = useState(true);
  const widgetTypes = getAvailableWidgetTypes();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await getWidgetSettings();
    setSettings(savedSettings);
    setLoading(false);
  };

  const handleToggle = async (key: keyof WidgetSettings) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    await saveWidgetSettings({ [key]: newValue });
  };

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    setSettings(prev => ({ ...prev, theme }));
    await saveWidgetSettings({ theme });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Screen Widgets</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Platform Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={colors.secondary} />
            <Text style={styles.infoTitle}>Widget Setup Guide</Text>
          </View>
          <Text style={styles.infoText}>
            {Platform.OS === "ios" ? (
              "To add widgets on iOS:\n\n1. Long press on your home screen\n2. Tap the '+' button in the top left\n3. Search for 'Ramadan Companion'\n4. Choose your preferred widget size\n5. Tap 'Add Widget'"
            ) : Platform.OS === "android" ? (
              "To add widgets on Android:\n\n1. Long press on your home screen\n2. Tap 'Widgets'\n3. Find 'Ramadan Companion'\n4. Drag your preferred widget to the home screen"
            ) : (
              "Widgets are available on iOS and Android devices. Please open this app on your mobile device to configure widgets."
            )}
          </Text>
          {Platform.OS !== "web" && (
            <TouchableOpacity 
              style={styles.learnMoreButton}
              onPress={() => {
                const url = Platform.OS === "ios" 
                  ? "https://support.apple.com/en-us/HT207122"
                  : "https://support.google.com/android/answer/9450271";
                Linking.openURL(url);
              }}
            >
              <Text style={styles.learnMoreButtonText}>Learn More</Text>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Available Widgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Widgets</Text>
          {widgetTypes.map((widget) => (
            <View key={widget.id} style={styles.widgetCard}>
              <View style={styles.widgetIcon}>
                <Ionicons 
                  name={
                    widget.id === "next-prayer" ? "time-outline" :
                    widget.id === "prayer-progress" ? "checkmark-circle-outline" :
                    widget.id === "ramadan-countdown" ? "moon-outline" :
                    widget.id === "daily-summary" ? "calendar-outline" :
                    "book-outline"
                  } 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.widgetInfo}>
                <Text style={styles.widgetName}>{widget.name}</Text>
                <Text style={styles.widgetDescription}>{widget.description}</Text>
                <View style={styles.widgetSizeBadge}>
                  <Text style={styles.widgetSizeText}>{widget.size}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Widget Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widget Content</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Next Prayer</Text>
                <Text style={styles.settingDescription}>Show next prayer time with countdown</Text>
              </View>
            </View>
            <Switch
              value={settings.showNextPrayer}
              onValueChange={() => handleToggle('showNextPrayer')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.showNextPrayer ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Prayer Progress</Text>
                <Text style={styles.settingDescription}>Show daily prayer completion</Text>
              </View>
            </View>
            <Switch
              value={settings.showPrayerProgress}
              onValueChange={() => handleToggle('showPrayerProgress')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.showPrayerProgress ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Ramadan Countdown</Text>
                <Text style={styles.settingDescription}>Show Iftar/Sehri times</Text>
              </View>
            </View>
            <Switch
              value={settings.showRamadanCountdown}
              onValueChange={() => handleToggle('showRamadanCountdown')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.showRamadanCountdown ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="book-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Quran Streak</Text>
                <Text style={styles.settingDescription}>Show current reading streak</Text>
              </View>
            </View>
            <Switch
              value={settings.showQuranStreak}
              onValueChange={() => handleToggle('showQuranStreak')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.showQuranStreak ? colors.primary : colors.surfaceElevated}
            />
          </View>
        </View>

        {/* Widget Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.themeOptions}>
            {(["light", "dark", "system"] as const).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.themeOption,
                  settings.theme === theme && styles.themeOptionActive,
                ]}
                onPress={() => handleThemeChange(theme)}
              >
                <Ionicons 
                  name={
                    theme === "light" ? "sunny-outline" :
                    theme === "dark" ? "moon-outline" :
                    "phone-portrait-outline"
                  } 
                  size={20} 
                  color={settings.theme === theme ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  settings.theme === theme && styles.themeOptionTextActive,
                ]}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Update Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Frequency</Text>
          <Text style={styles.sectionSubtitle}>
            How often the widget data refreshes
          </Text>
          
          <View style={styles.frequencyOptions}>
            {[5, 15, 30, 60].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.frequencyOption,
                  settings.refreshInterval === minutes && styles.frequencyOptionActive,
                ]}
                onPress={async () => {
                  setSettings(prev => ({ ...prev, refreshInterval: minutes }));
                  await saveWidgetSettings({ refreshInterval: minutes });
                }}
              >
                <Text style={[
                  styles.frequencyOptionText,
                  settings.refreshInterval === minutes && styles.frequencyOptionTextActive,
                ]}>
                  {minutes < 60 ? `${minutes}m` : "1h"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.frequencyNote}>
            More frequent updates may affect battery life
          </Text>
        </View>

        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widget Preview</Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewWidget}>
              <View style={styles.previewHeader}>
                <Ionicons name="moon" size={20} color={colors.secondary} />
                <Text style={styles.previewAppName}>Ramadan Companion</Text>
              </View>
              {settings.showNextPrayer && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Next Prayer</Text>
                  <Text style={styles.previewValue}>Asr - 4:32 PM</Text>
                </View>
              )}
              {settings.showPrayerProgress && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Today's Progress</Text>
                  <Text style={styles.previewValue}>3/5 ✓</Text>
                </View>
              )}
              {settings.showRamadanCountdown && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Iftar in</Text>
                  <Text style={styles.previewValue}>2h 15m</Text>
                </View>
              )}
              {settings.showQuranStreak && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Quran Streak</Text>
                  <Text style={styles.previewValue}>🔥 7 days</Text>
                </View>
              )}
            </View>
            <Text style={styles.previewCaption}>
              Sample widget preview
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  learnMoreButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  widgetCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  widgetIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  widgetDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  widgetSizeBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  widgetSizeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  themeOptions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + "15",
  },
  themeOptionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  themeOptionTextActive: {
    color: colors.primary,
  },
  frequencyOptions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  frequencyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  frequencyOptionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
  },
  frequencyOptionTextActive: {
    color: colors.textOnPrimary,
  },
  frequencyNote: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  previewContainer: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  previewWidget: {
    width: "80%",
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewAppName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  previewLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  previewCaption: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
