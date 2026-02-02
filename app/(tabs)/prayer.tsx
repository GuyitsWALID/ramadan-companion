import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useNotificationManager } from "../../hooks/useNotificationManager";
import { useAuth } from "../../context/AuthContext";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";
import QiblaCompass from "../../components/QiblaCompass";

type TabType = "prayers" | "qibla" | "stats";

export default function PrayerScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("prayers");
  const { user } = useAuth();
  const {
    prayerTimes,
    nextPrayer,
    location,
    loading,
    togglePrayerCompletion,
    refreshPrayerTimes,
    formatTimeUntil,
  } = usePrayerTimes();

  const { scheduleDailyPrayerNotifications, notificationSettings } = useNotificationManager();

  // Animation for tab indicator
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tabIndex = activeTab === "prayers" ? 0 : activeTab === "qibla" ? 1 : 2;
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    // Schedule notifications when prayer times are loaded
    if (!loading && prayerTimes.length > 0 && notificationSettings?.prayerReminders) {
      scheduleDailyPrayerNotifications();
    }
  }, [loading, prayerTimes, notificationSettings?.prayerReminders]);

  // Calculate stats
  const completedPrayers = prayerTimes.filter(p => p.completed === true && p.name !== "Sunrise").length;
  const totalPrayers = prayerTimes.filter(p => p.name !== "Sunrise").length;
  const completionRate = totalPrayers > 0 ? Math.round((completedPrayers / totalPrayers) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="time-outline" size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getPrayerIcon = (prayerName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      "Fajr": "sunny-outline",
      "Sunrise": "sunny",
      "Dhuhr": "time-outline",
      "Asr": "partly-sunny-outline",
      "Maghrib": "sunset-outline",
      "Isha": "moon-outline",
    };
    return iconMap[prayerName] || "time-outline";
  };

  // Get Hijri date (simplified - in production use a proper library)
  const getHijriDate = () => {
    // This is a simplified approximation - use hijri-date library for accuracy
    const today = new Date();
    const hijriMonths = [
      "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
      "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban",
      "Ramadan", "Shawwal", "Dhul Qadah", "Dhul Hijjah"
    ];
    // Approximate calculation (not accurate - use proper library in production)
    const islamicEpoch = new Date(622, 6, 16);
    const daysSinceEpoch = Math.floor((today.getTime() - islamicEpoch.getTime()) / (1000 * 60 * 60 * 24));
    const lunarYear = Math.floor(daysSinceEpoch / 354.36667);
    const dayOfYear = daysSinceEpoch % 354;
    const month = Math.floor(dayOfYear / 29.5);
    const day = Math.floor(dayOfYear % 29.5) + 1;
    
    return `${day} ${hijriMonths[month % 12]} ${1445 + Math.floor((lunarYear - 1403) / 1)}`; // Simplified
  };

  const renderPrayersTab = () => (
    <>
      {nextPrayer && (
        <View style={styles.nextPrayerCard}>
          <View style={styles.nextPrayerIconContainer}>
            <Ionicons name={getPrayerIcon(nextPrayer.name)} size={32} color={colors.textOnPrimary} />
          </View>
          <View style={styles.nextPrayerInfo}>
            <Text style={styles.nextPrayerTitle}>Next Prayer</Text>
            <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
            <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
            <Text style={styles.nextPrayerCountdown}>
              {formatTimeUntil(nextPrayer.minutesUntil)}
            </Text>
          </View>
          <View style={styles.progressRing}>
            <Text style={styles.progressText}>{completedPrayers}/{totalPrayers}</Text>
            <Text style={styles.progressLabel}>Prayed</Text>
          </View>
        </View>
      )}

      <View style={styles.dateCard}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={20} color={colors.textOnPrimary} />
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
        <Text style={styles.hijriText}>{getHijriDate()}</Text>
      </View>

      <View style={styles.prayersList}>
        {prayerTimes.map((prayer, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.prayerCard,
              prayer.completed === true && styles.completedCard,
              prayer.completed === null && styles.disabledCard,
              prayer.isUpcoming && styles.upcomingCard,
            ]}
            onPress={() => togglePrayerCompletion(prayer.name)}
            disabled={prayer.completed === null}
            activeOpacity={0.7}
          >
            <View style={[
              styles.prayerIcon,
              prayer.isUpcoming && styles.upcomingIcon,
              prayer.completed === true && styles.completedIcon,
            ]}>
              <Ionicons 
                name={getPrayerIcon(prayer.name)} 
                size={24} 
                color={
                  prayer.completed === true 
                    ? colors.success 
                    : prayer.completed === null 
                    ? colors.textMuted 
                    : prayer.isUpcoming
                    ? colors.secondary
                    : colors.primary
                } 
              />
            </View>
            <View style={styles.prayerInfo}>
              <Text style={[
                styles.prayerName,
                prayer.completed === true && styles.completedText,
              ]}>{prayer.name}</Text>
              <Text style={styles.prayerTime}>{prayer.time}</Text>
              {prayer.isUpcoming && (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextPrayerLabel}>Up Next</Text>
                </View>
              )}
            </View>
            <View style={styles.prayerStatus}>
              {prayer.completed === true && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                </View>
              )}
              {prayer.completed === false && !prayer.isUpcoming && (
                <Ionicons name="radio-button-off" size={24} color={colors.textMuted} />
              )}
              {prayer.isUpcoming && (
                <View style={styles.upcomingBadge}>
                  <Ionicons name="time" size={24} color={colors.secondary} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={refreshPrayerTimes}>
        <Ionicons name="refresh" size={20} color={colors.textOnPrimary} />
        <Text style={styles.refreshButtonText}>Refresh Times</Text>
      </TouchableOpacity>
    </>
  );

  const renderQiblaTab = () => (
    <View style={styles.qiblaContainer}>
      <Text style={styles.qiblaSectionTitle}>Qibla Direction</Text>
      <Text style={styles.qiblaSubtitle}>Face towards the Kaaba in Mecca</Text>
      <QiblaCompass 
        userLocation={location ? { latitude: location.latitude, longitude: location.longitude } : undefined} 
      />
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsSectionTitle}>Prayer Statistics</Text>
      <Text style={styles.statsSubtitle}>Track your daily prayer progress</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="checkmark-done" size={28} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{completedPrayers}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="time" size={28} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{totalPrayers - completedPrayers}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.secondary + "20" }]}>
            <Ionicons name="trending-up" size={28} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.info + "20" }]}>
            <Ionicons name="flame" size={28} color={colors.info} />
          </View>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Weekly Progress */}
      <View style={styles.weeklyCard}>
        <Text style={styles.weeklyTitle}>This Week</Text>
        <View style={styles.weeklyBars}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
            const isToday = new Date().getDay() === (index + 1) % 7;
            const progress = isToday ? completionRate : Math.floor(Math.random() * 40) + 60;
            return (
              <View key={day} style={styles.weeklyBarContainer}>
                <View style={styles.weeklyBarBackground}>
                  <View 
                    style={[
                      styles.weeklyBarFill, 
                      { height: `${progress}%` },
                      isToday && styles.weeklyBarToday,
                    ]} 
                  />
                </View>
                <Text style={[styles.weeklyDay, isToday && styles.weeklyDayToday]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Motivation Card */}
      <View style={styles.motivationCard}>
        <Ionicons name="sparkles" size={24} color={colors.secondary} />
        <Text style={styles.motivationText}>
          "Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater."
        </Text>
        <Text style={styles.motivationSource}>— Quran 29:45</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Prayer Times</Text>
          <Text style={styles.location}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            {" "}{location?.city || "Enable location"}
          </Text>
        </View>
        {user?.calculationMethod && (
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>{user.calculationMethod.slice(0, 12)}</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "prayers" && styles.activeTab]}
          onPress={() => setActiveTab("prayers")}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === "prayers" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "prayers" && styles.activeTabText]}>
            Prayers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "qibla" && styles.activeTab]}
          onPress={() => setActiveTab("qibla")}
        >
          <Ionicons 
            name="compass-outline" 
            size={20} 
            color={activeTab === "qibla" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "qibla" && styles.activeTabText]}>
            Qibla
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "stats" && styles.activeTab]}
          onPress={() => setActiveTab("stats")}
        >
          <Ionicons 
            name="stats-chart-outline" 
            size={20} 
            color={activeTab === "stats" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "stats" && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "prayers" && renderPrayersTab()}
        {activeTab === "qibla" && renderQiblaTab()}
        {activeTab === "stats" && renderStatsTab()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  location: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  methodBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  methodText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary + "15",
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: typography.fonts.semiBold,
  },
  nextPrayerCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.lg,
  },
  nextPrayerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  nextPrayerInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  nextPrayerTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: spacing.xxs,
  },
  nextPrayerName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xxs,
  },
  nextPrayerTime: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xxs,
  },
  nextPrayerCountdown: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
  progressRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  progressLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  dateCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  dateText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  hijriText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  prayersList: {
    marginBottom: spacing.lg,
  },
  prayerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  completedCard: {
    backgroundColor: colors.success + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  disabledCard: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  upcomingCard: {
    backgroundColor: colors.secondary + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  prayerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  upcomingIcon: {
    backgroundColor: colors.secondary + "20",
  },
  completedIcon: {
    backgroundColor: colors.success + "20",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  completedText: {
    color: colors.success,
  },
  prayerTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  nextBadge: {
    marginTop: spacing.xs,
  },
  nextPrayerLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
  },
  prayerStatus: {
    justifyContent: "center",
    alignItems: "center",
  },
  completedBadge: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  refreshButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    marginLeft: spacing.sm,
  },
  // Qibla Tab Styles
  qiblaContainer: {
    paddingBottom: spacing.xl,
  },
  qiblaSectionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  qiblaSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  // Stats Tab Styles
  statsContainer: {
    paddingBottom: spacing.xl,
  },
  statsSectionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statsSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  weeklyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  weeklyTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  weeklyBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  weeklyBarContainer: {
    alignItems: "center",
    flex: 1,
  },
  weeklyBarBackground: {
    width: 24,
    height: 80,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  weeklyBarFill: {
    width: "100%",
    backgroundColor: colors.primary + "60",
    borderRadius: borderRadius.sm,
  },
  weeklyBarToday: {
    backgroundColor: colors.primary,
  },
  weeklyDay: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  weeklyDayToday: {
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  motivationCard: {
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  motivationText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    textAlign: "center",
    lineHeight: typography.sizes.md * 1.6,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  motivationSource: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
});