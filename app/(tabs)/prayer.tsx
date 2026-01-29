import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useNotificationManager } from "../../hooks/useNotificationManager";

export default function PrayerScreen() {
  const {
    prayerTimes,
    nextPrayer,
    location,
    loading,
    togglePrayerCompletion,
    refreshPrayerTimes,
    formatTimeUntil,
  } = usePrayerTimes();

  const { scheduleDailyPrayerNotifications, notificationSettings } = useNotificationManager();

  useEffect(() => {
    // Schedule notifications when prayer times are loaded
    if (!loading && prayerTimes.length > 0 && notificationSettings?.prayerReminders) {
      scheduleDailyPrayerNotifications();
    }
  }, [loading, prayerTimes, notificationSettings?.prayerReminders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getPrayerIcon = (prayerName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      "Fajr": "sunny-outline",
      "Sunrise": "sunny",
      "Dhuhr": "time-outline",
      "Asr": "partly-sunny-outline",
      "Maghrib": "sunset-outline",
      "Isha": "moon-outline",
    };
    return iconMap[prayerName] || "time-outline";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Prayer Times</Text>
          <Text style={styles.location}>
            Location: {location ? `${location.city || "Custom"}` : "Loading..."}
          </Text>
        </View>

        {nextPrayer && (
          <View style={styles.nextPrayerCard}>
            <Ionicons name="time" size={32} color="#ffffff" />
            <View style={styles.nextPrayerInfo}>
              <Text style={styles.nextPrayerTitle}>Next Prayer</Text>
              <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
              <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
              <Text style={styles.nextPrayerCountdown}>
                {formatTimeUntil(nextPrayer.minutesUntil)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
          <Text style={styles.hijriText}>Ramadan 1445 AH</Text>
        </View>

        <View style={styles.prayersList}>
          {prayerTimes.map((prayer, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.prayerCard,
                prayer.completed === true && styles.completedCard,
                prayer.completed === null && styles.disabledCard,
                prayer.isUpcoming && styles.upcomingCard,
              ]}
              onPress={() => togglePrayerCompletion(prayer.name)}
              disabled={prayer.completed === null}
            >
              <View style={[
                styles.prayerIcon,
                prayer.isUpcoming && styles.upcomingIcon
              ]}>
                <Ionicons 
                  name={getPrayerIcon(prayer.name)} 
                  size={24} 
                  color={
                    prayer.completed === true 
                      ? "#ffffff" 
                      : prayer.completed === null 
                      ? "#888" 
                      : prayer.isUpcoming
                      ? "#1a472a"
                      : "#1a472a"
                  } 
                />
              </View>
              <View style={styles.prayerInfo}>
                <Text style={styles.prayerName}>{prayer.name}</Text>
                <Text style={styles.prayerTime}>{prayer.time}</Text>
                {prayer.isUpcoming && (
                  <Text style={styles.nextPrayerLabel}>Next</Text>
                )}
              </View>
              <View style={styles.prayerStatus}>
                {prayer.completed === true && (
                  <Ionicons name="checkmark-circle" size={24} color="#1a472a" />
                )}
                {prayer.completed === false && !prayer.isUpcoming && (
                  <Ionicons name="radio-button-off" size={24} color="#888" />
                )}
                {prayer.isUpcoming && (
                  <Ionicons name="time" size={24} color="#f9a825" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={refreshPrayerTimes}>
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.refreshButtonText}>Refresh Times</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a472a",
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: "#666",
  },
  nextPrayerCard: {
    backgroundColor: "#f9a825",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextPrayerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nextPrayerTitle: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.8,
    marginBottom: 4,
  },
  nextPrayerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  nextPrayerCountdown: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.9,
  },
  dateCard: {
    backgroundColor: "#1a472a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  hijriText: {
    fontSize: 14,
    color: "#ffffff",
  },
  prayersList: {
    marginBottom: 24,
  },
  prayerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: "#e8f5e8",
  },
  disabledCard: {
    backgroundColor: "#f8f8f8",
  },
  upcomingCard: {
    backgroundColor: "#fff8e1",
    borderWidth: 2,
    borderColor: "#f9a825",
  },
  prayerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  upcomingIcon: {
    backgroundColor: "#ffecb3",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 16,
    color: "#666",
    marginBottom: 2,
  },
  nextPrayerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9a825",
  },
  prayerStatus: {
    justifyContent: "center",
  },
  refreshButton: {
    backgroundColor: "#1a472a",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});