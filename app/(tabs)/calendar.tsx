import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useUser } from "../../context/UserContext";

interface RamadanDay {
  dayNumber: number;
  date: string;
  hijriDate: string;
  sehriTime: string;
  iftarTime: string;
  city: string;
  country: string;
}

// Ramadan 2026 starts approximately Feb 17, 2026 (1447 AH)
const RAMADAN_START_2026 = new Date(2026, 1, 17);
const RAMADAN_YEAR_HIJRI = "1447 AH";

export default function CalendarScreen() {
  const { prayerTimes, location, loading: prayerLoading } = usePrayerTimes();
  const { user } = useUser();
  
  const [currentDay, setCurrentDay] = useState(1);
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<RamadanDay | null>(null);

  // Calculate actual Ramadan day based on current date
  useEffect(() => {
    const today = new Date();
    const diffTime = today.getTime() - RAMADAN_START_2026.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays >= 1 && diffDays <= 30) {
      setCurrentDay(diffDays);
    } else if (diffDays < 1) {
      setCurrentDay(1); // Before Ramadan
    } else {
      setCurrentDay(30); // After Ramadan
    }
  }, []);

  // Generate Ramadan calendar with real Fajr/Maghrib times
  useEffect(() => {
    const fajrTime = prayerTimes.find(p => p.name === "Fajr")?.time || "05:00";
    const maghribTime = prayerTimes.find(p => p.name === "Maghrib")?.time || "18:00";
    const cityName = user?.location?.city || location?.city || "Your Location";
    const countryName = user?.location?.country || location?.country || "";
    
    // Generate 30 days of Ramadan
    const days: RamadanDay[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(RAMADAN_START_2026);
      date.setDate(date.getDate() + i);
      
      // Adjust times slightly for each day (sunrise gets earlier, sunset later)
      const adjustMinutes = Math.floor(i * 0.5);
      const sehriHour = parseInt(fajrTime.split(":")[0]);
      const sehriMin = parseInt(fajrTime.split(":")[1]) - 10 - adjustMinutes;
      const iftarHour = parseInt(maghribTime.split(":")[0]);
      const iftarMin = parseInt(maghribTime.split(":")[1]) + adjustMinutes;
      
      return {
        dayNumber: i + 1,
        date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        hijriDate: `${i + 1} Ramadan ${RAMADAN_YEAR_HIJRI}`,
        sehriTime: `${String(sehriHour).padStart(2, '0')}:${String(Math.max(0, sehriMin)).padStart(2, '0')}`,
        iftarTime: `${String(iftarHour).padStart(2, '0')}:${String(Math.min(59, iftarMin)).padStart(2, '0')}`,
        city: cityName,
        country: countryName,
      };
    });
    
    setRamadanDays(days);
    setSelectedDay(days[currentDay - 1] || days[0]);
  }, [currentDay, prayerTimes, location, user]);

  const specialEvents: Record<number, string> = {
    1: "First day of Ramadan",
    10: "First 10 days (Mercy) complete",
    20: "Second 10 days (Forgiveness) complete",
    21: "Last 10 days begin - Laylat al-Qadr",
    23: "Possible Laylat al-Qadr",
    25: "Possible Laylat al-Qadr",
    27: "Most likely Laylat al-Qadr",
    29: "Possible Laylat al-Qadr",
    30: "Last day of Ramadan - Eid tomorrow!",
  };

  const getDaysLeft = () => {
    return 30 - currentDay;
  };

  const isRamadanActive = useMemo(() => {
    const today = new Date();
    const endDate = new Date(RAMADAN_START_2026);
    endDate.setDate(endDate.getDate() + 30);
    return today >= RAMADAN_START_2026 && today <= endDate;
  }, []);

  if (prayerLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ramadan Calendar</Text>
          <Text style={styles.subtitle}>{RAMADAN_YEAR_HIJRI} / 2026 CE</Text>
          {selectedDay && (
            <Text style={styles.locationText}>
              📍 {selectedDay.city}{selectedDay.country ? `, ${selectedDay.country}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.currentDayCard}>
          <View style={styles.currentDayHeader}>
            <View style={styles.dayNumberContainer}>
              <Text style={styles.dayNumber}>{currentDay}</Text>
            </View>
            <View style={styles.currentDayInfo}>
              <Text style={styles.currentDayTitle}>Day {currentDay} of Ramadan</Text>
              <Text style={styles.currentDate}>{selectedDay?.date}</Text>
              <Text style={styles.daysLeft}>{getDaysLeft()} days remaining</Text>
            </View>
          </View>
          
          <View style={styles.timingsRow}>
            <View style={styles.timingCard}>
              <Ionicons name="moon-outline" size={24} color="#ffffff" />
              <Text style={styles.timingTitle}>Sehri</Text>
              <Text style={styles.timingTime}>{selectedDay?.sehriTime}</Text>
            </View>
            <View style={styles.timingCard}>
              <Ionicons name="sunset-outline" size={24} color="#ffffff" />
              <Text style={styles.timingTitle}>Iftar</Text>
              <Text style={styles.timingTime}>{selectedDay?.iftarTime}</Text>
            </View>
          </View>

          {specialEvents[currentDay as keyof typeof specialEvents] && (
            <View style={styles.eventCard}>
              <Ionicons name="star" size={20} color="#f9a825" />
              <Text style={styles.eventText}>
                {specialEvents[currentDay as keyof typeof specialEvents]}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentDay(Math.max(1, currentDay - 1))}
          >
            <Ionicons name="chevron-back" size={20} color="#1a472a" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentDay(Math.min(30, currentDay + 1))}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#1a472a" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          <Text style={styles.gridTitle}>Ramadan Overview</Text>
          <View style={styles.daysGrid}>
            {ramadanDays.map((day) => (
              <TouchableOpacity
                key={day.dayNumber}
                style={[
                  styles.dayCell,
                  day.dayNumber === currentDay && styles.selectedDayCell,
                  specialEvents[day.dayNumber as keyof typeof specialEvents] && styles.specialDayCell,
                ]}
                onPress={() => setCurrentDay(day.dayNumber)}
              >
                <Text style={[
                  styles.dayCellText,
                  day.dayNumber === currentDay && styles.selectedDayCellText,
                ]}>
                  {day.dayNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {Object.entries(specialEvents).map(([day, event]) => {
            const dayNum = parseInt(day);
            if (dayNum > currentDay) {
              return (
                <View key={day} style={styles.eventItem}>
                  <View style={styles.eventIndicator}>
                    <Text style={styles.eventDay}>Day {dayNum}</Text>
                  </View>
                  <Text style={styles.eventName}>{event}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#888" />
                </View>
              );
            }
            return null;
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ramadan Reminders</Text>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color="#1a472a" />
            <Text style={styles.reminderText}>Complete daily prayers on time</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color="#1a472a" />
            <Text style={styles.reminderText}>Read Quran daily (minimum 20 verses)</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color="#1a472a" />
            <Text style={styles.reminderText}>Increase charity and good deeds</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color="#1a472a" />
            <Text style={styles.reminderText}>Make dua during blessed nights</Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a472a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  locationText: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
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
  currentDayCard: {
    backgroundColor: "#1a472a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dayNumberContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a472a",
  },
  currentDayInfo: {
    flex: 1,
  },
  currentDayTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  currentDate: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.8,
    marginBottom: 2,
  },
  daysLeft: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.7,
  },
  timingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timingCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
  },
  timingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 8,
    marginBottom: 4,
  },
  timingTime: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249, 168, 37, 0.2)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(249, 168, 37, 0.5)",
  },
  eventText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f9a825",
    marginLeft: 8,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a472a",
    marginHorizontal: 4,
  },
  calendarGrid: {
    marginBottom: 24,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: "15%",
    aspectRatio: 1,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedDayCell: {
    backgroundColor: "#1a472a",
  },
  specialDayCell: {
    borderWidth: 2,
    borderColor: "#f9a825",
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  selectedDayCellText: {
    color: "#ffffff",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  eventIndicator: {
    backgroundColor: "#1a472a",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  eventDay: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  eventName: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reminderText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
});