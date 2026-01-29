import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { router } from "expo-router";

export default function ProfileScreen() {
  const [userSettings, setUserSettings] = useState({
    prayerReminders: true,
    quranReminders: true,
    ramadanReminders: true,
    soundEnabled: true,
    vibrationEnabled: true,
    darkMode: false,
    language: "english",
    calculationMethod: "muslim_world_league",
  });

  // Mock user data - in real app, this would come from Convex
  const userData = {
    name: "Ahmed Khan",
    email: "ahmed.khan@example.com",
    joinDate: "2024-01-15",
    location: "New York, USA",
    totalPrayers: 124,
    quranDays: 18,
    currentStreak: 5,
    longestStreak: 12,
  };

  const stats = [
    {
      title: "Prayers",
      value: userData.totalPrayers,
      icon: "time-outline",
      color: "#1a472a",
    },
    {
      title: "Quran Days",
      value: userData.quranDays,
      icon: "book-outline",
      color: "#2e7d32",
    },
    {
      title: "Current Streak",
      value: `${userData.currentStreak} days`,
      icon: "flame-outline",
      color: "#f57c00",
    },
    {
      title: "Longest Streak",
      value: `${userData.longestStreak} days`,
      icon: "trophy-outline",
      color: "#7b1fa2",
    },
  ];

  const toggleSetting = (key: string) => {
    setUserSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userData.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
              <Text style={styles.userLocation}>{userData.location}</Text>
            </View>
          </View>
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
              value={userSettings.prayerReminders}
              onValueChange={() => toggleSetting('prayerReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={userSettings.prayerReminders ? "#1a472a" : "#f4f3f4"}
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
              value={userSettings.quranReminders}
              onValueChange={() => toggleSetting('quranReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={userSettings.quranReminders ? "#1a472a" : "#f4f3f4"}
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
              value={userSettings.ramadanReminders}
              onValueChange={() => toggleSetting('ramadanReminders')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={userSettings.ramadanReminders ? "#1a472a" : "#f4f3f4"}
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
              value={userSettings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={userSettings.soundEnabled ? "#1a472a" : "#f4f3f4"}
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
              value={userSettings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: "#e0e0e0", true: "#c8e6c9" }}
              thumbColor={userSettings.vibrationEnabled ? "#1a472a" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Location</Text>
              <Text style={styles.menuValue}>{userData.location}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="language-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuValue}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calculate-outline" size={24} color="#1a472a" />
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Calculation Method</Text>
              <Text style={styles.menuValue}>Muslim World League</Text>
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