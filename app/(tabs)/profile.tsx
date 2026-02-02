import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "../../context/UserContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";

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
      color: "#1a472a",
    },
    {
      title: "Location",
      value: location?.city || "Not set",
      icon: "location-outline",
      color: "#2e7d32",
    },
    {
      title: "Method",
      value: prayerSettings?.calculationMethod?.slice(0, 8) || "Default",
      icon: "calculator-outline",
      color: "#f57c00",
    },
    {
      title: "Status",
      value: isAuthenticated ? "Synced" : "Local",
      icon: isAuthenticated ? "cloud-done-outline" : "cloud-offline-outline",
      color: isAuthenticated ? "#1a472a" : "#888",
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
          <ActivityIndicator size="large" color="#1a472a" />
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
              <Ionicons name="log-out-outline" size={20} color="#1a472a" />
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
              <Ionicons name="notifications-outline" size={24} color="#1a472a" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Prayer Reminders</Text>
                <Text style={styles.settingDescription}>Get notified for each prayer</Text>
              </View>
            </View>
            <Switch
              value={localSettings.prayerReminders}
              onValueChange={() => toggleSetting('prayerReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={localSettings.prayerReminders ? "#1a472a" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="book-outline" size={24} color="#1a472a" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Quran Reading Reminders</Text>
                <Text style={styles.settingDescription}>Daily Quran reading notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.quranReminders}
              onValueChange={() => toggleSetting('quranReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={localSettings.quranReminders ? "#1a472a" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar-outline" size={24} color="#1a472a" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Ramadan Special</Text>
                <Text style={styles.settingDescription}>Sehri and Iftar reminders</Text>
              </View>
            </View>
            <Switch
              value={localSettings.ramadanReminders}
              onValueChange={() => toggleSetting('ramadanReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={localSettings.ramadanReminders ? "#1a472a" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Haptics</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color="#1a472a" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Adhan Sound</Text>
                <Text style={styles.settingDescription}>Play Adhan for prayer times</Text>
              </View>
            </View>
            <Switch
              value={localSettings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={localSettings.soundEnabled ? "#1a472a" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#1a472a" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Vibration</Text>
                <Text style={styles.settingDescription}>Vibrate on notifications</Text>
              </View>
            </View>
            <Switch
              value={localSettings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={localSettings.vibrationEnabled ? "#1a472a" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Location</Text>
              <Text style={styles.menuValue}>
                {location?.city ? `${location.city}${location.country ? `, ${location.country}` : ""}` : "Tap to set"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="language-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuValue}>{localSettings.language || "English"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calculate-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Calculation Method</Text>
              <Text style={styles.menuValue}>{prayerSettings?.calculationMethod || "Muslim World League"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/support")}
          >
            <Ionicons name="heart-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Support the App</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1a472a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: "#888",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a472a",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a472a",
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  signOutButtonText: {
    color: "#1a472a",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    padding: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  menuText: {
    marginLeft: 16,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  menuValue: {
    fontSize: 14,
    color: "#666",
  },
});