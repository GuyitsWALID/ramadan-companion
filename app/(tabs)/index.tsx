import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../../context/UserContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

// Helper to calculate Ramadan day (simplified - assumes Ramadan 2026 starts Feb 17)
const getRamadanDay = (): { day: number; total: number } | null => {
  const ramadanStart = new Date(2026, 1, 17); // Feb 17, 2026
  const ramadanEnd = new Date(2026, 2, 18); // Mar 18, 2026
  const today = new Date();
  
  if (today >= ramadanStart && today <= ramadanEnd) {
    const diffTime = today.getTime() - ramadanStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { day: diffDays, total: 30 };
  }
  return null;
};

export default function HomeScreen() {
  const { user, loading: userLoading } = useUser();
  const { 
    prayerTimes, 
    nextPrayer, 
    loading: prayerLoading, 
    formatTimeUntil 
  } = usePrayerTimes();

  const ramadanDay = getRamadanDay();
  const completedPrayers = prayerTimes.filter(p => p.completed && p.name !== "Sunrise").length;
  const totalPrayers = prayerTimes.filter(p => p.name !== "Sunrise").length;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (prayerLoading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Assalamu Alaikum</Text>
          <Text style={styles.subtitle}>
            {getGreeting()}{user?.name ? `, ${user.name}` : ""}
          </Text>
        </View>

        {/* Next Prayer Card */}
        <View style={styles.card}>
          <Ionicons name="time" size={32} color={colors.primary} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Next Prayer</Text>
            <Text style={styles.cardSubtitle}>
              {nextPrayer 
                ? `${nextPrayer.name} in ${formatTimeUntil(nextPrayer.minutesUntil)}`
                : "All prayers completed for today"
              }
            </Text>
            {nextPrayer && (
              <Text style={styles.cardTime}>at {nextPrayer.time}</Text>
            )}
          </View>
        </View>

        {/* Quran Reading Card */}
        <View style={styles.card}>
          <Ionicons name="book" size={32} color={colors.primary} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Quran Reading</Text>
            <Text style={styles.cardSubtitle}>
              {user?.quranReadingPlan 
                ? `Juz ${user.quranReadingPlan.currentJuz} - ${user.quranReadingPlan.dailyVerses} verses daily`
                : "Set up your reading plan"
              }
            </Text>
          </View>
        </View>

        {/* Ramadan Day Card */}
        <View style={styles.card}>
          <Ionicons name="calendar" size={32} color={colors.primary} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Ramadan</Text>
            <Text style={styles.cardSubtitle}>
              {ramadanDay 
                ? `Day ${ramadanDay.day} of ${ramadanDay.total}`
                : "Ramadan starts Feb 17, 2026"
              }
            </Text>
          </View>
        </View>

        {/* Today's Prayer Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Prayers</Text>
          {prayerTimes
            .filter(prayer => prayer.name !== "Sunrise")
            .map((prayer, index) => (
              <View key={index} style={styles.reminderItem}>
                <Ionicons 
                  name={prayer.completed ? "checkmark-circle" : prayer.isUpcoming ? "time" : "radio-button-off"} 
                  size={20} 
                  color={prayer.completed ? colors.primary : prayer.isUpcoming ? colors.warning : colors.textMuted} 
                />
                <Text style={[
                  styles.reminderText,
                  prayer.completed && styles.completedText,
                  prayer.isUpcoming && styles.upcomingText,
                ]}>
                  {prayer.name} - {prayer.time}
                </Text>
                <Text style={styles.prayerStatus}>
                  {prayer.completed ? "✓" : prayer.isUpcoming ? "Next" : ""}
                </Text>
              </View>
            ))}
          <View style={styles.progressSummary}>
            <Text style={styles.progressText}>
              {completedPrayers} of {totalPrayers} prayers completed
            </Text>
          </View>
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
  welcome: {
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.md,
  },
  cardContent: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  reminderText: {
    marginLeft: spacing.md,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    flex: 1,
  },
  completedText: {
    color: colors.primary,
    textDecorationLine: "line-through",
  },
  upcomingText: {
    color: colors.warning,
    fontFamily: typography.fonts.semiBold,
  },
  prayerStatus: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  cardTime: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  progressSummary: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryLight + "20",
    borderRadius: borderRadius.md,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
    textAlign: "center",
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