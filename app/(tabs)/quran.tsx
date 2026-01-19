import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface JuzProgress {
  juz: number;
  name: string;
  completed: boolean;
  progress: number;
}

export default function QuranScreen() {
  const [readingPlan, setReadingPlan] = useState({
    dailyVerses: 20,
    currentJuz: 15,
    startDate: new Date().toISOString(),
  });

  const [juzProgress] = useState<JuzProgress[]>(
    Array.from({ length: 30 }, (_, i) => ({
      juz: i + 1,
      name: `Juz ${i + 1}`,
      completed: i < 14,
      progress: i < 14 ? 100 : Math.floor(Math.random() * 80),
    }))
  );

  const completedJuz = juzProgress.filter(j => j.completed).length;
  const overallProgress = (completedJuz / 30) * 100;

  const toggleJuzCompleted = (juz: number) => {
    // This would update the database in a real app
    console.log(`Toggle Juz ${juz} completion`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Quran Reading Plan</Text>
          <Text style={styles.subtitle}>Track your daily Quran reading progress</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressPercentage}>{overallProgress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedJuz} of 30 Juz completed
          </Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Today's Reading</Text>
          <View style={styles.planInfo}>
            <Ionicons name="book-outline" size={24} color="#1a472a" />
            <View style={styles.planDetails}>
              <Text style={styles.planJuz}>Juz {readingPlan.currentJuz}</Text>
              <Text style={styles.planVerses}>{readingPlan.dailyVerses} verses planned</Text>
            </View>
            <TouchableOpacity style={styles.startButton}>
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Reading Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{readingPlan.dailyVerses}</Text>
              <Text style={styles.statLabel}>Daily Verses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedJuz}</Text>
              <Text style={styles.statLabel}>Juz Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>30</Text>
              <Text style={styles.statLabel}>Total Juz</Text>
            </View>
          </View>
        </View>

        <View style={styles.juzList}>
          <Text style={styles.juzListTitle}>Juz Progress</Text>
          {juzProgress.map((juz) => (
            <TouchableOpacity
              key={juz.juz}
              style={[
                styles.juzCard,
                juz.completed && styles.completedJuzCard,
              ]}
              onPress={() => toggleJuzCompleted(juz.juz)}
            >
              <View style={styles.juzInfo}>
                <Text style={styles.juzName}>{juz.name}</Text>
                <Text style={styles.juzProgress}>
                  {juz.completed ? "Completed" : `${juz.progress}% complete`}
                </Text>
              </View>
              <View style={styles.juzStatus}>
                {juz.completed ? (
                  <Ionicons name="checkmark-circle" size={24} color="#1a472a" />
                ) : (
                  <Ionicons name="radio-button-off" size={24} color="#888" />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a472a",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1a472a",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  planCard: {
    backgroundColor: "#1a472a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 16,
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  planDetails: {
    flex: 1,
    marginLeft: 16,
  },
  planJuz: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  planVerses: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.8,
  },
  startButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: "#1a472a",
    fontSize: 14,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a472a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  juzList: {
    marginTop: 20,
  },
  juzListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  juzCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedJuzCard: {
    backgroundColor: "#e8f5e8",
  },
  juzInfo: {
    flex: 1,
  },
  juzName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  juzProgress: {
    fontSize: 14,
    color: "#666",
  },
  juzStatus: {
    justifyContent: "center",
  },
});