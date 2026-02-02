import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography, spacing, borderRadius } from "../constants/theme";

interface DayActivity {
  date: string;
  prayers: number; // 0-5 (Fajr, Dhuhr, Asr, Maghrib, Isha)
  quranRead: boolean;
  fasted: boolean;
}

interface ActivityHeatMapProps {
  data: DayActivity[];
  weeks?: number;
  colors: any;
  shadows: any;
  title?: string;
  onDayPress?: (day: DayActivity) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ActivityHeatMap({
  data,
  weeks = 7,
  colors,
  shadows,
  title = "Activity",
  onDayPress,
}: ActivityHeatMapProps) {
  // Generate grid of days for the last N weeks
  const generateDaysGrid = () => {
    const today = new Date();
    const days: (DayActivity | null)[][] = [];
    const totalDays = weeks * 7;
    
    // Start from the beginning of the first week
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    
    // Adjust to start of week (Sunday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    for (let week = 0; week < weeks; week++) {
      const weekDays: (DayActivity | null)[] = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + week * 7 + day);
        
        const dateStr = currentDate.toISOString().split("T")[0];
        const activity = data.find(d => d.date === dateStr);
        
        if (currentDate > today) {
          weekDays.push(null); // Future dates
        } else {
          weekDays.push(activity || {
            date: dateStr,
            prayers: 0,
            quranRead: false,
            fasted: false,
          });
        }
      }
      days.push(weekDays);
    }
    
    return days;
  };

  // Calculate activity level (0-4)
  const getActivityLevel = (day: DayActivity | null): number => {
    if (!day) return -1; // Future
    
    let score = 0;
    score += Math.min(day.prayers, 5) * 0.4; // Max 2 points for prayers
    score += day.quranRead ? 1 : 0;
    score += day.fasted ? 1 : 0;
    
    if (score === 0) return 0;
    if (score <= 1) return 1;
    if (score <= 2) return 2;
    if (score <= 3) return 3;
    return 4;
  };

  // Get color based on activity level
  const getActivityColor = (level: number): string => {
    switch (level) {
      case -1: return colors.surfaceElevated; // Future
      case 0: return colors.border; // No activity
      case 1: return colors.success + "40"; // Light
      case 2: return colors.success + "70"; // Medium
      case 3: return colors.success + "A0"; // Good
      case 4: return colors.success; // Full
      default: return colors.border;
    }
  };

  const grid = generateDaysGrid();

  // Calculate totals
  const totals = data.reduce((acc, day) => ({
    prayers: acc.prayers + day.prayers,
    quranDays: acc.quranDays + (day.quranRead ? 1 : 0),
    fastDays: acc.fastDays + (day.fasted ? 1 : 0),
  }), { prayers: 0, quranDays: 0, fastDays: 0 });

  const styles = getStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Last {weeks} weeks</Text>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdayLabels}>
        {WEEKDAYS.map((day, i) => (
          <Text key={i} style={styles.weekdayLabel}>{day}</Text>
        ))}
      </View>

      {/* Heat map grid */}
      <View style={styles.grid}>
        {grid.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekColumn}>
            {week.map((day, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayCell,
                  { backgroundColor: getActivityColor(getActivityLevel(day)) }
                ]}
                onPress={() => day && onDayPress?.(day)}
                disabled={!day}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[styles.legendCell, { backgroundColor: getActivityColor(level) }]}
          />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>

      {/* Stats summary */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="moon" size={16} color={colors.primary} />
          <Text style={styles.statValue}>{totals.prayers}</Text>
          <Text style={styles.statLabel}>Prayers</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="book" size={16} color={colors.secondary} />
          <Text style={styles.statValue}>{totals.quranDays}</Text>
          <Text style={styles.statLabel}>Quran Days</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="restaurant" size={16} color={colors.success} />
          <Text style={styles.statValue}>{totals.fastDays}</Text>
          <Text style={styles.statLabel}>Fast Days</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  weekdayLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    fontSize: typography.sizes.xxs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
    width: 20,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekColumn: {
    gap: 3,
  },
  dayCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  legendLabel: {
    fontSize: typography.sizes.xxs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginHorizontal: spacing.xxs,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xxs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
});
