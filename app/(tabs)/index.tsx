import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";
import ActivityHeatMap from "../../components/ActivityHeatMap";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

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

// Storage keys
const ACTIVITY_KEY = "@activity_data";
const FASTING_KEY = "@fasting_data";
const DATA_VERSION_KEY = "@data_version";
const CURRENT_DATA_VERSION = "2"; // Increment this to reset data

interface DayActivity {
  date: string;
  prayers: number;
  quranRead: boolean;
  fasted: boolean;
}

export default function HomeScreen() {
  const { user: userContextUser, loading: userLoading } = useUser();
  const { user: authUser } = useAuth();
  const { colors, shadows } = useTheme();
  const { 
    prayerTimes, 
    nextPrayer, 
    loading: prayerLoading, 
    formatTimeUntil 
  } = usePrayerTimes();

  const [activityData, setActivityData] = useState<DayActivity[]>([]);
  const [todayFasted, setTodayFasted] = useState(false);
  const [streak, setStreak] = useState({ prayers: 0, fasting: 0, quran: 0 });

  // Convex integration
  const { isAuthenticated } = useConvexAuth();
  const convexStreaks = useQuery(api.tracking.getStreaks, isAuthenticated ? {} : "skip");
  const saveFastingDayMut = useMutation(api.tracking.saveFastingDay);

  // Dynamic styles
  const styles = getStyles(colors, shadows);

  // Merge user data - auth user takes priority
  const user = authUser || userContextUser;

  // Use Convex streaks when available, fallback to local
  const displayStreak = useMemo(() => ({
    prayers: convexStreaks?.prayerStreak ?? streak.prayers,
    fasting: convexStreaks?.fastingStreak ?? streak.fasting,
    quran: convexStreaks?.quranStreak ?? streak.quran,
  }), [convexStreaks, streak]);

  const ramadanDay = getRamadanDay();
  const completedPrayers = prayerTimes.filter(p => p.completed && p.name !== "Sunrise").length;
  const totalPrayers = prayerTimes.filter(p => p.name !== "Sunrise").length;
  const prayerProgress = totalPrayers > 0 ? (completedPrayers / totalPrayers) * 100 : 0;

  // Load activity data from storage
  useEffect(() => {
    checkAndResetDataIfNeeded();
  }, []);

  // Update today's activity when prayer times or fasting status change
  useEffect(() => {
    if (prayerTimes.length > 0) {
      updateTodayActivity();
    }
  }, [completedPrayers, todayFasted]);

  // Check data version and reset if outdated (clears old sample data)
  const checkAndResetDataIfNeeded = async () => {
    try {
      const storedVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
      if (storedVersion !== CURRENT_DATA_VERSION) {
        // Clear old data
        await AsyncStorage.removeItem(ACTIVITY_KEY);
        await AsyncStorage.removeItem(FASTING_KEY);
        await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
        console.log("Cleared old sample data, starting fresh");
        setActivityData([]);
        setTodayFasted(false);
        setStreak({ prayers: 0, fasting: 0, quran: 0 });
      } else {
        loadActivityData();
        loadFastingStatus();
      }
    } catch (error) {
      console.error("Error checking data version:", error);
      loadActivityData();
      loadFastingStatus();
    }
  };

  const loadActivityData = async () => {
    try {
      const data = await AsyncStorage.getItem(ACTIVITY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setActivityData(parsed);
        calculateStreaks(parsed);
      } else {
        // Initialize with empty data - no sample data
        setActivityData([]);
      }
    } catch (error) {
      console.error("Error loading activity data:", error);
      setActivityData([]);
    }
  };

  const loadFastingStatus = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await AsyncStorage.getItem(FASTING_KEY);
      if (data) {
        const fastingDays = JSON.parse(data);
        setTodayFasted(fastingDays.includes(today));
      }
    } catch (error) {
      console.error("Error loading fasting status:", error);
    }
  };

  const toggleFasting = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await AsyncStorage.getItem(FASTING_KEY);
      let fastingDays = data ? JSON.parse(data) : [];
      
      if (todayFasted) {
        fastingDays = fastingDays.filter((d: string) => d !== today);
      } else {
        fastingDays.push(today);
      }
      
      await AsyncStorage.setItem(FASTING_KEY, JSON.stringify(fastingDays));
      setTodayFasted(!todayFasted);

      // Also persist to Convex
      if (isAuthenticated) {
        const ramadan = getRamadanDay();
        if (ramadan) {
          saveFastingDayMut({
            date: today,
            ramadanDay: ramadan.day,
            status: todayFasted ? "missed" : "fasted",
          }).catch(err => console.error("Error saving fasting to Convex:", err));
        }
      }
    } catch (error) {
      console.error("Error toggling fasting:", error);
    }
  };

  const updateTodayActivity = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const quranRead = (user?.quranReadingPlan?.currentJuz || 0) > 0 || (user?.quranReadingPlan?.dailyVerses || 0) > 0;
    
    // Load fresh data to avoid stale state
    let currentData: DayActivity[] = [];
    try {
      const storedData = await AsyncStorage.getItem(ACTIVITY_KEY);
      if (storedData) {
        currentData = JSON.parse(storedData);
      }
    } catch (error) {
      console.error("Error loading activity data:", error);
    }
    
    const todayIndex = currentData.findIndex(d => d.date === today);
    
    const todayData: DayActivity = {
      date: today,
      prayers: completedPrayers,
      quranRead,
      fasted: todayFasted,
    };
    
    if (todayIndex >= 0) {
      currentData[todayIndex] = todayData;
    } else {
      currentData.push(todayData);
    }
    
    // Sort by date and keep only last 49 days
    currentData = currentData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-49);
    
    setActivityData(currentData);
    
    try {
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(currentData));
    } catch (error) {
      console.error("Error saving activity data:", error);
    }
    
    // Calculate streaks
    calculateStreaks(currentData);
  }, [completedPrayers, todayFasted, user]);

  const calculateStreaks = (data: DayActivity[]) => {
    if (data.length === 0) {
      setStreak({ prayers: 0, fasting: 0, quran: 0 });
      return;
    }

    // Sort by date descending (most recent first)
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let prayerStreak = 0;
    let fastingStreak = 0;
    let quranStreak = 0;
    
    // Calculate consecutive day streaks
    // For prayer streak: count consecutive days with at least 1 prayer completed
    for (let i = 0; i < sortedData.length; i++) {
      const dayDate = new Date(sortedData[i].date);
      dayDate.setHours(0, 0, 0, 0);
      
      // Check if this is a consecutive day
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (dayDate.getTime() !== expectedDate.getTime()) {
        break; // Gap in days, streak ends
      }
      
      if (sortedData[i].prayers >= 1) {
        prayerStreak++;
      } else {
        break;
      }
    }
    
    // For fasting streak
    for (let i = 0; i < sortedData.length; i++) {
      const dayDate = new Date(sortedData[i].date);
      dayDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (dayDate.getTime() !== expectedDate.getTime()) {
        break;
      }
      
      if (sortedData[i].fasted) {
        fastingStreak++;
      } else {
        break;
      }
    }
    
    // For quran streak
    for (let i = 0; i < sortedData.length; i++) {
      const dayDate = new Date(sortedData[i].date);
      dayDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (dayDate.getTime() !== expectedDate.getTime()) {
        break;
      }
      
      if (sortedData[i].quranRead) {
        quranStreak++;
      } else {
        break;
      }
    }
    
    setStreak({ prayers: prayerStreak, fasting: fastingStreak, quran: quranStreak });
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get first name for greeting
  const getFirstName = () => {
    if (!user?.name) return "";
    return user.name.split(" ")[0];
  };

  // Stats calculations - get actual last 7 days
  const weeklyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalPrayers = 0;
    let fastDays = 0;
    let quranDays = 0;
    
    // Check each of the last 7 days
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      
      const dayData = activityData.find(d => d.date === dateStr);
      if (dayData) {
        totalPrayers += dayData.prayers;
        if (dayData.fasted) fastDays++;
        if (dayData.quranRead) quranDays++;
      }
    }
    
    return { totalPrayers, fastDays, quranDays, maxPrayers: 35 };
  }, [activityData]);

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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Assalamu Alaikum</Text>
            <Text style={styles.subtitle}>
              {getGreeting()}{getFirstName() ? `, ${getFirstName()}` : ""}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color={colors.warning} />
            <Text style={styles.streakText}>{displayStreak.prayers}</Text>
          </View>
        </View>

        {/* Ramadan Progress (if during Ramadan) */}
        {ramadanDay && (
          <View style={styles.ramadanBanner}>
            <View style={styles.ramadanHeader}>
              <Text style={styles.ramadanTitle}>🌙 Ramadan Mubarak!</Text>
              <Text style={styles.ramadanDay}>Day {ramadanDay.day}/{ramadanDay.total}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${(ramadanDay.day / ramadanDay.total) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Today's Overview Cards */}
        <View style={styles.overviewGrid}>
          {/* Next Prayer Card */}
          <View style={[styles.overviewCard, styles.prayerCard]}>
            <View style={styles.cardIcon}>
              <Ionicons name="moon" size={24} color={colors.primary} />
            </View>
            <Text style={styles.overviewLabel}>Next Prayer</Text>
            <Text style={styles.overviewValue}>
              {nextPrayer ? nextPrayer.name : "Done ✓"}
            </Text>
            {nextPrayer && (
              <Text style={styles.overviewSubtext}>
                in {formatTimeUntil(nextPrayer.minutesUntil)}
              </Text>
            )}
          </View>

          {/* Fasting Card */}
          <TouchableOpacity 
            style={[styles.overviewCard, styles.fastingCard, todayFasted && styles.activeCard]}
            onPress={toggleFasting}
          >
            <View style={styles.cardIcon}>
              <Ionicons 
                name={todayFasted ? "checkmark-circle" : "restaurant-outline"} 
                size={24} 
                color={todayFasted ? colors.success : colors.secondary} 
              />
            </View>
            <Text style={styles.overviewLabel}>Fasting</Text>
            <Text style={styles.overviewValue}>
              {todayFasted ? "Fasting ✓" : "Not Set"}
            </Text>
            <Text style={styles.overviewSubtext}>Tap to toggle</Text>
          </TouchableOpacity>
        </View>

        {/* Prayer Progress Ring */}
        <View style={styles.progressSection}>
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRing}>
              <View style={[styles.progressFill, { 
                backgroundColor: prayerProgress >= 100 ? colors.success : colors.primary,
              }]}>
                <Text style={styles.progressPercent}>{Math.round(prayerProgress)}%</Text>
              </View>
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Today's Prayers</Text>
              <Text style={styles.progressStats}>{completedPrayers}/{totalPrayers} completed</Text>
              <View style={styles.prayerDots}>
                {prayerTimes
                  .filter(p => p.name !== "Sunrise")
                  .map((prayer, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.prayerDot,
                        prayer.completed && styles.prayerDotCompleted,
                        prayer.isUpcoming && styles.prayerDotUpcoming,
                      ]}
                    />
                  ))
                }
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Stats */}
        <View style={styles.weeklyStats}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.totalPrayers}</Text>
              <Text style={styles.statLabel}>Prayers</Text>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgress, { 
                  width: `${(weeklyStats.totalPrayers / weeklyStats.maxPrayers) * 100}%`,
                  backgroundColor: colors.primary 
                }]} />
              </View>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.fastDays}</Text>
              <Text style={styles.statLabel}>Fast Days</Text>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgress, { 
                  width: `${(weeklyStats.fastDays / 7) * 100}%`,
                  backgroundColor: colors.secondary 
                }]} />
              </View>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.quranDays}</Text>
              <Text style={styles.statLabel}>Quran Days</Text>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgress, { 
                  width: `${(weeklyStats.quranDays / 7) * 100}%`,
                  backgroundColor: colors.success 
                }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Streaks Section */}
        <View style={styles.streaksSection}>
          <Text style={styles.sectionTitle}>Current Streaks</Text>
          <View style={styles.streaksRow}>
            <View style={styles.streakItem}>
              <Ionicons name="flame" size={28} color={colors.warning} />
              <Text style={styles.streakNumber}>{displayStreak.prayers}</Text>
              <Text style={styles.streakLabel}>Prayer Days</Text>
            </View>
            <View style={styles.streakItem}>
              <Ionicons name="restaurant" size={28} color={colors.secondary} />
              <Text style={styles.streakNumber}>{displayStreak.fasting}</Text>
              <Text style={styles.streakLabel}>Fast Days</Text>
            </View>
            <View style={styles.streakItem}>
              <Ionicons name="book" size={28} color={colors.success} />
              <Text style={styles.streakNumber}>{displayStreak.quran}</Text>
              <Text style={styles.streakLabel}>Quran Days</Text>
            </View>
          </View>
        </View>

        {/* Activity Heat Map */}
        <View style={styles.heatMapSection}>
          <ActivityHeatMap
            data={activityData}
            weeks={7}
            colors={colors}
            shadows={shadows}
            title="Activity Overview"
          />
        </View>

        {/* Today's Prayer List */}
        <View style={styles.prayerListSection}>
          <Text style={styles.sectionTitle}>Prayer Schedule</Text>
          {prayerTimes
            .filter(prayer => prayer.name !== "Sunrise")
            .map((prayer, index) => (
              <View 
                key={index} 
                style={[
                  styles.prayerItem,
                  prayer.isUpcoming && styles.prayerItemUpcoming,
                  prayer.completed && styles.prayerItemCompleted,
                ]}
              >
                <View style={styles.prayerItemLeft}>
                  <Ionicons 
                    name={prayer.completed ? "checkmark-circle" : prayer.isUpcoming ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={prayer.completed ? colors.success : prayer.isUpcoming ? colors.primary : colors.textMuted} 
                  />
                  <View style={styles.prayerItemInfo}>
                    <Text style={[
                      styles.prayerItemName,
                      prayer.completed && styles.prayerItemNameCompleted,
                    ]}>
                      {prayer.name}
                    </Text>
                    <Text style={styles.prayerItemTime}>{prayer.time}</Text>
                  </View>
                </View>
                {prayer.isUpcoming && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>Next</Text>
                  </View>
                )}
                {prayer.completed && (
                  <Ionicons name="checkmark" size={20} color={colors.success} />
                )}
              </View>
            ))
          }
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/quran")}
            >
              <Ionicons name="book-outline" size={24} color={colors.primary} />
              <Text style={styles.actionLabel}>Read Quran</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/prayer")}
            >
              <Ionicons name="compass-outline" size={24} color={colors.secondary} />
              <Text style={styles.actionLabel}>Find Qibla</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/calendar")}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.accent} />
              <Text style={styles.actionLabel}>Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  welcome: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warning + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  streakText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.warning,
  },
  
  // Ramadan Banner
  ramadanBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ramadanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  ramadanTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  ramadanDay: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary + "CC",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.textOnPrimary + "30",
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.textOnPrimary,
    borderRadius: borderRadius.full,
  },

  // Overview Grid
  overviewGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  prayerCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  fastingCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  activeCard: {
    borderLeftColor: colors.success,
    backgroundColor: colors.success + "10",
  },
  cardIcon: {
    marginBottom: spacing.xs,
  },
  overviewLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  overviewValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  overviewSubtext: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  // Progress Section
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  progressRingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressFill: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  progressStats: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  prayerDots: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  prayerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  prayerDotCompleted: {
    backgroundColor: colors.success,
  },
  prayerDotUpcoming: {
    backgroundColor: colors.primary,
  },

  // Weekly Stats
  weeklyStats: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  miniProgressBar: {
    width: "80%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  miniProgress: {
    height: "100%",
    borderRadius: borderRadius.full,
  },

  // Streaks Section
  streaksSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  streaksRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.md,
  },
  streakItem: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  streakNumber: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  streakLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // Heat Map Section
  heatMapSection: {
    marginBottom: spacing.lg,
  },

  // Section Title
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  // Prayer List Section
  prayerListSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prayerItemUpcoming: {
    backgroundColor: colors.primary + "10",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  prayerItemCompleted: {
    opacity: 0.7,
  },
  prayerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  prayerItemInfo: {},
  prayerItemName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  prayerItemNameCompleted: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  prayerItemTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  nextBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  nextBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },

  // Quick Actions
  quickActions: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.md,
  },
  actionButton: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },

  // Loading
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