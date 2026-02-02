import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useUser } from "../../context/UserContext";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

interface RamadanDay {
  dayNumber: number;
  date: string;
  hijriDate: string;
  sehriTime: string;
  iftarTime: string;
  city: string;
  country: string;
}

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

const SEHRI_DUA: DailyDua = {
  arabic: "وَبِصَوْمِ غَدٍ نَوَيْتُ مِنْ شَهْرِ رَمَضَانَ",
  transliteration: "Wa bisawmi ghadin nawaytu min shahri ramadan",
  translation: "I intend to keep the fast for tomorrow in the month of Ramadan",
  occasion: "Sehri (Before Dawn)",
};

const IFTAR_DUA: DailyDua = {
  arabic: "اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
  transliteration: "Allahumma inni laka sumtu wa bika aamantu wa alayka tawakkaltu wa ala rizqika aftartu",
  translation: "O Allah! I fasted for You, believed in You, trusted in You, and I break my fast with Your sustenance",
  occasion: "Iftar (Breaking Fast)",
};

const DAILY_DUAS: DailyDua[] = [
  {
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ",
    transliteration: "Rabbi-ghfir lee wa li-waalidayya",
    translation: "O Lord, forgive me and my parents",
    occasion: "For Parents",
  },
  {
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    transliteration: "Allahumma innaka 'afuwwun tuhibbul 'afwa fa'fu 'anni",
    translation: "O Allah, You are Forgiving and love forgiveness, so forgive me",
    occasion: "Laylat al-Qadr",
  },
  {
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana aatina fid-dunya hasanatan wa fil-aakhirati hasanatan wa qina 'adhaaban-naar",
    translation: "Our Lord, give us good in this world and good in the Hereafter, and protect us from the Fire",
    occasion: "General Supplication",
  },
];

// Ramadan 2026 starts approximately Feb 17, 2026 (1447 AH)
const RAMADAN_START_2026 = new Date(2026, 1, 17);
const RAMADAN_END_2026 = new Date(2026, 2, 18); // March 18, 2026
const EID_DATE_2026 = new Date(2026, 2, 19); // March 19, 2026
const RAMADAN_YEAR_HIJRI = "1447 AH";

const STORAGE_KEY_FASTING = "@ramadan_fasting_record";

type TabType = "today" | "calendar" | "tracker";

