import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../../context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface JuzProgress {
  juz: number;
  name: string;
  completed: boolean;
  progress: number;
}

const JUZ_PROGRESS_KEY = "@ramadan_juz_progress";

export default function QuranScreen() {
  const { user, userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [readingPlan, setReadingPlan] = useState({
    dailyVerses: 20,
    currentJuz: 1,
    startDate: new Date().toISOString(),
  });

  const [juzProgress, setJuzProgress] = useState<JuzProgress[]>([]);
  
  const updateReadingPlanMutation = useMutation(api.users.updateQuranReadingPlan);
  const saveQuranProgressMutation = useMutation(api.users.saveQuranProgress);

  // Load saved progress from AsyncStorage
  useEffect(() => {
    loadProgress();
  }, []);

  // Update reading plan from user context
  useEffect(() => {
    if (user?.quranReadingPlan) {
      setReadingPlan({
        dailyVerses: user.quranReadingPlan.dailyVerses,
        currentJuz: user.quranReadingPlan.currentJuz,
        startDate: user.quranReadingPlan.startDate,
      });
    }
  }, [user]);

  const loadProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem(JUZ_PROGRESS_KEY);
      if (savedProgress) {
        setJuzProgress(JSON.parse(savedProgress));
      } else {
        // Initialize with default progress
        const initialProgress = Array.from({ length: 30 }, (_, i) => ({
          juz: i + 1,
          name: `Juz ${i + 1}`,
          completed: false,
          progress: 0,
        }));
        setJuzProgress(initialProgress);
      }
    } catch (error) {
      console.error("Error loading Quran progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (progress: JuzProgress[]) => {
    try {
      await AsyncStorage.setItem(JUZ_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Error saving Quran progress:", error);
    }
  };

  const completedJuz = juzProgress.filter(j => j.completed).length;
  const overallProgress = juzProgress.length > 0 ? (completedJuz / 30) * 100 : 0;

  const toggleJuzCompleted = useCallback(async (juzNumber: number) => {
    setSaving(true);
    
    const updatedProgress = juzProgress.map(j => {
      if (j.juz === juzNumber) {
        return { 
          ...j, 
          completed: !j.completed,
          progress: !j.completed ? 100 : 0,
        };
      }
      return j;
    });

    setJuzProgress(updatedProgress);
    await saveProgress(updatedProgress);

    // Update current Juz to the next incomplete one
    const nextIncomplete = updatedProgress.find(j => !j.completed);
    if (nextIncomplete) {
      setReadingPlan(prev => ({ ...prev, currentJuz: nextIncomplete.juz }));
    }

    // Save to Convex if user is logged in
    if (userId) {
      try {
        const completedJuzNumbers = updatedProgress
          .filter(j => j.completed)
          .map(j => j.juz);

        await updateReadingPlanMutation({
          userId,
          dailyVerses: readingPlan.dailyVerses,
          currentJuz: nextIncomplete?.juz || 30,
          completedJuz: completedJuzNumbers,
          startDate: readingPlan.startDate,
        });

        // Save daily progress
        await saveQuranProgressMutation({
          userId,
          date: new Date().toISOString().split("T")[0],
          juzNumber,
          versesRead: updatedProgress.find(j => j.juz === juzNumber)?.completed ? 100 : 0,
          totalVerses: 100,
          completed: updatedProgress.find(j => j.juz === juzNumber)?.completed || false,
        });
      } catch (error) {
        console.error("Error syncing progress to Convex:", error);
      }
    }

    setSaving(false);
  }, [juzProgress, userId, readingPlan, updateReadingPlanMutation, saveQuranProgressMutation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Loading Quran progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="book-outline" size={24} color="#ffffff" />
            <View style={styles.planDetails}>
              <Text style={styles.planJuz}>Juz {readingPlan.currentJuz}</Text>
              <Text style={styles.planVerses}>{readingPlan.dailyVerses} verses planned</Text>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => toggleJuzCompleted(readingPlan.currentJuz)}
            >
              <Text style={styles.startButtonText}>
                {juzProgress[readingPlan.currentJuz - 1]?.completed ? "Done ✓" : "Mark Done"}
              </Text>
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
              <Text style={styles.statValue}>{30 - completedJuz}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        <View style={styles.juzList}>
          <Text style={styles.juzListTitle}>Juz Progress {saving && "(Saving...)"}</Text>
          {juzProgress.map((juz) => (
            <TouchableOpacity
              key={juz.juz}
              style={[
                styles.juzCard,
                juz.completed && styles.completedJuzCard,
              ]}
              onPress={() => toggleJuzCompleted(juz.juz)}
              disabled={saving}
            >
              <View style={styles.juzInfo}>
                <Text style={styles.juzName}>{juz.name}</Text>
                <Text style={styles.juzProgress}>
                  {juz.completed ? "Completed ✓" : "Tap to mark complete"}
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
});