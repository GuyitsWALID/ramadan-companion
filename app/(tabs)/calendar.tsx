import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface RamadanDay {
  dayNumber: number;
  date: string;
  sehriTime: string;
  iftarTime: string;
  city: string;
  country: string;
}

export default function CalendarScreen() {
  const [currentDay, setCurrentDay] = useState(5);
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<RamadanDay | null>(null);

  useEffect(() => {
    // Generate sample Ramadan calendar data
    const days: RamadanDay[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(2025, 1, 28 + i); // Assuming Ramadan starts Feb 28, 2025
      return {
        dayNumber: i + 1,
        date: date.toLocaleDateString(),
        sehriTime: `${4 + Math.floor(i / 5)}:${String(30 + (i % 5) * 6).padStart(2, '0')} AM`,
        iftarTime: `${6 + Math.floor(i / 5)}:${String((i % 5) * 10).padStart(2, '0')} PM`,
        city: "New York",
        country: "USA",
      };
    });
    setRamadanDays(days);
    setSelectedDay(days[currentDay - 1]);
  }, [currentDay]);

  const specialEvents = {
    1: "Start of Ramadan",
    7: "Lailat al-Qadr begins",
    10: "Middle of Ramadan",
    21: "Lailat al-Qadr (Night of Power)",
    27: "Lailat al-Qadr (observed)",
    30: "Eid al-Fitr eve",
  };

  const getDaysLeft = () => {
    return 30 - currentDay;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ramadan Calendar</Text>
          <Text style={styles.subtitle}>1445 AH / 2025 CE</Text>
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