export default function CalendarScreen() {
  const { prayerTimes, location, loading: prayerLoading } = usePrayerTimes();
  const { user } = useUser();
  
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [currentDay, setCurrentDay] = useState(1);
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<RamadanDay | null>(null);
  const [fastingRecord, setFastingRecord] = useState<FastingRecord>({});
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownType, setCountdownType] = useState<"ramadan" | "eid" | "active">("active");
  const [showDua, setShowDua] = useState<"sehri" | "iftar" | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Pulse animation for live countdown
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

  // Load fasting record
  useEffect(() => {
    loadFastingRecord();
  }, []);

  const loadFastingRecord = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_FASTING);
      if (saved) {
        setFastingRecord(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading fasting record:", error);
    }
  };

  const saveFastingRecord = async (record: FastingRecord) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FASTING, JSON.stringify(record));
      setFastingRecord(record);
    } catch (error) {
      console.error("Error saving fasting record:", error);
    }
  };

  const updateFastingStatus = useCallback((day: number, status: FastingStatus) => {
    const newRecord = { ...fastingRecord, [day]: status };
    saveFastingRecord(newRecord);
  }, [fastingRecord]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let targetDate: Date;
      let type: "ramadan" | "eid" | "active";
      
      if (now < RAMADAN_START_2026) {
        targetDate = RAMADAN_START_2026;
        type = "ramadan";
      } else if (now >= RAMADAN_START_2026 && now <= RAMADAN_END_2026) {
        targetDate = EID_DATE_2026;
        type = "active";
      } else {
        targetDate = EID_DATE_2026;
        type = "eid";
      }
      
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
      setCountdownType(type);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate actual Ramadan day based on current date
  useEffect(() => {
    const today = new Date();
    const diffTime = today.getTime() - RAMADAN_START_2026.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays >= 1 && diffDays <= 30) {
      setCurrentDay(diffDays);
    } else if (diffDays < 1) {
      setCurrentDay(1); // Before Ramadan
    } else {
      setCurrentDay(30); // After Ramadan
    }
  }, []);

  // Generate Ramadan calendar with real Fajr/Maghrib times
  useEffect(() => {
    const fajrTime = prayerTimes.find(p => p.name === "Fajr")?.time || "05:00";
    const maghribTime = prayerTimes.find(p => p.name === "Maghrib")?.time || "18:00";
    const cityName = user?.location?.city || location?.city || "Your Location";
    const countryName = user?.location?.country || location?.country || "";
    
    // Generate 30 days of Ramadan
    const days: RamadanDay[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(RAMADAN_START_2026);
      date.setDate(date.getDate() + i);
      
      // Adjust times slightly for each day (sunrise gets earlier, sunset later)
      const adjustMinutes = Math.floor(i * 0.5);
      const sehriHour = parseInt(fajrTime.split(":")[0]);
      const sehriMin = parseInt(fajrTime.split(":")[1]) - 10 - adjustMinutes;
      const iftarHour = parseInt(maghribTime.split(":")[0]);
      const iftarMin = parseInt(maghribTime.split(":")[1]) + adjustMinutes;
      
      return {
        dayNumber: i + 1,
        date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        hijriDate: `${i + 1} Ramadan ${RAMADAN_YEAR_HIJRI}`,
        sehriTime: `${String(sehriHour).padStart(2, '0')}:${String(Math.max(0, sehriMin)).padStart(2, '0')}`,
        iftarTime: `${String(iftarHour).padStart(2, '0')}:${String(Math.min(59, iftarMin)).padStart(2, '0')}`,
        city: cityName,
        country: countryName,
      };
    });
    
    setRamadanDays(days);
    setSelectedDay(days[currentDay - 1] || days[0]);
  }, [currentDay, prayerTimes, location, user]);

  const specialEvents: Record<number, string> = {
    1: "First day of Ramadan",
    10: "First 10 days (Mercy) complete",
    20: "Second 10 days (Forgiveness) complete",
    21: "Last 10 days begin - Laylat al-Qadr",
    23: "Possible Laylat al-Qadr",
    25: "Possible Laylat al-Qadr",
    27: "Most likely Laylat al-Qadr",
    29: "Possible Laylat al-Qadr",
    30: "Last day of Ramadan - Eid tomorrow!",
  };

  const getDaysLeft = () => {
    return 30 - currentDay;
  };

  const isRamadanActive = useMemo(() => {
    const today = new Date();
    const endDate = new Date(RAMADAN_START_2026);
    endDate.setDate(endDate.getDate() + 30);
    return today >= RAMADAN_START_2026 && today <= endDate;
  }, []);

  // Fasting statistics
  const fastingStats = useMemo(() => {
    const fasted = Object.values(fastingRecord).filter(s => s === "fasted").length;
    const missed = Object.values(fastingRecord).filter(s => s === "missed").length;
    const excused = Object.values(fastingRecord).filter(s => s === "excused").length;
    const total = Math.min(currentDay, 30);
    return { fasted, missed, excused, total };
  }, [fastingRecord, currentDay]);

  const getFastingStatusIcon = (status: FastingStatus) => {
    switch (status) {
      case "fasted": return { icon: "checkmark-circle", color: colors.success };
      case "missed": return { icon: "close-circle", color: colors.error };
      case "excused": return { icon: "pause-circle", color: colors.warning };
      default: return { icon: "ellipse-outline", color: colors.textMuted };
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "today", label: "Today", icon: "today-outline" },
    { key: "calendar", label: "Calendar", icon: "calendar-outline" },
    { key: "tracker", label: "Tracker", icon: "checkbox-outline" },
  ];

  if (prayerLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ramadan Calendar</Text>
          <Text style={styles.subtitle}>{RAMADAN_YEAR_HIJRI} / 2026 CE</Text>
          {selectedDay && (
            <Text style={styles.locationText}>
              📍 {selectedDay.city}{selectedDay.country ? `, ${selectedDay.country}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.currentDayCard}>
          <View style={styles.currentDayHeader}>
            <View style={styles.dayNumberContainer}>
              <Text style={styles.dayNumber}>{currentDay}</Text>
            </View>
            <View style={styles.currentDayInfo}>
              <Text style={styles.currentDayTitle}>Day {currentDay} of Ramadan</Text>
              <Text style={styles.currentDate}>{selectedDay?.date}</Text>
              <Text style={styles.daysLeft}>{getDaysLeft()} days remaining</Text>
            </View>
          </View>
          
          <View style={styles.timingsRow}>
            <View style={styles.timingCard}>
              <Ionicons name="moon-outline" size={24} color={colors.textOnPrimary} />
              <Text style={styles.timingTitle}>Sehri</Text>
              <Text style={styles.timingTime}>{selectedDay?.sehriTime}</Text>
            </View>
            <View style={styles.timingCard}>
              <Ionicons name="sunset-outline" size={24} color={colors.textOnPrimary} />
              <Text style={styles.timingTitle}>Iftar</Text>
              <Text style={styles.timingTime}>{selectedDay?.iftarTime}</Text>
            </View>
          </View>

          {specialEvents[currentDay as keyof typeof specialEvents] && (
            <View style={styles.eventCard}>
              <Ionicons name="star" size={20} color={colors.secondary} />
              <Text style={styles.eventText}>
                {specialEvents[currentDay as keyof typeof specialEvents]}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentDay(Math.max(1, currentDay - 1))}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentDay(Math.min(30, currentDay + 1))}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          <Text style={styles.gridTitle}>Ramadan Overview</Text>
          <View style={styles.daysGrid}>
            {ramadanDays.map((day) => (
              <TouchableOpacity
                key={day.dayNumber}
                style={[
                  styles.dayCell,
                  day.dayNumber === currentDay && styles.selectedDayCell,
                  specialEvents[day.dayNumber as keyof typeof specialEvents] && styles.specialDayCell,
                ]}
                onPress={() => setCurrentDay(day.dayNumber)}
              >
                <Text style={[
                  styles.dayCellText,
                  day.dayNumber === currentDay && styles.selectedDayCellText,
                ]}>
                  {day.dayNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {Object.entries(specialEvents).map(([day, event]) => {
            const dayNum = parseInt(day);
            if (dayNum > currentDay) {
              return (
                <View key={day} style={styles.eventItem}>
                  <View style={styles.eventIndicator}>
                    <Text style={styles.eventDay}>Day {dayNum}</Text>
                  </View>
                  <Text style={styles.eventName}>{event}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              );
            }
            return null;
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ramadan Reminders</Text>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.reminderText}>Complete daily prayers on time</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.reminderText}>Read Quran daily (minimum 20 verses)</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.reminderText}>Increase charity and good deeds</Text>
          </View>
          <View style={styles.reminderItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.reminderText}>Make dua during blessed nights</Text>
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
  locationText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  currentDayCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  currentDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  dayNumberContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  dayNumber: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  currentDayInfo: {
    flex: 1,
  },
  currentDayTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  currentDate: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: spacing.xxs,
  },
  daysLeft: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  timingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  timingCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginHorizontal: spacing.xxs,
  },
  timingTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  timingTime: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary + "25",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary + "50",
  },
  eventText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  navButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    marginHorizontal: spacing.xs,
  },
  calendarGrid: {
    marginBottom: spacing.xl,
  },
  gridTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: "15%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  selectedDayCell: {
    backgroundColor: colors.primary,
  },
  specialDayCell: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  dayCellText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  selectedDayCellText: {
    color: colors.textOnPrimary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventIndicator: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.md,
  },
  eventDay: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  eventName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reminderText: {
    marginLeft: spacing.md,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    flex: 1,
  },
});