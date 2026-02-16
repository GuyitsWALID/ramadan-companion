import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { getCalculationMethodName } from "../../utils/prayerTimes";
import * as Location from "expo-location";
import { typography, spacing, borderRadius } from "../../constants/theme";

export default function ProfileScreen() {
  const { user: userContextUser, settings, updateSettings, updateLocation: updateUserLocation, loading: userLoading } = useUser();
  const { user: authUser, isAuthenticated, signOut, updateUser } = useAuth();
  const { prayerTimes, location: prayerLocation, prayerSettings, updateLocation: updatePrayerLocation, updatePrayerSettings } = usePrayerTimes();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  
  const user = authUser || userContextUser;
  const effectiveLocation = authUser?.location ?? userContextUser?.location ?? prayerLocation;
  const loading = userLoading;
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showMadhabModal, setShowMadhabModal] = useState(false);
  const [tempCalcMethod, setTempCalcMethod] = useState(prayerSettings?.calculationMethod || localSettings.calculationMethod || "MuslimWorldLeague");
  const [tempMadhab, setTempMadhab] = useState(prayerSettings?.madhab || "Shafi");

  const styles = getStyles(colors);

  const formatLocationDisplay = (loc?: { latitude?: number; longitude?: number; city?: string; country?: string }) => {
    if (!loc) return null;
    if (loc.city) return `${loc.city}${loc.country ? `, ${loc.country}` : ''}`;
    return `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`;
  };

  // Sync local settings with context
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleSetting = async (key: keyof typeof localSettings) => {
    setSavingSettings(true);
    const newValue = !localSettings[key];
    setLocalSettings(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await updateSettings({ [key]: newValue });
    } catch (error) {
      console.error("Error updating setting:", error);
      // Revert on error
      setLocalSettings(prev => ({ ...prev, [key]: !newValue }));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to sign out?");
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

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          } 
        },
      ]
    );
  };

  const handleLocationSettings = async () => {
    if (Platform.OS === 'web') {
      window.alert("Location detection is available on mobile. Use onboarding or your browser to update location.");
      return;
    }

    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to auto-detect your location.');
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [reverse] = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude });

      const newLoc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: reverse?.city ?? reverse?.district ?? reverse?.name ?? undefined,
        country: reverse?.country ?? undefined,
      };

      // update app prayer location
      await updatePrayerLocation(newLoc as any);

      // persist to authenticated profile (Convex) when available, else update local user context
      if (isAuthenticated && updateUser) {
        try {
          await updateUser({ location: newLoc as any });
        } catch (e) {
          console.error("Failed to update authenticated profile location:", e);
        }
      } else if (updateUserLocation) {
        try {
          await updateUserLocation(newLoc as any);
        } catch (e) {
          console.error("Failed to update local user location:", e);
        }
      }

      Alert.alert('Location updated', `${formatLocationDisplay(newLoc) || 'Your location'} set successfully.`);
    } catch (err) {
      console.error('Error detecting location:', err);
      Alert.alert('Error', 'Could not detect location.');
    } finally {
      setIsLocating(false);
    }
  };

  const openCalculationMethodPicker = () => {
    setTempCalcMethod(prayerSettings?.calculationMethod || localSettings.calculationMethod || 'MuslimWorldLeague');
    setShowCalcModal(true);
  };

  const saveCalculationMethod = async (method: string) => {
    setShowCalcModal(false);
    setTempCalcMethod(method);

    // update prayer settings (app) and user settings (if present)
    try {
      await updatePrayerSettings({ calculationMethod: method, madhab: prayerSettings?.madhab || 'Shafi' } as any);
      try { await updateSettings({ calculationMethod: method }); } catch(e) {}
      setLocalSettings(prev => ({ ...prev, calculationMethod: method }));
      Alert.alert('Saved', `${getCalculationMethodName(method)} selected.`);
    } catch (err) {
      console.error('Error saving calculation method:', err);
      Alert.alert('Error', 'Failed to update calculation method.');
    }
  };

  const openMadhabPicker = () => {
    setTempMadhab(prayerSettings?.madhab || 'Shafi');
    setShowMadhabModal(true);
  };

  const saveMadhab = async (madhab: string) => {
    setShowMadhabModal(false);
    setTempMadhab(madhab);

    try {
      await updatePrayerSettings({ calculationMethod: prayerSettings?.calculationMethod || localSettings?.calculationMethod || 'MuslimWorldLeague', madhab } as any);
      // update global prayer settings only (madhab is stored with prayer settings)
      setLocalSettings(prev => ({ ...prev }));
      Alert.alert('Saved', `${madhab} madhab selected.`);
    } catch (err) {
      console.error('Error saving madhab:', err);
      Alert.alert('Error', 'Failed to update madhab.');
    }
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "U"}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <TouchableOpacity
            style={styles.supportHeaderButton}
            onPress={() => router.push("/support")}
          >
            <Ionicons name="heart-outline" size={16} color={colors.textOnPrimary} />
            <Text style={styles.supportHeaderButtonText}>Support the App</Text>
          </TouchableOpacity>
          <Text style={styles.userEmail}>{user?.email ?? (isAuthenticated ? "Signed in" : "Not signed in")}</Text>
          
          {effectiveLocation && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.locationText}>
                {formatLocationDisplay(effectiveLocation)}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={28} color={colors.warning} />
            <Text style={styles.statValue}>
              {prayerTimes.filter(p => p.completed && p.name !== "Sunrise").length}/5
            </Text>
            <Text style={styles.statLabel}>Today's Prayers</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="book" size={28} color={colors.success} />
            <Text style={styles.statValue}>
              {authUser?.quranGoal || "0"}
            </Text>
            <Text style={styles.statLabel}>Daily Goal</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color={colors.secondary} />
            <Text style={styles.statValue}>30</Text>
            <Text style={styles.statLabel}>Ramadan Days</Text>
          </View>
        </View>

        {/* Prayer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={handleLocationSettings}
            disabled={isLocating}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="location-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Location</Text>
                <Text style={styles.settingValue}>
                  {effectiveLocation ? formatLocationDisplay(effectiveLocation) : "Not set"}
                </Text>
              </View>
            </View>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={openCalculationMethodPicker}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="calculator-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Calculation Method</Text>
                <Text style={styles.settingValue}>
                  { (authUser?.calculationMethod || prayerSettings?.calculationMethod) ? (getCalculationMethodName(authUser?.calculationMethod || prayerSettings?.calculationMethod || 'MuslimWorldLeague')) : 'Muslim World League'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={openMadhabPicker}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Madhab</Text>
                <Text style={styles.settingValue}>
                  {authUser?.madhab || (prayerSettings?.madhab ? prayerSettings.madhab : "Shafi")}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Calculation Method Picker Modal */}
        <Modal visible={showCalcModal} transparent animationType="fade" onRequestClose={() => setShowCalcModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Calculation Method</Text>
              {[
                'MuslimWorldLeague','UmmAlQura','NorthAmerica','Dubai','MoonsightingCommittee','Kuwait','Qatar','Singapore'
              ].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modalOption, tempCalcMethod === m && styles.modalOptionActive]}
                  onPress={() => setTempCalcMethod(m)}
                >
                  <View style={styles.modalOptionInfo}>
                    <Text style={styles.modalOptionTitle}>{getCalculationMethodName(m)}</Text>
                    <Text style={styles.modalOptionDesc}>{m}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCalcModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={() => saveCalculationMethod(tempCalcMethod)}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Madhab Picker Modal */}
        <Modal visible={showMadhabModal} transparent animationType="fade" onRequestClose={() => setShowMadhabModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Madhab</Text>
              {['Shafi','Hanafi'].map((m) => (
                <TouchableOpacity key={m} style={[styles.modalOption, tempMadhab === m && styles.modalOptionActive]} onPress={() => setTempMadhab(m)}>
                  <View style={styles.modalOptionInfo}>
                    <Text style={styles.modalOptionTitle}>{m}</Text>
                    <Text style={styles.modalOptionDesc}>{m === 'Shafi' ? "Standard (default)" : "Hanafi (for Asr)"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowMadhabModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={() => saveMadhab(tempMadhab)}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Prayer Reminders</Text>
                <Text style={styles.settingDescription}>Get notified for each prayer</Text>
              </View>
            </View>
            <Switch
              value={localSettings.prayerReminders}
              onValueChange={() => toggleSetting('prayerReminders')}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={localSettings.prayerReminders ? colors.primary : colors.surfaceElevated}
              disabled={savingSettings}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="book-outline" size={22} color={colors.success} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Quran Reminders</Text>
                <Text style={styles.settingDescription}>Daily reading notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.quranReminders}
              onValueChange={() => toggleSetting('quranReminders')}
              trackColor={{ false: colors.border, true: colors.success + "50" }}
              thumbColor={localSettings.quranReminders ? colors.success : colors.surfaceElevated}
              disabled={savingSettings}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="restaurant-outline" size={22} color={colors.secondary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Ramadan Reminders</Text>
                <Text style={styles.settingDescription}>Sehri and Iftar alerts</Text>
              </View>
            </View>
            <Switch
              value={localSettings.ramadanReminders}
              onValueChange={() => toggleSetting('ramadanReminders')}
              trackColor={{ false: colors.border, true: colors.secondary + "50" }}
              thumbColor={localSettings.ramadanReminders ? colors.secondary : colors.surfaceElevated}
              disabled={savingSettings}
            />
          </View>
        </View>

        {/* Sound & Haptics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Haptics</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Adhan Sound</Text>
                <Text style={styles.settingDescription}>Play at prayer times</Text>
              </View>
            </View>
            <Switch
              value={localSettings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={localSettings.soundEnabled ? colors.primary : colors.surfaceElevated}
              disabled={savingSettings}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Vibration</Text>
                <Text style={styles.settingDescription}>Vibrate on notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={localSettings.vibrationEnabled ? colors.primary : colors.surfaceElevated}
              disabled={savingSettings}
            />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.themeSelector}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === "light" && styles.themeOptionActive,
              ]}
              onPress={() => setThemeMode("light")}
            >
              <Ionicons 
                name="sunny" 
                size={24} 
                color={themeMode === "light" ? colors.primary : colors.textMuted} 
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
                name="moon" 
                size={24} 
                color={themeMode === "dark" ? colors.primary : colors.textMuted} 
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
                name="phone-portrait" 
                size={24} 
                color={themeMode === "system" ? colors.primary : colors.textMuted} 
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
              ? `Following system (${isDark ? "Dark" : "Light"})` 
              : `Using ${themeMode} mode`}
          </Text>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Language</Text>
                <Text style={styles.settingValue}>
                  {localSettings.language || "English"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => router.push("/widgets")}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="apps-outline" size={22} color={colors.primary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Home Screen Widgets</Text>
                  <Text style={styles.settingValue}>Configure widgets</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.settingName}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="star-outline" size={22} color={colors.warning} />
              <Text style={styles.settingName}>Rate Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="share-social-outline" size={22} color={colors.primary} />
              <Text style={styles.settingName}>Share App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.settingName}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Ramadan Companion</Text>
          <Text style={styles.versionNumber}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2026 Ramadan Companion</Text>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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

  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  supportHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  supportHeaderButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginVertical: spacing.sm,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Section
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  settingDescription: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  settingValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  // Theme Selector
  themeSelector: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  modalOption: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.background, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  modalOptionActive: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  modalOptionInfo: { flex: 1 },
  modalOptionTitle: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  modalOptionDesc: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: spacing.xxs },
  modalCancelButton: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  modalCancelText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.medium, color: colors.textMuted },
  modalSaveButton: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  modalSaveText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.textOnPrimary },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "15",
  },
  themeOptionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  themeOptionTextActive: {
    color: colors.primary,
    fontFamily: typography.fonts.semiBold,
  },
  themeHint: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Danger Button
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.error + "10",
  },
  dangerButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.error,
  },

  // Version
  versionContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  versionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  versionNumber: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  copyright: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
});
