import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useNotificationManager } from "../../hooks/useNotificationManager";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

export default function PrayerScreen() {
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

  useEffect(() => {
    // Schedule notifications when prayer times are loaded
    if (!loading && prayerTimes.length > 0 && notificationSettings?.prayerReminders) {
      scheduleDailyPrayerNotifications();
    }
  }, [loading, prayerTimes, notificationSettings?.prayerReminders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Prayer Times</Text>
          <Text style={styles.location}>
            Location: {location ? `${location.city || "Custom"}` : "Loading..."}
          </Text>
        </View>

        {nextPrayer && (
          <View style={styles.nextPrayerCard}>
            <Ionicons name="time" size={32} color="#ffffff" />
            <View style={styles.nextPrayerInfo}>
              <Text style={styles.nextPrayerTitle}>Next Prayer</Text>
              <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
              <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
              <Text style={styles.nextPrayerCountdown}>
                {formatTimeUntil(nextPrayer.minutesUntil)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
          <Text style={styles.hijriText}>Ramadan 1445 AH</Text>
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
            >
              <View style={[
                styles.prayerIcon,
                prayer.isUpcoming && styles.upcomingIcon
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
                <Text style={styles.prayerName}>{prayer.name}</Text>
                <Text style={styles.prayerTime}>{prayer.time}</Text>
                {prayer.isUpcoming && (
                  <Text style={styles.nextPrayerLabel}>Next</Text>
                )}
              </View>
              <View style={styles.prayerStatus}>
                {prayer.completed === true && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
                {prayer.completed === false && !prayer.isUpcoming && (
                  <Ionicons name="radio-button-off" size={24} color={colors.textMuted} />
                )}
                {prayer.isUpcoming && (
                  <Ionicons name="time" size={24} color={colors.secondary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={refreshPrayerTimes}>
          <Ionicons name="refresh" size={20} color={colors.textOnPrimary} />
          <Text style={styles.refreshButtonText}>Refresh Times</Text>
        </TouchableOpacity>
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
  },
  loadingText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
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
  location: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  nextPrayerCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.lg,
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
    marginBottom: spacing.xs,
  },
  nextPrayerName: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  nextPrayerTime: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  nextPrayerCountdown: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  dateCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  dateText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  hijriText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  prayersList: {
    marginBottom: spacing.xl,
  },
  prayerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.md,
  },
  completedCard: {
    backgroundColor: colors.success + "15",
  },
  disabledCard: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  upcomingCard: {
    backgroundColor: colors.warning + "10",
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  prayerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  upcomingIcon: {
    backgroundColor: colors.secondary + "20",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  prayerTime: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  nextPrayerLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
  },
  prayerStatus: {
    justifyContent: "center",
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
  },
  refreshButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    marginLeft: spacing.sm,
  },
});