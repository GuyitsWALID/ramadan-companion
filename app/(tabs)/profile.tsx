import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Image, Platform, Modal } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import { useNetwork } from "../../context/NetworkContext";
import { useTheme } from "../../context/ThemeContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useNotificationManager } from "../../hooks/useNotificationManager";
import { getCacheStats, clearAllCache } from "../../utils/cache";
import { typography, spacing, borderRadius, shadows } from "../../constants/theme";

export default function ProfileScreen() {
  const { user: userContextUser, settings, updateSettings, loading: userLoading } = useUser();
  const { user: authUser, isAuthenticated, isOnboarded, signOut, updateUser } = useAuth();
  const { prayerTimes, location: prayerLocation, prayerSettings } = usePrayerTimes();
  const { testNotification, initializeNotifications, scheduleDailyPrayerNotifications } = useNotificationManager();
  const { isOffline, offlineQueueSize, lastSyncTime, syncOfflineActions, syncPending } = useNetwork();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  
  // Merge user data - auth user takes priority
  const user = authUser || userContextUser;
  const location = authUser?.location || prayerLocation;
  const loading = userLoading;
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [testingSending, setTestingSending] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [cacheStats, setCacheStats] = useState({ totalItems: 0, offlineQueueSize: 0, lastSync: null as string | null });
  const [clearingCache, setClearingCache] = useState(false);

  // Generate styles with current colors
  const styles = getStyles(colors);

  // Load cache stats
  const loadCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

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
      value: (authUser?.calculationMethod || prayerSettings?.calculationMethod)?.slice(0, 10) || "Default",
      icon: "calculator-outline",
      color: colors.secondary,
    },
    {
      title: "Quran Goal",
      value: authUser?.quranGoal ? `${authUser.quranGoal} verses` : "Not set",
      icon: "book-outline",
      color: colors.primary,
    },
  ];

  const toggleSetting = async (key: keyof typeof localSettings) => {
    const newValue = !localSettings[key];
    setLocalSettings(prev => ({ ...prev, [key]: newValue }));
    
    // Persist to context/storage
    await updateSettings({ [key]: newValue });
  };

  const handleTestNotification = async () => {
    setTestingSending(true);
    try {
      await initializeNotifications();
      await testNotification();
      
      if (Platform.OS === 'web') {
        window.alert("Test notification sent! Check your notification center.");
      } else {
        Alert.alert(
          "Test Notification Sent",
          "You should see a notification appear shortly. If not, please check your notification permissions in device settings.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      if (Platform.OS === 'web') {
        window.alert("Failed to send test notification. Please check your notification permissions.");
      } else {
        Alert.alert(
          "Notification Error",
          "Failed to send test notification. Please ensure notification permissions are enabled.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setTestingSending(false);
    }
  };

  const handleSetupNotifications = async () => {
    try {
      await initializeNotifications();
      await scheduleDailyPrayerNotifications(prayerTimes);
      
      if (Platform.OS === 'web') {
        window.alert("Notifications scheduled successfully!");
      } else {
        Alert.alert(
          "Notifications Scheduled",
          "Prayer notifications have been set up based on your current prayer times.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
      if (Platform.OS === 'web') {
        window.alert("Failed to set up notifications. Please check your permissions.");
      } else {
        Alert.alert(
          "Error",
          "Failed to set up notifications. Please check your notification permissions.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleSignOut = async () => {
    // Handle web platform where Alert.alert may not show properly
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to sign out? You'll need to sign in again to access your data.");
      if (confirmed) {
        try {
          await signOut();
          router.replace("/(auth)");
        } catch (error) {
          console.error("Error signing out:", error);
          window.alert("Failed to sign out. Please try again.");
        }
      }
      return;
    }

    // Native platforms use Alert.alert
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to sign in again to access your data.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut();
              // NavigationGuard will automatically redirect to (auth)
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          } 
        },
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
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "RC"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "Guest User"}</Text>
              <Text style={styles.userEmail}>{user?.email || "Not signed in"}</Text>
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.userLocation}>
                  {location?.city ? `${location.city}${location.country ? `, ${location.country}` : ""}` : "Location not set"}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Membership badge */}
          {isAuthenticated && isOnboarded && (
            <View style={styles.membershipBadge}>
              <Ionicons name="checkmark-shield" size={16} color={colors.success} />
              <Text style={styles.membershipText}>Premium Member</Text>
            </View>
          )}
          
          {/* Sign out button - always show when authenticated since auth is required */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
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

          {/* Notification Action Buttons */}
          <View style={styles.notificationActions}>
            <TouchableOpacity 
              style={styles.notificationActionButton}
              onPress={handleSetupNotifications}
            >
              <Ionicons name="alarm-outline" size={20} color={colors.primary} />
              <Text style={styles.notificationActionText}>Schedule Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.notificationActionButton, testingSending && styles.notificationActionButtonDisabled]}
              onPress={handleTestNotification}
              disabled={testingSending}
            >
              {testingSending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
              )}
              <Text style={styles.notificationActionText}>
                {testingSending ? "Sending..." : "Test Notification"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notification Schedule Info */}
          <TouchableOpacity 
            style={styles.notificationInfoCard}
            onPress={() => setShowNotificationModal(true)}
          >
            <View style={styles.notificationInfoHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.secondary} />
              <Text style={styles.notificationInfoTitle}>Scheduled Notifications</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.notificationInfoText}>
              Tap to view your notification schedule
            </Text>
          </TouchableOpacity>
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
              <Text style={styles.menuValue}>{authUser?.calculationMethod || prayerSettings?.calculationMethod || "Muslim World League"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="moon-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Madhab (Asr Calculation)</Text>
              <Text style={styles.menuValue}>{authUser?.madhab === "Hanafi" ? "Hanafi" : "Shafi'i"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/widgets")}
          >
            <Ionicons name="apps-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Home Screen Widgets</Text>
              <Text style={styles.menuValue}>Configure widgets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.themeContainer}>
            <Text style={styles.themeLabel}>Theme Mode</Text>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === "light" && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode("light")}
              >
                <Ionicons 
                  name="sunny-outline" 
                  size={20} 
                  color={themeMode === "light" ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === "light" && styles.themeOptionTextActive,
                ]}>
                  Light
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === "dark" && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode("dark")}
              >
                <Ionicons 
                  name="moon-outline" 
                  size={20} 
                  color={themeMode === "dark" ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === "dark" && styles.themeOptionTextActive,
                ]}>
                  Dark
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === "system" && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode("system")}
              >
                <Ionicons 
                  name="phone-portrait-outline" 
                  size={20} 
                  color={themeMode === "system" ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === "system" && styles.themeOptionTextActive,
                ]}>
                  System
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.themeHint}>
              {themeMode === "system" 
                ? `Following system preference (${isDark ? "Dark" : "Light"})` 
                : `Using ${themeMode} mode`}
            </Text>
          </View>
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

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          
          {/* Connection Status */}
          <View style={styles.connectionStatusCard}>
            <View style={styles.connectionStatusRow}>
              <Ionicons 
                name={isOffline ? "cloud-offline-outline" : "cloud-done-outline"} 
                size={24} 
                color={isOffline ? colors.warning : colors.success} 
              />
              <View style={styles.connectionStatusText}>
                <Text style={styles.connectionStatusTitle}>
                  {isOffline ? "Offline Mode" : "Connected"}
                </Text>
                <Text style={styles.connectionStatusSubtitle}>
                  {isOffline 
                    ? `${offlineQueueSize} action${offlineQueueSize !== 1 ? 's' : ''} pending sync`
                    : lastSyncTime || "All data synced"
                  }
                </Text>
              </View>
              {isOffline && offlineQueueSize > 0 && !syncPending && (
                <TouchableOpacity 
                  style={styles.syncNowButton}
                  onPress={syncOfflineActions}
                >
                  <Text style={styles.syncNowButtonText}>Sync Now</Text>
                </TouchableOpacity>
              )}
              {syncPending && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
          </View>

          {/* Cache Stats */}
          <View style={styles.menuItem}>
            <Ionicons name="server-outline" size={24} color={colors.primary} />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Cached Items</Text>
              <Text style={styles.menuValue}>{cacheStats.totalItems} items stored locally</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.menuItem, clearingCache && styles.menuItemDisabled]}
            onPress={async () => {
              if (Platform.OS === 'web') {
                const confirmed = window.confirm("This will clear all cached data. Your preferences and synced data will be reloaded from the server. Continue?");
                if (confirmed) {
                  setClearingCache(true);
                  await clearAllCache();
                  await loadCacheStats();
                  setClearingCache(false);
                  window.alert("Cache cleared successfully!");
                }
              } else {
                Alert.alert(
                  "Clear Cache",
                  "This will clear all cached data. Your preferences and synced data will be reloaded from the server.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Clear Cache", 
                      style: "destructive",
                      onPress: async () => {
                        setClearingCache(true);
                        await clearAllCache();
                        await loadCacheStats();
                        setClearingCache(false);
                        Alert.alert("Success", "Cache cleared successfully!");
                      }
                    }
                  ]
                );
              }
            }}
            disabled={clearingCache}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: colors.error }]}>Clear Cache</Text>
              <Text style={styles.menuValue}>Free up local storage</Text>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notification Schedule Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Schedule</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Prayer Notifications */}
              <View style={styles.scheduleSection}>
                <View style={styles.scheduleSectionHeader}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={styles.scheduleSectionTitle}>Prayer Notifications</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <View style={[styles.statusDot, localSettings.prayerReminders ? styles.statusActive : styles.statusInactive]} />
                  <Text style={styles.scheduleText}>
                    {localSettings.prayerReminders ? "Enabled" : "Disabled"}
                  </Text>
                </View>
                {localSettings.prayerReminders && prayerTimes.filter(p => p.name !== "Sunrise").map((prayer, index) => (
                  <View key={index} style={styles.scheduleSubItem}>
                    <Text style={styles.scheduleSubText}>{prayer.name}</Text>
                    <Text style={styles.scheduleTime}>{prayer.time}</Text>
                  </View>
                ))}
              </View>

              {/* Quran Reminders */}
              <View style={styles.scheduleSection}>
                <View style={styles.scheduleSectionHeader}>
                  <Ionicons name="book-outline" size={20} color={colors.secondary} />
                  <Text style={styles.scheduleSectionTitle}>Quran Reading Reminder</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <View style={[styles.statusDot, localSettings.quranReminders ? styles.statusActive : styles.statusInactive]} />
                  <Text style={styles.scheduleText}>
                    {localSettings.quranReminders ? "Daily at your preferred time" : "Disabled"}
                  </Text>
                </View>
              </View>

              {/* Ramadan Special */}
              <View style={styles.scheduleSection}>
                <View style={styles.scheduleSectionHeader}>
                  <Ionicons name="moon-outline" size={20} color={colors.primary} />
                  <Text style={styles.scheduleSectionTitle}>Ramadan Special</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <View style={[styles.statusDot, localSettings.ramadanReminders ? styles.statusActive : styles.statusInactive]} />
                  <Text style={styles.scheduleText}>
                    {localSettings.ramadanReminders ? "Enabled" : "Disabled"}
                  </Text>
                </View>
                {localSettings.ramadanReminders && (
                  <>
                    <View style={styles.scheduleSubItem}>
                      <Text style={styles.scheduleSubText}>Sehri Reminder</Text>
                      <Text style={styles.scheduleTime}>30 min before Fajr</Text>
                    </View>
                    <View style={styles.scheduleSubItem}>
                      <Text style={styles.scheduleSubText}>Iftar Reminder</Text>
                      <Text style={styles.scheduleTime}>15 min before Maghrib</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Sound & Vibration Info */}
              <View style={styles.scheduleSection}>
                <View style={styles.scheduleSectionHeader}>
                  <Ionicons name="volume-medium-outline" size={20} color={colors.primary} />
                  <Text style={styles.scheduleSectionTitle}>Sound & Vibration</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <View style={[styles.statusDot, localSettings.soundEnabled ? styles.statusActive : styles.statusInactive]} />
                  <Text style={styles.scheduleText}>
                    Adhan Sound: {localSettings.soundEnabled ? "On" : "Off"}
                  </Text>
                </View>
                <View style={styles.scheduleItem}>
                  <View style={[styles.statusDot, localSettings.vibrationEnabled ? styles.statusActive : styles.statusInactive]} />
                  <Text style={styles.scheduleText}>
                    Vibration: {localSettings.vibrationEnabled ? "On" : "Off"}
                  </Text>
                </View>
              </View>

              {/* Tips */}
              <View style={styles.notificationTips}>
                <Ionicons name="bulb-outline" size={20} color={colors.secondary} />
                <View style={styles.tipsContent}>
                  <Text style={styles.tipsTitle}>Tips</Text>
                  <Text style={styles.tipsText}>
                    • Notifications are scheduled based on your current prayer times{"\n"}
                    • Make sure your location is correctly set for accurate times{"\n"}
                    • Keep the app installed to receive notifications{"\n"}
                    • Check device settings if notifications aren't appearing
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Dynamic styles based on theme colors
const getStyles = (colors: any) => StyleSheet.create({
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
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  userLocation: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.success + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  membershipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.success,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  // Notification Action Styles
  notificationActions: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notificationActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  notificationActionButtonDisabled: {
    opacity: 0.6,
  },
  notificationActionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  notificationInfoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.md,
  },
  notificationInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notificationInfoTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  notificationInfoText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 28,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "80%",
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
  },
  scheduleSection: {
    marginBottom: spacing.xl,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleSectionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusInactive: {
    backgroundColor: colors.textMuted,
  },
  scheduleText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
  },
  scheduleSubItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 3,
  },
  scheduleSubText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  scheduleTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  notificationTips: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.secondary + "10",
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tipsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalCloseButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  // Data & Storage styles
  connectionStatusCard: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  connectionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  connectionStatusText: {
    flex: 1,
  },
  connectionStatusTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  connectionStatusSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  syncNowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  syncNowButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textOnPrimary,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  // Theme styles
  themeContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  themeLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  themeOptions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + "20",
  },
  themeOptionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  themeOptionTextActive: {
    color: colors.primary,
  },
  themeHint: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});