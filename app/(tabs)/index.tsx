import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function HomeScreen() {
  // const hello = useQuery(api.hello.get);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Assalamu Alaikum</Text>
          <Text style={styles.subtitle}>Welcome to Ramadan Companion</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="time" size={32} color="#1a472a" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Next Prayer</Text>
            <Text style={styles.cardSubtitle}>Dhuhr in 2 hours</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Ionicons name="book" size={32} color="#1a472a" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Quran Reading</Text>
            <Text style={styles.cardSubtitle}>Today: Juz 15, verses 200-220</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Ionicons name="calendar" size={32} color="#1a472a" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Ramadan Day</Text>
            <Text style={styles.cardSubtitle}>Day 5 of 30</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Reminders</Text>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color="#1a472a" />
            <Text style={styles.reminderText}>Fajr - Completed</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="radio-button-off" size={20} color="#888" />
            <Text style={styles.reminderText}>Dhuhr - Pending</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="radio-button-off" size={20} color="#888" />
            <Text style={styles.reminderText}>Asr - Pending</Text>
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
  welcome: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a472a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
});