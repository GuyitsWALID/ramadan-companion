import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

interface JuzProgress {
  juz: number;
  name: string;
  completed: boolean;
  progress: number;
}

const JUZ_PROGRESS_KEY = "@ramadan_juz_progress";

export default function QuranScreen() {
  const { user: userContextUser, userId } = useUser();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Merge user data - auth user takes priority
  const user = authUser || userContextUser;
  
  const [readingPlan, setReadingPlan] = useState({
    dailyVerses: authUser?.quranGoal || 20,
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

  // Update reading plan from user context (including auth user's quran goal)
  useEffect(() => {
    if (authUser?.quranGoal) {
      setReadingPlan(prev => ({
        ...prev,
        dailyVerses: authUser.quranGoal!,
      }));
    } else if (userContextUser?.quranReadingPlan) {
      setReadingPlan({
        dailyVerses: userContextUser.quranReadingPlan.dailyVerses,
        currentJuz: userContextUser.quranReadingPlan.currentJuz,
        startDate: userContextUser.quranReadingPlan.startDate,
      });
    }
  }, [authUser, userContextUser]);

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
          <ActivityIndicator size="large" color={colors.primary} />
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
            <Ionicons name="book-outline" size={24} color={colors.textOnPrimary} />
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
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                ) : (
                  <Ionicons name="radio-button-off" size={24} color={colors.textMuted} />
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  progressPercentage: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  planCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  planTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.lg,
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  planDetails: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  planJuz: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  planVerses: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  startButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  startButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  statsTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  juzList: {
    marginTop: spacing.xl,
  },
  juzListTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  juzCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  completedJuzCard: {
    backgroundColor: colors.success + "15",
  },
  juzInfo: {
    flex: 1,
  },
  juzName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  juzProgress: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
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
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
});