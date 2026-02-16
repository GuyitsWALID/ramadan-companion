import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Platform } from "react-native";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useConvexAuth } from "convex/react";
import { Audio } from "expo-av";
import { api } from "../../convex/_generated/api";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";
import { ADHAN_OPTIONS, getAdhanByValue, AdhanValue } from "../../constants/adhan";
import { loadSelectedAdhan, saveSelectedAdhan } from "../../utils/adhanPreferences";
import QiblaCompass from "../../components/QiblaCompass";

type TabType = "prayers" | "qibla" | "stats";

export default function PrayerScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("prayers");
  const [showAdhanModal, setShowAdhanModal] = useState(false);
  const [selectedAdhan, setSelectedAdhan] = useState<AdhanValue>("makkah");
  const [playingAdhan, setPlayingAdhan] = useState<AdhanValue | null>(null);
  const [previewLoading, setPreviewLoading] = useState<AdhanValue | null>(null);
  const { user } = useAuth();
  const { colors, shadows } = useTheme();
  const {
    prayerTimes,
    nextPrayer,
    location,
    loading,
    togglePrayerCompletion,
    refreshPrayerTimes,
    formatTimeUntil,
  } = usePrayerTimes();

  // Convex data for stats
  const { isAuthenticated } = useConvexAuth();
  const streaks = useQuery(api.tracking.getStreaks, isAuthenticated ? {} : "skip");
  const monthlyStats = useQuery(api.tracking.getWeeklyPrayerStats, isAuthenticated ? {} : "skip");

  const styles = getStyles(colors, shadows);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadPreference = async () => {
      const saved = await loadSelectedAdhan();
      setSelectedAdhan(saved);
    };
    loadPreference();
  }, []);

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
    return () => {
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopPreview = async () => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.stopAsync();
        await previewSoundRef.current.unloadAsync();
        previewSoundRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping preview:", error);
    } finally {
      setPlayingAdhan(null);
    }
  };

  const handleSelectAdhan = async (value: AdhanValue) => {
    setSelectedAdhan(value);
    await saveSelectedAdhan(value);
    setShowAdhanModal(false);
  };

  const handlePreviewAdhan = async (value: AdhanValue) => {
    if (value === "silent") {
      await stopPreview();
      return;
    }

    const option = getAdhanByValue(value);
    if (!option.previewSource) return;

    try {
      if (playingAdhan === value) {
        await stopPreview();
        return;
      }

      setPreviewLoading(value);
      await stopPreview();

      const { sound } = await Audio.Sound.createAsync(
        option.previewSource,
        { shouldPlay: true, volume: 1.0 }
      );
      previewSoundRef.current = sound;
      setPlayingAdhan(value);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingAdhan(null);
          sound.unloadAsync().catch(() => {});
          if (previewSoundRef.current === sound) {
            previewSoundRef.current = null;
          }
        }
      });
    } catch (error) {
      console.error("Error previewing adhan:", error);
      setPlayingAdhan(null);
    } finally {
      setPreviewLoading(null);
    }
  };

  // Calculate today's stats
  const completedPrayers = prayerTimes.filter(p => p.completed === true && p.name !== "Sunrise").length;
  const totalPrayers = prayerTimes.filter(p => p.name !== "Sunrise").length;
  const completionRate = totalPrayers > 0 ? Math.round((completedPrayers / totalPrayers) * 100) : 0;

  // Calculate monthly average
  const monthlyAverage = monthlyStats && monthlyStats.length > 0
    ? Math.round(monthlyStats.reduce((sum, day) => sum + day.percentage, 0) / monthlyStats.length)
    : 0;

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
      "Dhuhr": "partly-sunny-outline",
      "Asr": "cloudy-outline",
      "Maghrib": "moon-outline",
      "Isha": "moon",
    };
    return iconMap[prayerName] || "time-outline";
  };

  const getHijriDate = () => {
    try {
      const today = new Date();
      const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return formatter.format(today);
    } catch {
      return "1447 AH";
    }
  };

  const renderPrayersTab = () => (
    <>
      {/* Next Prayer Banner */}
      {nextPrayer && (
        <View style={styles.nextPrayerBanner}>
          <View style={styles.nextPrayerLeft}>
            <View style={styles.nextPrayerIconCircle}>
              <Ionicons name={getPrayerIcon(nextPrayer.name)} size={28} color={colors.textOnPrimary} />
            </View>
            <View>
              <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
              <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
              <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
            </View>
          </View>
          <View style={styles.nextPrayerRight}>
            <Text style={styles.countdownText}>{formatTimeUntil(nextPrayer.minutesUntil)}</Text>
            <Text style={styles.countdownLabel}>remaining</Text>
          </View>
        </View>
      )}

      {/* Date Card */}
      <View style={styles.dateCard}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.gregorianDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.hijriDate}>{getHijriDate()}</Text>
      </View>

      {/* Today's Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressPercentage}>{completionRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
        </View>
        <Text style={styles.progressStats}>{completedPrayers} of {totalPrayers} prayers completed</Text>
      </View>

      {/* Prayer List */}
      <View style={styles.prayersList}>
        {prayerTimes.map((prayer, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.prayerCard,
              prayer.completed === true && styles.prayerCardCompleted,
              prayer.isUpcoming && styles.prayerCardUpcoming,
              prayer.completed === null && styles.prayerCardDisabled,
            ]}
            onPress={() => togglePrayerCompletion(prayer.name)}
            disabled={prayer.completed === null}
            activeOpacity={0.7}
          >
            <View style={styles.prayerLeft}>
              <View style={[
                styles.prayerIconCircle,
                prayer.completed === true && styles.iconCompleted,
                prayer.isUpcoming && styles.iconUpcoming,
              ]}>
                <Ionicons 
                  name={getPrayerIcon(prayer.name)} 
                  size={22} 
                  color={
                    prayer.completed === true 
                      ? colors.success 
                      : prayer.isUpcoming
                      ? colors.secondary
                      : colors.primary
                  } 
                />
              </View>
              <View style={styles.prayerInfo}>
                <Text style={[
                  styles.prayerName,
                  prayer.completed === true && styles.prayerNameCompleted,
                ]}>
                  {prayer.name}
                </Text>
                <Text style={styles.prayerTime}>{prayer.time}</Text>
              </View>
            </View>
            <View style={styles.prayerRight}>
              {prayer.isUpcoming && (
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingText}>Next</Text>
                </View>
              )}
              {prayer.completed === true && (
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              )}
              {prayer.completed === false && !prayer.isUpcoming && (
                <View style={styles.checkCircle}>
                  <Ionicons name="ellipse-outline" size={28} color={colors.border} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Adhan Selector */}
      <TouchableOpacity 
        style={styles.adhanSelector}
        onPress={() => setShowAdhanModal(true)}
      >
        <View style={styles.adhanLeft}>
          <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
          <View>
            <Text style={styles.adhanLabel}>Adhan Sound</Text>
            <Text style={styles.adhanValue}>
              {getAdhanByValue(selectedAdhan)?.label || "Makkah"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={refreshPrayerTimes}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setActiveTab("qibla")}
        >
          <Ionicons name="compass-outline" size={20} color={colors.secondary} />
          <Text style={styles.actionText}>Qibla</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderQiblaTab = () => (
    <View style={styles.qiblaContainer}>
      <Text style={styles.tabTitle}>Qibla Direction</Text>
      <Text style={styles.tabSubtitle}>Face towards the Kaaba in Mecca</Text>
      
      {location ? (
        <QiblaCompass 
          userLocation={{ latitude: location.latitude, longitude: location.longitude }}
          colors={colors}
          shadows={shadows}
        />
      ) : (
        <View style={styles.noLocationCard}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text style={styles.noLocationText}>Location not available</Text>
          <Text style={styles.noLocationHint}>Please enable location services to use Qibla compass</Text>
        </View>
      )}
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.tabTitle}>Prayer Statistics</Text>
      <Text style={styles.tabSubtitle}>Track your prayer journey</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="checkmark-done" size={26} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{completedPrayers}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.warning + "20" }]}>
            <Ionicons name="flame" size={26} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{streaks?.prayerStreak ?? 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="trending-up" size={26} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Today's Rate</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.secondary + "20" }]}>
            <Ionicons name="calendar" size={26} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{monthlyAverage}%</Text>
          <Text style={styles.statLabel}>Monthly Avg</Text>
        </View>
      </View>

      {/* Prayer Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Today's Breakdown</Text>
        {prayerTimes.filter(p => p.name !== "Sunrise").map((prayer, index) => (
          <View key={index} style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Ionicons 
                name={getPrayerIcon(prayer.name)} 
                size={18} 
                color={prayer.completed ? colors.success : colors.textMuted} 
              />
              <Text style={styles.breakdownName}>{prayer.name}</Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownTime}>{prayer.time}</Text>
              <View style={[
                styles.breakdownStatus,
                prayer.completed === true && styles.breakdownStatusComplete,
                prayer.completed === null && styles.breakdownStatusNA,
              ]}>
                <Text style={[
                  styles.breakdownStatusText,
                  prayer.completed === true && styles.breakdownStatusTextComplete,
                ]}>
                  {prayer.completed === true ? "✓ Prayed" : prayer.completed === false ? "Pending" : "—"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Calendar Grid */}
      {monthlyStats && monthlyStats.length > 0 && (
        <View style={styles.monthlyCard}>
          <Text style={styles.monthlyTitle}>This Month</Text>
          <View style={styles.monthlyGrid}>
            {monthlyStats.slice(-30).map((day, index) => {
              const isToday = day.date === new Date().toISOString().split("T")[0];
              const percentage = day.percentage;
              return (
                <View 
                  key={index} 
                  style={[
                    styles.monthlyDay,
                    isToday && styles.monthlyDayToday,
                  ]}
                >
                  <View style={[
                    styles.monthlyDayIndicator,
                    percentage >= 80 && styles.monthlyDayGreen,
                    percentage >= 40 && percentage < 80 && styles.monthlyDayYellow,
                    percentage < 40 && percentage > 0 && styles.monthlyDayRed,
                  ]} />
                </View>
              );
            })}
          </View>
          <View style={styles.monthlyLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.monthlyDayGreen]} />
              <Text style={styles.legendText}>80-100%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.monthlyDayYellow]} />
              <Text style={styles.legendText}>40-79%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.monthlyDayRed]} />
              <Text style={styles.legendText}>0-39%</Text>
            </View>
          </View>
        </View>
      )}

      {/* Motivation */}
      <View style={styles.motivationCard}>
        <Ionicons name="heart" size={22} color={colors.secondary} />
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
          <Text style={styles.headerTitle}>Prayer Times</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {location?.city || "Location not set"}
            </Text>
          </View>
        </View>
        {user?.calculationMethod && (
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>
              {user.calculationMethod.includes("Muslim") ? "MWL" : 
               user.calculationMethod.includes("ISNA") ? "ISNA" :
               user.calculationMethod.slice(0, 8)}
            </Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "prayers" && styles.tabActive]}
          onPress={() => setActiveTab("prayers")}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === "prayers" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "prayers" && styles.tabTextActive]}>
            Prayers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "qibla" && styles.tabActive]}
          onPress={() => setActiveTab("qibla")}
        >
          <Ionicons 
            name="compass-outline" 
            size={20} 
            color={activeTab === "qibla" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "qibla" && styles.tabTextActive]}>
            Qibla
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "stats" && styles.tabActive]}
          onPress={() => setActiveTab("stats")}
        >
          <Ionicons 
            name="bar-chart-outline" 
            size={20} 
            color={activeTab === "stats" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "stats" && styles.tabTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "prayers" && renderPrayersTab()}
        {activeTab === "qibla" && renderQiblaTab()}
        {activeTab === "stats" && renderStatsTab()}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* Adhan Selection Modal */}
      <Modal
        visible={showAdhanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdhanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Adhan Sound</Text>
              <TouchableOpacity onPress={() => setShowAdhanModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.adhanOptions}>
              {ADHAN_OPTIONS.map((option) => (
                <View
                  key={option.value}
                  style={[
                    styles.adhanOption,
                    selectedAdhan === option.value && styles.adhanOptionSelected,
                  ]}
                >
                  <View style={styles.adhanOptionLeft}>
                    <Ionicons 
                      name={option.value === "silent" ? "volume-mute-outline" : "volume-high-outline"} 
                      size={22} 
                      color={selectedAdhan === option.value ? colors.primary : colors.textMuted} 
                    />
                    <Text style={[
                      styles.adhanOptionText,
                      selectedAdhan === option.value && styles.adhanOptionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </View>

                  <View style={styles.adhanOptionActions}>
                    <TouchableOpacity
                      style={[
                        styles.previewButton,
                        playingAdhan === option.value && styles.previewButtonActive,
                        option.value === "silent" && styles.previewButtonDisabled,
                      ]}
                      onPress={() => handlePreviewAdhan(option.value)}
                      disabled={previewLoading !== null || option.value === "silent"}
                    >
                      <Ionicons
                        name={playingAdhan === option.value ? "stop" : "play"}
                        size={16}
                        color={
                          playingAdhan === option.value
                            ? colors.textOnPrimary
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        selectedAdhan === option.value && styles.selectButtonSelected,
                      ]}
                      onPress={() => handleSelectAdhan(option.value)}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          selectedAdhan === option.value && styles.selectButtonTextSelected,
                        ]}
                      >
                        {selectedAdhan === option.value ? "Selected" : "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.lg,
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  methodBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  methodText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary + "15",
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: typography.fonts.semiBold,
  },

  // Next Prayer Banner
  nextPrayerBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.md,
  },
  nextPrayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nextPrayerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  nextPrayerLabel: {
    fontSize: typography.sizes.xs,
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
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  nextPrayerRight: {
    alignItems: "flex-end",
  },
  countdownText: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  countdownLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },

  // Date Card
  dateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  gregorianDate: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  hijriDate: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Progress Card
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  progressPercentage: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressStats: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Prayer List
  prayersList: {
    marginBottom: spacing.lg,
  },
  prayerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.sm,
  },
  prayerCardCompleted: {
    backgroundColor: colors.success + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  prayerCardUpcoming: {
    backgroundColor: colors.secondary + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  prayerCardDisabled: {
    opacity: 0.5,
  },
  prayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  prayerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCompleted: {
    backgroundColor: colors.success + "20",
  },
  iconUpcoming: {
    backgroundColor: colors.secondary + "20",
  },
  prayerInfo: {},
  prayerName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  prayerNameCompleted: {
    color: colors.success,
  },
  prayerTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  prayerRight: {
    alignItems: "flex-end",
  },
  upcomingBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  upcomingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  checkCircle: {},

  // Adhan Selector
  adhanSelector: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.sm,
  },
  adhanLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  adhanLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  adhanValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },

  // Qibla Tab
  qiblaContainer: {
    paddingBottom: spacing.xl,
  },
  tabTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tabSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  noLocationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    alignItems: "center",
    ...shadows.sm,
  },
  noLocationText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  noLocationHint: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Stats Tab
  statsContainer: {
    paddingBottom: spacing.xl,
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
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  breakdownTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  breakdownName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  breakdownRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  breakdownTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  breakdownStatus: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: "center",
  },
  breakdownStatusComplete: {
    backgroundColor: colors.success + "20",
  },
  breakdownStatusNA: {
    backgroundColor: colors.surfaceElevated,
  },
  breakdownStatusText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  breakdownStatusTextComplete: {
    color: colors.success,
  },

  // Monthly Calendar
  monthlyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  monthlyTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  monthlyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  monthlyDay: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  monthlyDayToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  monthlyDayIndicator: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
  monthlyDayGreen: {
    backgroundColor: colors.success,
  },
  monthlyDayYellow: {
    backgroundColor: colors.warning,
  },
  monthlyDayRed: {
    backgroundColor: colors.error,
  },
  monthlyLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Motivation
  motivationCard: {
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  motivationText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: spacing.md,
    lineHeight: 22,
  },
  motivationSource: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  adhanOptions: {
    padding: spacing.lg,
  },
  adhanOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  adhanOptionSelected: {
    backgroundColor: colors.primary + "15",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adhanOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  adhanOptionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  previewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },
  previewButtonActive: {
    backgroundColor: colors.primary,
  },
  previewButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "15",
  },
  selectButtonText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
  },
  selectButtonTextSelected: {
    color: colors.primary,
  },
  adhanOptionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  adhanOptionTextSelected: {
    color: colors.primary,
    fontFamily: typography.fonts.semiBold,
  },
});
