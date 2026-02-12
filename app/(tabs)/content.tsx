import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { typography, spacing, borderRadius, getShadows } from "../../constants/theme";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ActivityHeatMap } from "../../components/ActivityHeatMap";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Ramadan 2026 dates
const RAMADAN_START = new Date("2026-02-17");
const RAMADAN_END = new Date("2026-03-18");

function getRamadanDay(): number {
  const today = new Date();
  if (today < RAMADAN_START) return 0;
  if (today > RAMADAN_END) return 30;
  const diff = Math.floor((today.getTime() - RAMADAN_START.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const shadows = getShadows(isDark);
  const styles = getStyles(colors, shadows);

  const dashboardStats = useQuery(api.tracking.getDashboardStats, {});
  const weeklyPrayer = useQuery(api.tracking.getWeeklyPrayerStats, {});
  const fastingDays = useQuery(api.tracking.getFastingDays, {});

  const ramadanDay = getRamadanDay();

  const fastingCalendar = useMemo(() => {
    if (!fastingDays) return [];
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const date = new Date(RAMADAN_START);
      date.setDate(date.getDate() + i - 1);
      const dateStr = date.toISOString().split("T")[0];
      const record = fastingDays.find((f: any) => f.date === dateStr);
      days.push({
        day: i,
        date: dateStr,
        status: record?.status || (i <= ramadanDay ? "pending" : "future"),
      });
    }
    return days;
  }, [fastingDays, ramadanDay]);

  const maxBarValue = useMemo(() => {
    if (!weeklyPrayer?.length) return 5;
    return Math.max(...weeklyPrayer.map((d: any) => d.totalCompleted), 1);
  }, [weeklyPrayer]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Ramadan Journey</Text>
          <Text style={styles.headerSubtitle}>
            {ramadanDay > 0 && ramadanDay <= 30
              ? `Day ${ramadanDay} of 30`
              : ramadanDay > 30
              ? "Ramadan Completed \u2014 Eid Mubarak!"
              : "Ramadan starts soon, In Shaa Allah"}
          </Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: colors.primary + "15" }]}>  
            <Ionicons name="time" size={24} color={colors.primary} />
            <Text style={styles.overviewValue}>
              {dashboardStats?.prayer.totalCompleted ?? 0}
            </Text>
            <Text style={styles.overviewLabel}>Prayers</Text>
            <Text style={styles.overviewSub}>
              of {dashboardStats?.prayer.totalPossible ?? 0} possible
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: colors.secondary + "15" }]}>
            <Ionicons name="moon" size={24} color={colors.secondary} />
            <Text style={styles.overviewValue}>
              {dashboardStats?.fasting.totalFasted ?? 0}
            </Text>
            <Text style={styles.overviewLabel}>Days Fasted</Text>
            <Text style={styles.overviewSub}>
              of {ramadanDay > 0 ? Math.min(ramadanDay, 30) : 0} so far
            </Text>
          </View>
        </View>

        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: colors.accent + "15" }]}>
            <Ionicons name="book" size={24} color={colors.accent} />
            <Text style={styles.overviewValue}>
              {dashboardStats?.quran.totalVersesRead ?? 0}
            </Text>
            <Text style={styles.overviewLabel}>Verses Read</Text>
            <Text style={styles.overviewSub}>
              {dashboardStats?.quran.uniqueJuzCompleted ?? 0} Juz completed
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: colors.info + "15" }]}>
            <Ionicons name="flame" size={24} color={colors.info} />
            <Text style={styles.overviewValue}>
              {dashboardStats?.streaks.prayer ?? 0}
            </Text>
            <Text style={styles.overviewLabel}>Prayer Streak</Text>
            <Text style={styles.overviewSub}>
              Best: {dashboardStats?.streaks.longestPrayer ?? 0} days
            </Text>
          </View>
        </View>

        {/* Prayer Completion Rate */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prayer Completion</Text>
          <View style={styles.completionRateRow}>
            <View style={styles.completionRing}>
              <Text style={styles.completionPercent}>
                {dashboardStats?.prayer.completionRate ?? 0}%
              </Text>
            </View>
            <View style={styles.completionDetails}>
              {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((prayer) => {
                const key = prayer.toLowerCase() as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
                const count = dashboardStats?.prayer.breakdown[key] ?? 0;
                const total = dashboardStats?.prayer.breakdown.totalDays ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <View key={prayer} style={styles.prayerRow}>
                    <Text style={styles.prayerName}>{prayer}</Text>
                    <View style={styles.prayerBarBg}>
                      <View
                        style={[
                          styles.prayerBarFill,
                          { width: `${pct}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={styles.prayerPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Weekly Prayer Bar Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.barChart}>
            {(weeklyPrayer ?? []).map((day: any, index: number) => {
              const height = maxBarValue > 0 ? (day.totalCompleted / 5) * 100 : 0;
              return (
                <View key={index} style={styles.barColumn}>
                  <Text style={styles.barValue}>{day.totalCompleted}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(height, 4)}%`,
                          backgroundColor:
                            day.totalCompleted === 5
                              ? colors.success
                              : day.totalCompleted > 0
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day.dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Fasting Calendar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fasting Log</Text>
          <View style={styles.fastingGrid}>
            {fastingCalendar.map((day) => (
              <View
                key={day.day}
                style={[
                  styles.fastingDay,
                  day.status === "fasted" && { backgroundColor: colors.success },
                  day.status === "missed" && { backgroundColor: colors.error },
                  day.status === "excused" && { backgroundColor: colors.warning },
                  day.status === "pending" && { backgroundColor: colors.border },
                  day.status === "future" && {
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fastingDayText,
                    (day.status === "fasted" ||
                      day.status === "missed") && {
                      color: "#fff",
                    },
                  ]}
                >
                  {day.day}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.fastingLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>
                Fasted ({dashboardStats?.fasting.totalFasted ?? 0})
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={styles.legendText}>
                Missed ({dashboardStats?.fasting.totalMissed ?? 0})
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>
                Excused ({dashboardStats?.fasting.totalExcused ?? 0})
              </Text>
            </View>
          </View>
        </View>

        {/* Streaks Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streaks</Text>
          <View style={styles.streaksRow}>
            <View style={styles.streakItem}>
              <Ionicons name="time" size={28} color={colors.primary} />
              <Text style={styles.streakValue}>{dashboardStats?.streaks.prayer ?? 0}</Text>
              <Text style={styles.streakLabel}>Prayer</Text>
              <Text style={styles.streakBest}>
                Best: {dashboardStats?.streaks.longestPrayer ?? 0}
              </Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Ionicons name="moon" size={28} color={colors.secondary} />
              <Text style={styles.streakValue}>{dashboardStats?.streaks.fasting ?? 0}</Text>
              <Text style={styles.streakLabel}>Fasting</Text>
              <Text style={styles.streakBest}>
                Best: {dashboardStats?.streaks.longestFasting ?? 0}
              </Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Ionicons name="book" size={28} color={colors.accent} />
              <Text style={styles.streakValue}>{dashboardStats?.streaks.quran ?? 0}</Text>
              <Text style={styles.streakLabel}>Quran</Text>
              <Text style={styles.streakBest}>
                Best: {dashboardStats?.streaks.longestQuran ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Overview</Text>
          <ActivityHeatMap />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    header: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    headerTitle: {
      fontSize: typography.sizes.xxl,
      fontFamily: typography.fonts.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    overviewRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    overviewCard: {
      flex: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: "center",
      ...shadows.sm,
    },
    overviewValue: {
      fontSize: typography.sizes.xxxl,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      marginTop: spacing.sm,
    },
    overviewLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
      marginTop: spacing.xxs,
    },
    overviewSub: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    cardTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    completionRateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
    },
    completionRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 6,
      borderColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    completionPercent: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.bold,
      color: colors.primary,
    },
    completionDetails: {
      flex: 1,
      gap: spacing.sm,
    },
    prayerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    prayerName: {
      width: 56,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.medium,
      color: colors.textSecondary,
    },
    prayerBarBg: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceElevated,
      overflow: "hidden",
    },
    prayerBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    prayerPct: {
      width: 36,
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.semiBold,
      color: colors.textMuted,
      textAlign: "right",
    },
    barChart: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: 150,
      gap: spacing.xs,
    },
    barColumn: {
      flex: 1,
      alignItems: "center",
      height: "100%",
      justifyContent: "flex-end",
    },
    barValue: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.semiBold,
      color: colors.textMuted,
      marginBottom: 4,
    },
    barTrack: {
      width: "70%",
      height: 100,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceElevated,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: {
      width: "100%",
      borderRadius: borderRadius.sm,
    },
    barLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.medium,
      color: colors.textMuted,
      marginTop: 6,
    },
    fastingGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    fastingDay: {
      width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2 - spacing.sm * 9) / 10,
      aspectRatio: 1,
      borderRadius: borderRadius.sm,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 28,
    },
    fastingDayText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
    },
    fastingLegend: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
      marginTop: spacing.lg,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
    },
    streaksRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    streakItem: {
      flex: 1,
      alignItems: "center",
    },
    streakValue: {
      fontSize: typography.sizes.xxl,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      marginTop: spacing.sm,
    },
    streakLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.medium,
      color: colors.textSecondary,
      marginTop: 2,
    },
    streakBest: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    streakDivider: {
      width: 1,
      height: 60,
      backgroundColor: colors.border,
    },
  });
