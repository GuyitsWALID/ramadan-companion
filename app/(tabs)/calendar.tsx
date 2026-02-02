import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { useUser } from "../../context/UserContext";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";

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
  const { colors, shadows } = useTheme();
  
  const styles = getStyles(colors, shadows);
  
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

  const renderTodayTab = () => (
    <>
      {/* Countdown Card */}
      <Animated.View style={[styles.countdownCard, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.countdownHeader}>
          <Ionicons 
            name={countdownType === "active" ? "moon" : "calendar"} 
            size={28} 
            color={colors.textOnPrimary} 
          />
          <Text style={styles.countdownTitle}>
            {countdownType === "ramadan" 
              ? "Countdown to Ramadan" 
              : countdownType === "active"
                ? "Ramadan in Progress"
                : "Countdown to Eid"
            }
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
          <Text style={styles.countdownSeparator}>:</Text>
          <View style={styles.countdownItem}>
            <Text style={styles.countdownNumber}>{String(countdown.seconds).padStart(2, '0')}</Text>
            <Text style={styles.countdownLabel}>Secs</Text>
          </View>
        </View>
      </Animated.View>

      {/* Current Day Card */}
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
          <TouchableOpacity 
            style={styles.timingCard}
            onPress={() => setShowDua(showDua === "sehri" ? null : "sehri")}
          >
            <Ionicons name="moon-outline" size={24} color={colors.textOnPrimary} />
            <Text style={styles.timingTitle}>Sehri</Text>
            <Text style={styles.timingTime}>{selectedDay?.sehriTime}</Text>
            <Text style={styles.timingHint}>Tap for dua</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timingCard}
            onPress={() => setShowDua(showDua === "iftar" ? null : "iftar")}
          >
            <Ionicons name="sunset-outline" size={24} color={colors.textOnPrimary} />
            <Text style={styles.timingTitle}>Iftar</Text>
            <Text style={styles.timingTime}>{selectedDay?.iftarTime}</Text>
            <Text style={styles.timingHint}>Tap for dua</Text>
          </TouchableOpacity>
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

      {/* Dua Card */}
      {showDua && (
        <View style={styles.duaCard}>
          <View style={styles.duaHeader}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
            <Text style={styles.duaOccasion}>
              {showDua === "sehri" ? SEHRI_DUA.occasion : IFTAR_DUA.occasion}
            </Text>
            <TouchableOpacity onPress={() => setShowDua(null)}>
              <Ionicons name="close-circle" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.duaArabic}>
            {showDua === "sehri" ? SEHRI_DUA.arabic : IFTAR_DUA.arabic}
          </Text>
          <Text style={styles.duaTransliteration}>
            {showDua === "sehri" ? SEHRI_DUA.transliteration : IFTAR_DUA.transliteration}
          </Text>
          <Text style={styles.duaTranslation}>
            {showDua === "sehri" ? SEHRI_DUA.translation : IFTAR_DUA.translation}
          </Text>
        </View>
      )}

      {/* Daily Duas Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Duas</Text>
        {DAILY_DUAS.map((dua, index) => (
          <View key={index} style={styles.dailyDuaCard}>
            <View style={styles.dailyDuaHeader}>
              <Ionicons name="heart" size={16} color={colors.secondary} />
              <Text style={styles.dailyDuaOccasion}>{dua.occasion}</Text>
            </View>
            <Text style={styles.dailyDuaArabic}>{dua.arabic}</Text>
            <Text style={styles.dailyDuaTransliteration}>{dua.transliteration}</Text>
            <Text style={styles.dailyDuaTranslation}>{dua.translation}</Text>
          </View>
        ))}
      </View>

      {/* Reminders Section */}
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
    </>
  );

  const renderCalendarTab = () => (
    <>
      {/* Month View Header */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarMonthTitle}>Ramadan {RAMADAN_YEAR_HIJRI}</Text>
        <Text style={styles.calendarSubtitle}>
          Feb 17 - Mar 18, 2026
        </Text>
      </View>

      {/* Days Grid */}
      <View style={styles.calendarGrid}>
        <View style={styles.weekdayRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <Text key={i} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {ramadanDays.map((day) => {
            const status = fastingRecord[day.dayNumber] || "upcoming";
            const statusInfo = getFastingStatusIcon(status);
            const isToday = day.dayNumber === currentDay;
            const isSpecial = !!specialEvents[day.dayNumber];
            
            return (
              <TouchableOpacity
                key={day.dayNumber}
                style={[
                  styles.calendarDayCell,
                  isToday && styles.calendarDayCellToday,
                  isSpecial && styles.calendarDayCellSpecial,
                ]}
                onPress={() => {
                  setCurrentDay(day.dayNumber);
                  setSelectedDay(day);
                }}
              >
                <Text style={[
                  styles.calendarDayNumber,
                  isToday && styles.calendarDayNumberToday,
                ]}>
                  {day.dayNumber}
                </Text>
                {status !== "upcoming" && (
                  <Ionicons 
                    name={statusInfo.icon as any} 
                    size={12} 
                    color={statusInfo.color} 
                    style={styles.calendarDayStatus}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Day Details */}
      {selectedDay && (
        <View style={styles.selectedDayCard}>
          <View style={styles.selectedDayHeader}>
            <Text style={styles.selectedDayTitle}>Day {selectedDay.dayNumber}</Text>
            <Text style={styles.selectedDayDate}>{selectedDay.date}</Text>
          </View>
          <View style={styles.selectedDayTimings}>
            <View style={styles.selectedDayTiming}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.selectedDayTimingLabel}>Sehri</Text>
                <Text style={styles.selectedDayTimingTime}>{selectedDay.sehriTime}</Text>
              </View>
            </View>
            <View style={styles.selectedDayTiming}>
              <Ionicons name="sunset-outline" size={20} color={colors.secondary} />
              <View>
                <Text style={styles.selectedDayTimingLabel}>Iftar</Text>
                <Text style={styles.selectedDayTimingTime}>{selectedDay.iftarTime}</Text>
              </View>
            </View>
          </View>
          {specialEvents[selectedDay.dayNumber] && (
            <View style={styles.selectedDayEvent}>
              <Ionicons name="star" size={16} color={colors.secondary} />
              <Text style={styles.selectedDayEventText}>
                {specialEvents[selectedDay.dayNumber]}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Upcoming Events */}
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
    </>
  );

  const renderTrackerTab = () => (
    <>
      {/* Stats Overview */}
      <View style={styles.trackerStatsCard}>
        <Text style={styles.trackerStatsTitle}>Fasting Statistics</Text>
        <View style={styles.trackerStatsRow}>
          <View style={styles.trackerStatItem}>
            <View style={[styles.trackerStatIcon, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <Text style={styles.trackerStatNumber}>{fastingStats.fasted}</Text>
            <Text style={styles.trackerStatLabel}>Fasted</Text>
          </View>
          <View style={styles.trackerStatItem}>
            <View style={[styles.trackerStatIcon, { backgroundColor: colors.error + "20" }]}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </View>
            <Text style={styles.trackerStatNumber}>{fastingStats.missed}</Text>
            <Text style={styles.trackerStatLabel}>Missed</Text>
          </View>
          <View style={styles.trackerStatItem}>
            <View style={[styles.trackerStatIcon, { backgroundColor: colors.warning + "20" }]}>
              <Ionicons name="pause-circle" size={24} color={colors.warning} />
            </View>
            <Text style={styles.trackerStatNumber}>{fastingStats.excused}</Text>
            <Text style={styles.trackerStatLabel}>Excused</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.trackerProgressContainer}>
          <View style={styles.trackerProgressBar}>
            <View 
              style={[
                styles.trackerProgressFill, 
                { width: `${(fastingStats.fasted / 30) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.trackerProgressText}>
            {fastingStats.fasted} of 30 days completed
          </Text>
        </View>
      </View>

      {/* Day by Day Tracker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Tracker</Text>
        <Text style={styles.sectionSubtitle}>Tap to update each day's status</Text>
        
        <View style={styles.trackerGrid}>
          {ramadanDays.map((day) => {
            const status = fastingRecord[day.dayNumber] || (day.dayNumber <= currentDay ? "upcoming" : "upcoming");
            const statusInfo = getFastingStatusIcon(status);
            const isPast = day.dayNumber <= currentDay;
            
            return (
              <TouchableOpacity
                key={day.dayNumber}
                style={[
                  styles.trackerDayCard,
                  !isPast && styles.trackerDayCardFuture,
                ]}
                onPress={() => {
                  if (isPast) {
                    // Cycle through statuses
                    const statusOrder: FastingStatus[] = ["fasted", "missed", "excused", "upcoming"];
                    const currentIndex = statusOrder.indexOf(status);
                    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
                    updateFastingStatus(day.dayNumber, nextStatus);
                  }
                }}
                disabled={!isPast}
              >
                <Text style={[
                  styles.trackerDayNumber,
                  !isPast && styles.trackerDayNumberFuture,
                ]}>
                  Day {day.dayNumber}
                </Text>
                <Ionicons 
                  name={statusInfo.icon as any} 
                  size={32} 
                  color={isPast ? statusInfo.color : colors.textMuted} 
                />
                <Text style={[
                  styles.trackerDayStatus,
                  { color: isPast ? statusInfo.color : colors.textMuted },
                ]}>
                  {status === "upcoming" ? (isPast ? "Tap to mark" : "Upcoming") : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Make-up Days Info */}
      {fastingStats.missed > 0 && (
        <View style={styles.makeupCard}>
          <View style={styles.makeupHeader}>
            <Ionicons name="information-circle" size={24} color={colors.warning} />
            <Text style={styles.makeupTitle}>Make-up Fasts Required</Text>
          </View>
          <Text style={styles.makeupText}>
            You have {fastingStats.missed} missed fast{fastingStats.missed > 1 ? 's' : ''} to make up after Ramadan.
          </Text>
          <Text style={styles.makeupNote}>
            Make-up fasts can be completed anytime before the next Ramadan.
          </Text>
        </View>
      )}

      {/* Excused Days Info */}
      {fastingStats.excused > 0 && (
        <View style={styles.excusedCard}>
          <View style={styles.excusedHeader}>
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={styles.excusedTitle}>About Excused Fasts</Text>
          </View>
          <Text style={styles.excusedText}>
            You have {fastingStats.excused} excused day{fastingStats.excused > 1 ? 's' : ''}.
          </Text>
          <Text style={styles.excusedNote}>
            Excused fasts (illness, travel, etc.) should be made up when possible, or Fidya given if unable.
          </Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ramadan Calendar</Text>
        <Text style={styles.subtitle}>{RAMADAN_YEAR_HIJRI} / 2026 CE</Text>
        {selectedDay && (
          <Text style={styles.locationText}>
            📍 {selectedDay.city}{selectedDay.country ? `, ${selectedDay.country}` : ""}
          </Text>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "today" && renderTodayTab()}
        {activeTab === "calendar" && renderCalendarTab()}
        {activeTab === "tracker" && renderTrackerTab()}
        
        <View style={{ height: spacing.xxl }} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
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
  
  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.primary + "30",
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

  // Countdown Card
  countdownCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  countdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
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
  },
  countdownItem: {
    alignItems: "center",
    minWidth: 50,
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
    opacity: 0.8,
  },
  countdownSeparator: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
    marginHorizontal: spacing.xs,
  },

  // Current Day Card
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
  timingHint: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.6,
    marginTop: spacing.xs,
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

  // Dua Card
  duaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    ...shadows.md,
  },
  duaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  duaOccasion: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  duaArabic: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  duaTransliteration: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  duaTranslation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Daily Duas
  dailyDuaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dailyDuaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  dailyDuaOccasion: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
  },
  dailyDuaArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  dailyDuaTransliteration: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dailyDuaTranslation: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // Calendar Tab
  calendarHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  calendarMonthTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  calendarSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  calendarGrid: {
    marginBottom: spacing.xl,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  weekdayText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textMuted,
    width: 40,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: spacing.xs,
  },
  calendarDayCell: {
    width: 44,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  calendarDayCellToday: {
    backgroundColor: colors.primary,
  },
  calendarDayCellSpecial: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  calendarDayNumber: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  calendarDayNumberToday: {
    color: colors.textOnPrimary,
  },
  calendarDayStatus: {
    marginTop: 2,
  },

  // Selected Day Card
  selectedDayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  selectedDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDayTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  selectedDayDate: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  selectedDayTimings: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  selectedDayTiming: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectedDayTimingLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  selectedDayTimingTime: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  selectedDayEvent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  selectedDayEventText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.secondary,
  },

  // Tracker Tab
  trackerStatsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  trackerStatsTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  trackerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xl,
  },
  trackerStatItem: {
    alignItems: "center",
  },
  trackerStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  trackerStatNumber: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  trackerStatLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  trackerProgressContainer: {
    alignItems: "center",
  },
  trackerProgressBar: {
    width: "100%",
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  trackerProgressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  trackerProgressText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },

  // Tracker Grid
  trackerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  trackerDayCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.sm,
    marginBottom: spacing.xs,
  },
  trackerDayCardFuture: {
    opacity: 0.5,
  },
  trackerDayNumber: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  trackerDayNumberFuture: {
    color: colors.textMuted,
  },
  trackerDayStatus: {
    fontSize: typography.sizes.xxs,
    fontFamily: typography.fonts.regular,
    marginTop: spacing.xs,
  },

  // Make-up Card
  makeupCard: {
    backgroundColor: colors.warning + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.warning + "30",
  },
  makeupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  makeupTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.warning,
  },
  makeupText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  makeupNote: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // Excused Card
  excusedCard: {
    backgroundColor: colors.primary + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  excusedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  excusedTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  excusedText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  excusedNote: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },

  // Events
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

  // Reminders
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