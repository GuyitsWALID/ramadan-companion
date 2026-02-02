import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "../../context/UserContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

export default function ProfileScreen() {
  const { user, settings, updateSettings, loading, isAuthenticated, login, logout } = useUser();
  const { prayerTimes, location, prayerSettings } = usePrayerTimes();
  
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local settings with context
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Calculate stats from actual data
  const completedPrayers = prayerTimes.filter(p => p.completed && p.name !== "Sunrise").length;
  
  const stats = [
    {
      title: "Today's Prayers",
      value: `${completedPrayers}/5`,
      icon: "time-outline",
      color: colors.primary,
    },
    {
      title: "Location",
      value: location?.city || "Not set",
      icon: "location-outline",
      color: colors.success,
    },
    {
      title: "Method",
      value: prayerSettings?.calculationMethod?.slice(0, 8) || "Default",
      icon: "calculator-outline",
      color: colors.secondary,
    },
    {
      title: "Status",
      value: isAuthenticated ? "Synced" : "Local",
      icon: isAuthenticated ? "cloud-done-outline" : "cloud-offline-outline",
      color: isAuthenticated ? colors.primary : colors.textMuted,
    },
  ];

  const toggleSetting = async (key: keyof typeof localSettings) => {
    const newValue = !localSettings[key];
    setLocalSettings(prev => ({ ...prev, [key]: newValue }));
    
    // Persist to context/storage
    await updateSettings({ [key]: newValue });
  };

  const handleLogin = async () => {
    // Simple login prompt - in production, use proper auth flow
    Alert.prompt(
      "Sign In",
      "Enter your email to sync your data across devices",
      async (email) => {
        if (email && email.includes("@")) {
          try {
            await login(email);
            Alert.alert("Success", "You're now signed in!");
          } catch (error) {
            Alert.alert("Error", "Failed to sign in. Please try again.");
          }
        }
      },
      "plain-text",
      "",
      "email-address"
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your local data will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : "RC"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Ramadan Companion"}</Text>
              <Text style={styles.userEmail}>{user?.email || "Guest User"}</Text>
              <Text style={styles.userLocation}>
                {location?.city ? `${location.city}${location.country ? `, ${location.country}` : ""}` : "Location not set"}
              </Text>
            </View>
          </View>
          {!isAuthenticated ? (
            <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.signInButtonText}>Sign In to Sync</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={colors.primary} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Prayer Reminders</Text>
                <Text style={styles.settingDescription}>Get notified for each prayer</Text>
              </View>
            </View>
            <Switch
              value={localSettings.prayerReminders}
              onValueChange={() => toggleSetting('prayerReminders')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={localSettings.prayerReminders ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="book-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Quran Reading Reminders</Text>
                <Text style={styles.settingDescription}>Daily Quran reading notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.quranReminders}
              onValueChange={() => toggleSetting('quranReminders')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={localSettings.quranReminders ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Ramadan Special</Text>
                <Text style={styles.settingDescription}>Sehri and Iftar reminders</Text>
              </View>
            </View>
            <Switch
              value={localSettings.ramadanReminders}
              onValueChange={() => toggleSetting('ramadanReminders')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={localSettings.ramadanReminders ? colors.primary : colors.surfaceElevated}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Haptics</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Adhan Sound</Text>
                <Text style={styles.settingDescription}>Play Adhan for prayer times</Text>
              </View>
            </View>
            <Switch
              value={localSettings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={localSettings.soundEnabled ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Vibration</Text>
                <Text style={styles.settingDescription}>Vibrate on notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={localSettings.vibrationEnabled ? colors.primary : colors.surfaceElevated}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Location</Text>
              <Text style={styles.menuValue}>
                {location?.city ? `${location.city}${location.country ? `, ${location.country}` : ""}` : "Tap to set"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="language-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuValue}>{localSettings.language || "English"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calculate-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Calculation Method</Text>
              <Text style={styles.menuValue}>{prayerSettings?.calculationMethod || "Muslim World League"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/support")}
          >
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Support the App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  userLocation: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  signInButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  signOutButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginVertical: spacing.sm,
  },
  statTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xxs,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  settingName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuText: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  menuValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
});