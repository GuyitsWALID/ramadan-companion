import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculatePrayerTimes } from "react-native-adhan";

interface PrayerTime {
  name: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed?: boolean;
}

export default function PrayerScreen() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  const loadPrayerTimes = async () => {
    try {
      // For now, use default location (Makkah)
      const location = { latitude: 21.4225, longitude: 39.8262 };
      setCurrentLocation(location);

      // Calculate prayer times for today
      const today = new Date();
      const params = {
        latitude: location.latitude,
        longitude: location.longitude,
        calculationMethod: 2, // Muslim World League
        madhab: 1, // Shafi
      };

      const times = calculatePrayerTimes(today, params);
      
      const prayers: PrayerTime[] = [
        { name: "Fajr", time: times.fajr, icon: "sunny-outline", completed: false },
        { name: "Sunrise", time: times.sunrise, icon: "sunny", completed: null },
        { name: "Dhuhr", time: times.dhuhr, icon: "time-outline", completed: false },
        { name: "Asr", time: times.asr, icon: "partly-sunny-outline", completed: false },
        { name: "Maghrib", time: times.maghrib, icon: "sunset-outline", completed: false },
        { name: "Isha", time: times.isha, icon: "moon-outline", completed: false },
      ];

      setPrayerTimes(prayers);
      setLoading(false);
    } catch (error) {
      console.error("Error loading prayer times:", error);
      setLoading(false);
    }
  };

  const togglePrayerCompleted = (index: number) => {
    const updatedPrayers = [...prayerTimes];
    if (updatedPrayers[index].completed !== null) {
      updatedPrayers[index].completed = !updatedPrayers[index].completed;
    }
    setPrayerTimes(updatedPrayers);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Prayer Times</Text>
          <Text style={styles.location}>
            Location: {currentLocation ? "Makkah" : "Loading..."}
          </Text>
        </View>

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
              ]}
              onPress={() => togglePrayerCompleted(index)}
              disabled={prayer.completed === null}
            >
              <View style={styles.prayerIcon}>
                <Ionicons 
                  name={prayer.icon} 
                  size={24} 
                  color={
                    prayer.completed === true 
                      ? "#ffffff" 
                      : prayer.completed === null 
                      ? "#888" 
                      : "#1a472a"
                  } 
                />
              </View>
              <View style={styles.prayerInfo}>
                <Text style={styles.prayerName}>{prayer.name}</Text>
                <Text style={styles.prayerTime}>{prayer.time}</Text>
              </View>
              <View style={styles.prayerStatus}>
                {prayer.completed === true && (
                  <Ionicons name="checkmark-circle" size={24} color="#1a472a" />
                )}
                {prayer.completed === false && (
                  <Ionicons name="radio-button-off" size={24} color="#888" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadPrayerTimes}>
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
  prayerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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