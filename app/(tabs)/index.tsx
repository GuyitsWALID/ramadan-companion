import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Ramadan dates
const RAMADAN_START_2026 = new Date(2026, 1, 17); // Feb 17, 2026
const RAMADAN_END_2026 = new Date(2026, 2, 18); // Mar 18, 2026
const RAMADAN_DAYS = 30;

// Storage keys
const FASTING_KEY = "@fasting_data";
const DATA_VERSION_KEY = "@data_version";
const CURRENT_DATA_VERSION = "3";

type FastingStatus = "fasted" | "missed" | "excused" | "upcoming";

interface FastingRecord {
  [day: number]: FastingStatus;
}

interface DailyDua {
  arabic: string;
  transliteration: string;
  translation: string;
  occasion: string;
}

const DAILY_DUAS: DailyDua[] = [
  {
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي",
    transliteration: "Rabbi-shrah lee sadree",
    translation: "My Lord, expand for me my breast [with assurance]",
    occasion: "For Ease & Clarity",
  },
  {
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً",
    transliteration: "Rabbana aatina fid-dunya hasanatan wa fil-aakhirati hasanatan",
    translation: "Our Lord, give us good in this world and good in the Hereafter",
    occasion: "For Success",
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow",
    occasion: "For Peace",
  },
];

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

  const [fastingRecord, setFastingRecord] = useState<FastingRecord>({});
  const [todayFasted, setTodayFasted] = useState(false);
  const [currentRamadanDay, setCurrentRamadanDay] = useState(1);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showDua, setShowDua] = useState(false);
  const [selectedDuaIndex, setSelectedDuaIndex] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Convex integration
  const { isAuthenticated } = useConvexAuth();
  const convexStreaks = useQuery(api.tracking.getStreaks, isAuthenticated ? {} : "skip");
  const saveFastingDayMut = useMutation(api.tracking.saveFastingDay);

  const styles = getStyles(colors, shadows);
  const user = authUser || userContextUser;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Calculate current Ramadan day
  useEffect(() => {
    const today = new Date();
    const diffTime = today.getTime() - RAMADAN_START_2026.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays >= 1 && diffDays <= 30) {
      setCurrentRamadanDay(diffDays);
    } else if (diffDays < 1) {
      setCurrentRamadanDay(1);
    } else {
      setCurrentRamadanDay(30);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const targetDate = now < RAMADAN_START_2026 ? RAMADAN_START_2026 : RAMADAN_END_2026;
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load fasting data
  useEffect(() => {
    checkAndResetDataIfNeeded();
  }, []);

  // Update today's fasting status
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    loadTodayFastingStatus();
  }, []);

  const checkAndResetDataIfNeeded = async () => {
    try {
      const storedVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
      if (storedVersion !== CURRENT_DATA_VERSION) {
        await AsyncStorage.removeItem(FASTING_KEY);
        await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
        setFastingRecord({});
        setTodayFasted(false);
      } else {
        loadFastingRecord();
      }
    } catch (error) {
      console.error("Error checking data version:", error);
      loadFastingRecord();
    }
  };

  const loadFastingRecord = async () => {
    try {
      const saved = await AsyncStorage.getItem(FASTING_KEY);
      if (saved) {
        setFastingRecord(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading fasting record:", error);
    }
  };

  const loadTodayFastingStatus = async () => {
    try {
      const saved = await AsyncStorage.getItem(FASTING_KEY);
      if (saved) {
        const record: FastingRecord = JSON.parse(saved);
        const status = record[currentRamadanDay];
        setTodayFasted(status === "fasted");
      }
    } catch (error) {
      console.error("Error loading today's fasting status:", error);
    }
  };

  const saveFastingRecord = async (record: FastingRecord) => {
    try {
      await AsyncStorage.setItem(FASTING_KEY, JSON.stringify(record));
      setFastingRecord(record);
    } catch (error) {
      console.error("Error saving fasting record:", error);
    }
  };

  const toggleTodayFasting = async () => {
    const newStatus: FastingStatus = todayFasted ? "upcoming" : "fasted";
    const newRecord = { ...fastingRecord, [currentRamadanDay]: newStatus };
    await saveFastingRecord(newRecord);
    setTodayFasted(!todayFasted);

    // Sync to Convex
    if (isAuthenticated) {
      const dayDate = new Date(RAMADAN_START_2026);
      dayDate.setDate(dayDate.getDate() + currentRamadanDay - 1);
      const dateStr = dayDate.toISOString().split("T")[0];
      saveFastingDayMut({
        date: dateStr,
        ramadanDay: currentRamadanDay,
        status: newStatus === "upcoming" ? "missed" : newStatus,
      }).catch(err => console.error("Error saving to Convex:", err));
    }
  };

  const updateFastingDay = useCallback(async (day: number, currentStatus: FastingStatus) => {
    const statusOrder: FastingStatus[] = ["upcoming", "fasted", "missed", "excused"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    const newRecord = { ...fastingRecord, [day]: nextStatus };
    await saveFastingRecord(newRecord);

    if (day === currentRamadanDay) {
      setTodayFasted(nextStatus === "fasted");
    }

    // Sync to Convex
    if (isAuthenticated && nextStatus !== "upcoming") {
      const dayDate = new Date(RAMADAN_START_2026);
      dayDate.setDate(dayDate.getDate() + day - 1);
      const dateStr = dayDate.toISOString().split("T")[0];
      saveFastingDayMut({
        date: dateStr,
        ramadanDay: day,
        status: nextStatus as "fasted" | "missed" | "excused",
      }).catch(err => console.error("Error saving to Convex:", err));
    }
  }, [fastingRecord, currentRamadanDay, isAuthenticated]);

  // Prayer stats
  const completedPrayers = prayerTimes.filter(p => p.completed && p.name !== "Sunrise").length;
  const totalPrayers = prayerTimes.filter(p => p.name !== "Sunrise").length;
  const prayerProgress = totalPrayers > 0 ? (completedPrayers / totalPrayers) * 100 : 0;

  // Fasting statistics
  const fastingStats = useMemo(() => {
    const fasted = Object.values(fastingRecord).filter(s => s === "fasted").length;
    const missed = Object.values(fastingRecord).filter(s => s === "missed").length;
    const excused = Object.values(fastingRecord).filter(s => s === "excused").length;
    const total = Math.min(currentRamadanDay, 30);
    const percentage = total > 0 ? (fasted / total) * 100 : 0;
    return { fasted, missed, excused, total, percentage };
  }, [fastingRecord, currentRamadanDay]);

  // Streaks from Convex or local
  const displayStreak = useMemo(() => ({
    prayers: convexStreaks?.prayerStreak ?? 0,
    fasting: convexStreaks?.fastingStreak ?? 0,
    quran: convexStreaks?.quranStreak ?? 0,
  }), [convexStreaks]);

  const isRamadanActive = useMemo(() => {
    const today = new Date();
    return today >= RAMADAN_START_2026 && today <= RAMADAN_END_2026;
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getFirstName = () => {
    if (!user?.name) return "";
    return user.name.split(" ")[0];
  };

  const getFastingStatusIcon = (status: FastingStatus) => {
    switch (status) {
      case "fasted": return { icon: "checkmark-circle", color: colors.success };
      case "missed": return { icon: "close-circle", color: colors.error };
      case "excused": return { icon: "pause-circle", color: colors.warning };
      default: return { icon: "ellipse-outline", color: colors.border };
    }
  };

  const rotateDua = () => {
    setSelectedDuaIndex((prev) => (prev + 1) % DAILY_DUAS.length);
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Assalamu Alaikum</Text>
            <Text style={styles.subtitle}>
              {getGreeting()}{getFirstName() ? `, ${getFirstName()}` : ""}
            </Text>
          </View>
          <TouchableOpacity style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color={colors.warning} />
            <Text style={styles.streakText}>{displayStreak.prayers}</Text>
          </TouchableOpacity>
        </View>

        {/* Ramadan Countdown Banner */}
        <Animated.View style={[styles.countdownBanner, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.countdownHeader}>
            <Ionicons name="moon" size={24} color={colors.textOnPrimary} />
            <Text style={styles.countdownTitle}>
              {isRamadanActive ? "Ramadan in Progress" : "Countdown to Ramadan"}
            </Text>
          </View>
          <View style={styles.countdownRow}>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{countdown.days}</Text>
              <Text style={styles.countdownLabel}>Days</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{String(countdown.hours).padStart(2, '0')}</Text>
              <Text style={styles.countdownLabel}>Hours</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{String(countdown.minutes).padStart(2, '0')}</Text>
              <Text style={styles.countdownLabel}>Mins</Text>
            </View>
          </View>
          {isRamadanActive && (
            <View style={styles.ramadanDayBadge}>
              <Text style={styles.ramadanDayText}>Day {currentRamadanDay} of 30</Text>
            </View>
          )}
        </Animated.View>

        {/* Today's Overview - Prayer & Fasting */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          
          <View style={styles.overviewGrid}>
            {/* Prayer Card */}
            <View style={[styles.overviewCard, styles.prayerCard]}>
              <View style={styles.cardHeader}>
                <Ionicons name="moon-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Prayers</Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressNumber}>{Math.round(prayerProgress)}%</Text>
              </View>
              <Text style={styles.cardStats}>{completedPrayers}/{totalPrayers} completed</Text>
              <View style={styles.prayerDots}>
                {prayerTimes
                  .filter(p => p.name !== "Sunrise")
                  .map((prayer, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.prayerDot,
                        prayer.completed && styles.prayerDotCompleted,
                      ]}
                    />
                  ))
                }
              </View>
            </View>

            {/* Fasting Card */}
            <TouchableOpacity 
              style={[styles.overviewCard, styles.fastingCard, todayFasted && styles.activeCard]}
              onPress={toggleTodayFasting}
            >
              <View style={styles.cardHeader}>
                <Ionicons 
                  name={todayFasted ? "checkmark-circle" : "restaurant-outline"} 
                  size={20} 
                  color={todayFasted ? colors.success : colors.secondary} 
                />
                <Text style={styles.cardTitle}>Fasting</Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressNumber}>
                  {Math.round(fastingStats.percentage)}%
                </Text>
              </View>
              <Text style={styles.cardStats}>
                {fastingStats.fasted}/{fastingStats.total} days
              </Text>
              <Text style={styles.cardHint}>Tap to toggle today</Text>
            </TouchableOpacity>
          </View>

          {/* Next Prayer Info */}
          {nextPrayer && (
            <View style={styles.nextPrayerCard}>
              <View style={styles.nextPrayerLeft}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
                <View style={styles.nextPrayerInfo}>
                  <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
                  <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
                </View>
              </View>
              <View style={styles.nextPrayerRight}>
                <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
                <Text style={styles.nextPrayerCountdown}>
                  in {formatTimeUntil(nextPrayer.minutesUntil)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 30-Day Fasting Tracker */}
        <View style={styles.trackerSection}>
          <View style={styles.trackerHeader}>
            <Text style={styles.sectionTitle}>Fasting Tracker</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/calendar")}>
              <Text style={styles.viewAllText}>View Details</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.trackerStats}>
            <View style={styles.trackerStatItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.trackerStatText}>{fastingStats.fasted} Fasted</Text>
            </View>
            <View style={styles.trackerStatItem}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={styles.trackerStatText}>{fastingStats.missed} Missed</Text>
            </View>
            <View style={styles.trackerStatItem}>
              <Ionicons name="pause-circle" size={16} color={colors.warning} />
              <Text style={styles.trackerStatText}>{fastingStats.excused} Excused</Text>
            </View>
          </View>

          <View style={styles.trackerGrid}>
            {Array.from({ length: RAMADAN_DAYS }, (_, i) => {
              const day = i + 1;
              const status = fastingRecord[day] || "upcoming";
              const statusInfo = getFastingStatusIcon(status);
              const isToday = day === currentRamadanDay;
              const isPast = day <= currentRamadanDay;
              
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.trackerDay,
                    isToday && styles.trackerDayToday,
                    !isPast && styles.trackerDayFuture,
                  ]}
                  onPress={() => isPast && updateFastingDay(day, status)}
                  disabled={!isPast}
                >
                  <Text style={[
                    styles.trackerDayNumber,
                    isToday && styles.trackerDayNumberToday,
                    !isPast && styles.trackerDayNumberFuture,
                  ]}>
                    {day}
                  </Text>
                  {status !== "upcoming" && (
                    <Ionicons 
                      name={statusInfo.icon as any} 
                      size={10} 
                      color={statusInfo.color}
                      style={styles.trackerDayIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Streaks Section */}
        <View style={styles.streaksSection}>
          <Text style={styles.sectionTitle}>Your Streaks</Text>
          <View style={styles.streaksGrid}>
            <View style={styles.streakCard}>
              <Ionicons name="flame" size={32} color={colors.warning} />
              <Text style={styles.streakNumber}>{displayStreak.prayers}</Text>
              <Text style={styles.streakLabel}>Prayer Days</Text>
            </View>
            <View style={styles.streakCard}>
              <Ionicons name="restaurant" size={32} color={colors.secondary} />
              <Text style={styles.streakNumber}>{displayStreak.fasting}</Text>
              <Text style={styles.streakLabel}>Fast Days</Text>
            </View>
            <View style={styles.streakCard}>
              <Ionicons name="book" size={32} color={colors.success} />
              <Text style={styles.streakNumber}>{displayStreak.quran}</Text>
              <Text style={styles.streakLabel}>Quran Days</Text>
            </View>
          </View>
        </View>

        {/* Daily Dua */}
        <TouchableOpacity 
          style={styles.duaSection}
          onPress={() => setShowDua(!showDua)}
        >
          <View style={styles.duaHeader}>
            <View style={styles.duaHeaderLeft}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
              <Text style={styles.duaSectionTitle}>Daily Dua</Text>
            </View>
            <TouchableOpacity onPress={rotateDua}>
              <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.duaCard}>
            <Text style={styles.duaOccasion}>{DAILY_DUAS[selectedDuaIndex].occasion}</Text>
            <Text style={styles.duaArabic}>{DAILY_DUAS[selectedDuaIndex].arabic}</Text>
            {showDua && (
              <>
                <Text style={styles.duaTransliteration}>
                  {DAILY_DUAS[selectedDuaIndex].transliteration}
                </Text>
                <Text style={styles.duaTranslation}>
                  {DAILY_DUAS[selectedDuaIndex].translation}
                </Text>
              </>
            )}
            <Text style={styles.duaHint}>
              {showDua ? "Tap to collapse" : "Tap to expand"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/quran")}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="book-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Read Quran</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/prayer")}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="compass-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>Qibla</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/calendar")}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Calendar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/content")}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="library-outline" size={24} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>Library</Text>
          </TouchableOpacity>
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
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

  // Countdown Banner
  countdownBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  countdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  countdownTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  countdownItem: {
    alignItems: "center",
    minWidth: 60,
  },
  countdownNumber: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  countdownLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  countdownSeparator: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
    marginHorizontal: spacing.xs,
  },
  ramadanDayBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "center",
  },
  ramadanDayText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },

  // Today's Section
  todaySection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  prayerCard: {
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  fastingCard: {
    borderTopWidth: 4,
    borderTopColor: colors.secondary,
  },
  activeCard: {
    borderTopColor: colors.success,
    backgroundColor: colors.success + "10",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  progressNumber: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  cardStats: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  cardHint: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  prayerDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  prayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  prayerDotCompleted: {
    backgroundColor: colors.success,
  },

  // Next Prayer Card
  nextPrayerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  nextPrayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nextPrayerInfo: {},
  nextPrayerLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  nextPrayerName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  nextPrayerRight: {
    alignItems: "flex-end",
  },
  nextPrayerTime: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  nextPrayerCountdown: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Fasting Tracker
  trackerSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  trackerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  trackerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },
  trackerStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trackerStatText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  trackerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  trackerDay: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2 - spacing.xs * 6) / 7,
    aspectRatio: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trackerDayToday: {
    backgroundColor: colors.primary,
  },
  trackerDayFuture: {
    opacity: 0.4,
  },
  trackerDayNumber: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  trackerDayNumberToday: {
    color: colors.textOnPrimary,
  },
  trackerDayNumberFuture: {
    color: colors.textMuted,
  },
  trackerDayIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },

  // Streaks Section
  streaksSection: {
    marginBottom: spacing.xl,
  },
  streaksGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  streakCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  streakNumber: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  streakLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Dua Section
  duaSection: {
    marginBottom: spacing.xl,
  },
  duaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  duaHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  duaSectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  duaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  duaOccasion: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  duaArabic: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  duaTransliteration: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  duaTranslation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  duaHint: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    textAlign: "center",
  },
});