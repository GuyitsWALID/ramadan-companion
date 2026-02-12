import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, BackHandler, FlatList } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";
import { Audio } from "expo-av";
import QuranReader from "../../components/QuranReader";

// Import Quran data and services
import { 
  SURAHS, 
  RECITERS, 
  ReadingMode, 
  SurahInfo, 
  Reciter,
  getReadingModeLabel,
} from "../../utils/quranData";
import {
  fetchSurahArabic,
  fetchSurahWithTranslation,
  fetchSurahAudio,
  saveLastRead,
  getLastRead,
  saveReadingMode,
  getReadingMode,
  saveSelectedReciter,
  getSelectedReciter,
  searchSurahs,
  SurahContent,
} from "../../utils/quranService";

interface JuzProgress {
  juz: number;
  name: string;
  arabicName: string;
  completed: boolean;
  progress: number;
  versesRead: number;
  totalVerses: number;
  lastRead?: string;
}

interface Bookmark {
  id: string;
  surah: string;
  surahNumber: number;
  ayah: number;
  juz: number;
  note?: string;
  createdAt: string;
}

interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
  totalDaysRead: number;
  weeklyProgress: boolean[];
}

interface DailyObjective {
  versesTarget: number;
  versesRead: number;
  startTime?: string;
  completed: boolean;
  lockedIn: boolean;
}

type TabType = "progress" | "reading" | "bookmarks" | "streaks";

const JUZ_PROGRESS_KEY = "@ramadan_juz_progress";
const BOOKMARKS_KEY = "@ramadan_quran_bookmarks";
const STREAK_KEY = "@ramadan_reading_streak";
const DAILY_OBJECTIVE_KEY = "@ramadan_daily_objective";

// Juz names in Arabic
const JUZ_NAMES = [
  "الم", "سيقول", "تلك الرسل", "لن تنالوا", "والمحصنات",
  "لا يحب الله", "وإذا سمعوا", "ولو أننا", "قال الملأ", "واعلموا",
  "يعتذرون", "وما من دابة", "وما أبرئ", "ربما", "سبحان",
  "قال ألم", "اقترب", "قد أفلح", "وقال الذين", "أمن خلق",
  "اتل ما أوحي", "ومن يقنت", "وما لي", "فمن أظلم", "إليه يرد",
  "حم", "قال فما خطبكم", "قد سمع", "تبارك", "عم"
];

export default function QuranScreen() {
  const { user: userContextUser, userId } = useUser();
  const { user: authUser } = useAuth();
  const { colors, shadows } = useTheme();
  
  const styles = getStyles(colors, shadows);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("reading");
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");
  
  // Surah list state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSurahs, setFilteredSurahs] = useState<SurahInfo[]>(SURAHS);
  
  // Reading mode states
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentSurahContent, setCurrentSurahContent] = useState<SurahContent | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  
  // Reading mode preference (Arabic only vs With Translation)
  const [readingModePreference, setReadingModePreference] = useState<ReadingMode>("translation");
  const [showReadingModeModal, setShowReadingModeModal] = useState(false);
  
  // Audio states
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState<number | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [audioData, setAudioData] = useState<{ number: number; audio: string }[]>([]);
  
  // Daily objective states
  const [showSetObjectiveModal, setShowSetObjectiveModal] = useState(false);
  const [showLockInConfirm, setShowLockInConfirm] = useState(false);
  const [dailyObjective, setDailyObjective] = useState<DailyObjective>({
    versesTarget: 20,
    versesRead: 0,
    completed: false,
    lockedIn: false,
  });
  
  // Merge user data
  const user = authUser || userContextUser;
  
  const [readingPlan, setReadingPlan] = useState({
    dailyVerses: authUser?.quranGoal || 20,
    currentJuz: 1,
    startDate: new Date().toISOString(),
  });

  const [juzProgress, setJuzProgress] = useState<JuzProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [streak, setStreak] = useState<ReadingStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: "",
    totalDaysRead: 0,
    weeklyProgress: [false, false, false, false, false, false, false],
  });
  
  const updateReadingPlanMutation = useMutation(api.users.updateQuranReadingPlan);
  const saveQuranProgressMutation = useMutation(api.users.saveQuranProgress);

  // Handle back button when in lock-in mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (dailyObjective.lockedIn && !dailyObjective.completed) {
        Alert.alert(
          "📖 Stay Focused",
          `You have committed to reading ${dailyObjective.versesTarget} verses. You've read ${dailyObjective.versesRead} so far. Keep going!`,
          [{ text: "Continue Reading", style: "default" }]
        );
        return true;
      }
      if (isReadingMode) {
        stopAudio();
        setIsReadingMode(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [dailyObjective, isReadingMode]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Load saved preferences
  useEffect(() => {
    loadPreferences();
    loadProgress();
    loadBookmarks();
    loadStreak();
    loadDailyObjective();
  }, []);

  // Filter surahs based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSurahs(SURAHS);
    } else {
      setFilteredSurahs(searchSurahs(searchQuery));
    }
  }, [searchQuery]);

  // Update reading plan from user context
  useEffect(() => {
    if (authUser?.quranGoal) {
      setReadingPlan(prev => ({
        ...prev,
        dailyVerses: authUser.quranGoal!,
      }));
    } else if (userContextUser?.quranReadingPlan) {
      setReadingPlan({
        dailyVerses: userContextUser.quranReadingPlan.dailyVerses,
        currentJuz: userContextUser.quranReadingPlan.currentJuz,
        startDate: userContextUser.quranReadingPlan.startDate,
      });
    }
  }, [authUser, userContextUser]);

  const loadPreferences = async () => {
    try {
      const mode = await getReadingMode();
      setReadingModePreference(mode);
      
      const reciter = await getSelectedReciter();
      setSelectedReciter(reciter);
      
      const lastRead = await getLastRead();
      if (lastRead) {
        setCurrentSurah(lastRead.surah);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const loadDailyObjective = async () => {
    try {
      const saved = await AsyncStorage.getItem(DAILY_OBJECTIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toISOString().split("T")[0];
        if (parsed.startTime && !parsed.startTime.startsWith(today)) {
          setDailyObjective({
            versesTarget: parsed.versesTarget || 20,
            versesRead: 0,
            completed: false,
            lockedIn: false,
          });
        } else {
          setDailyObjective(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading daily objective:", error);
    }
  };

  const saveDailyObjective = async (objective: DailyObjective) => {
    try {
      await AsyncStorage.setItem(DAILY_OBJECTIVE_KEY, JSON.stringify(objective));
    } catch (error) {
      console.error("Error saving daily objective:", error);
    }
  };

  const loadProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem(JUZ_PROGRESS_KEY);
      if (savedProgress) {
        setJuzProgress(JSON.parse(savedProgress));
      } else {
        const initialProgress = Array.from({ length: 30 }, (_, i) => ({
          juz: i + 1,
          name: `Juz ${i + 1}`,
          arabicName: JUZ_NAMES[i],
          completed: false,
          progress: 0,
          versesRead: 0,
          totalVerses: Math.floor(200 + Math.random() * 100),
        }));
        setJuzProgress(initialProgress);
      }
    } catch (error) {
      console.error("Error loading Quran progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarks(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
  };

  const loadStreak = async () => {
    try {
      const saved = await AsyncStorage.getItem(STREAK_KEY);
      if (saved) {
        const savedStreak = JSON.parse(saved);
        const lastRead = new Date(savedStreak.lastReadDate);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          setStreak({
            ...savedStreak,
            currentStreak: 0,
            weeklyProgress: [false, false, false, false, false, false, false],
          });
        } else {
          setStreak(savedStreak);
        }
      }
    } catch (error) {
      console.error("Error loading streak:", error);
    }
  };

  const saveProgress = async (progress: JuzProgress[]) => {
    try {
      await AsyncStorage.setItem(JUZ_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Error saving Quran progress:", error);
    }
  };

  const saveBookmarks = async (newBookmarks: Bookmark[]) => {
    try {
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    } catch (error) {
      console.error("Error saving bookmarks:", error);
    }
  };

  const saveStreak = async (newStreak: ReadingStreak) => {
    try {
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
    } catch (error) {
      console.error("Error saving streak:", error);
    }
  };

  const updateStreak = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (streak.lastReadDate === today) return;

    const dayOfWeek = new Date().getDay();
    const newWeeklyProgress = [...streak.weeklyProgress];
    newWeeklyProgress[dayOfWeek] = true;

    const newStreak: ReadingStreak = {
      currentStreak: streak.currentStreak + 1,
      longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
      lastReadDate: today,
      totalDaysRead: streak.totalDaysRead + 1,
      weeklyProgress: newWeeklyProgress,
    };

    setStreak(newStreak);
    await saveStreak(newStreak);
  };

  // Load surah content
  const loadSurahContent = async (surahNumber: number) => {
    setLoadingSurah(true);
    try {
      let content: SurahContent | null = null;
      
      if (readingModePreference === "arabic") {
        content = await fetchSurahArabic(surahNumber);
      } else {
        content = await fetchSurahWithTranslation(surahNumber);
      }
      
      if (content) {
        setCurrentSurahContent(content);
        await saveLastRead(surahNumber, 1);
      } else {
        Alert.alert("Error", "Could not load surah. Please check your internet connection.");
      }
    } catch (error) {
      console.error("Error loading surah:", error);
      Alert.alert("Error", "Failed to load surah content.");
    } finally {
      setLoadingSurah(false);
    }
  };

  // Load audio for current surah
  const loadAudioData = async (surahNumber: number) => {
    try {
      const audio = await fetchSurahAudio(surahNumber, selectedReciter.identifier);
      if (audio) {
        setAudioData(audio.verses);
      }
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  };

  // Play verse audio
  const playVerseAudio = async (verseNumber: number) => {
    const verseAudio = audioData.find(v => v.number === verseNumber);
    if (!verseAudio || !verseAudio.audio) {
      Alert.alert("Loading Audio", "Please wait while audio loads...");
      await loadAudioData(currentSurah);
      return;
    }

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: verseAudio.audio },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingVerse(verseNumber);
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Could not play audio.");
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
      // Auto-play next verse
      if (currentPlayingVerse && currentSurahContent) {
        const nextVerse = currentPlayingVerse + 1;
        if (nextVerse <= currentSurahContent.numberOfAyahs) {
          setTimeout(() => playVerseAudio(nextVerse), 500);
        } else {
          setCurrentPlayingVerse(null);
        }
      }
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setCurrentPlayingVerse(null);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;
    
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  // Open surah for reading
  const openSurah = async (surahNumber: number) => {
    setCurrentSurah(surahNumber);
    setIsReadingMode(true);
    await loadSurahContent(surahNumber);
    await loadAudioData(surahNumber);
  };

  // Change reading mode
  const changeReadingMode = async (mode: ReadingMode) => {
    setReadingModePreference(mode);
    await saveReadingMode(mode);
    setShowReadingModeModal(false);
    
    if (isReadingMode && currentSurah) {
      await loadSurahContent(currentSurah);
    }
  };

  // Change reciter
  const changeReciter = async (reciter: Reciter) => {
    setSelectedReciter(reciter);
    await saveSelectedReciter(reciter.id);
    setShowReciterModal(false);
    
    if (currentSurah) {
      await loadAudioData(currentSurah);
    }
  };

  const addBookmark = async () => {
    const surah = SURAHS.find(s => s.number === currentSurah);
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      surah: surah?.englishName || "Unknown",
      surahNumber: currentSurah,
      ayah: 1,
      juz: surah?.juz[0] || 1,
      note: bookmarkNote,
      createdAt: new Date().toISOString(),
    };

    const newBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(newBookmarks);
    await saveBookmarks(newBookmarks);
    setShowBookmarkModal(false);
    setBookmarkNote("");
  };

  const removeBookmark = async (id: string) => {
    const newBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(newBookmarks);
    await saveBookmarks(newBookmarks);
  };

  const markVerseRead = async (verseNumber: number) => {
    if (dailyObjective.completed) return;

    const newVersesRead = Math.max(dailyObjective.versesRead, verseNumber);
    const isComplete = newVersesRead >= dailyObjective.versesTarget;

    const updatedObjective: DailyObjective = {
      ...dailyObjective,
      versesRead: newVersesRead,
      completed: isComplete,
    };

    setDailyObjective(updatedObjective);
    await saveDailyObjective(updatedObjective);

    if (isComplete && !dailyObjective.completed) {
      await updateStreak();
      Alert.alert(
        "🎉 Masha'Allah!",
        `You've completed your daily goal of ${dailyObjective.versesTarget} verses!`,
        [{ text: "Alhamdulillah", style: "default" }]
      );
    }
  };

  const startReading = (withLockIn: boolean, surahNumber?: number) => {
    const newObjective: DailyObjective = {
      versesTarget: dailyObjective.versesTarget,
      versesRead: 0,
      startTime: new Date().toISOString(),
      completed: false,
      lockedIn: withLockIn,
    };
    setDailyObjective(newObjective);
    saveDailyObjective(newObjective);
    setShowSetObjectiveModal(false);
    openSurah(surahNumber || currentSurah);
  };

  const completedJuz = juzProgress.filter(j => j.completed).length;
  const overallProgress = juzProgress.length > 0 ? (completedJuz / 30) * 100 : 0;

  const toggleJuzCompleted = useCallback(async (juzNumber: number) => {
    setSaving(true);
    
    const today = new Date().toISOString();
    const updatedProgress = juzProgress.map(j => {
      if (j.juz === juzNumber) {
        const newCompleted = !j.completed;
        return { 
          ...j, 
          completed: newCompleted,
          progress: newCompleted ? 100 : 0,
          versesRead: newCompleted ? j.totalVerses : 0,
          lastRead: newCompleted ? today : j.lastRead,
        };
      }
      return j;
    });

    setJuzProgress(updatedProgress);
    await saveProgress(updatedProgress);

    const wasCompleted = juzProgress.find(j => j.juz === juzNumber)?.completed;
    if (!wasCompleted) {
      await updateStreak();
    }

    const nextIncomplete = updatedProgress.find(j => !j.completed);
    if (nextIncomplete) {
      setReadingPlan(prev => ({ ...prev, currentJuz: nextIncomplete.juz }));
    }

    if (userId) {
      try {
        const completedJuzNumbers = updatedProgress
          .filter(j => j.completed)
          .map(j => j.juz);

        await updateReadingPlanMutation({
          userId,
          dailyVerses: readingPlan.dailyVerses,
          currentJuz: nextIncomplete?.juz || 30,
          completedJuz: completedJuzNumbers,
          startDate: readingPlan.startDate,
        });

        await saveQuranProgressMutation({
          userId,
          date: new Date().toISOString().split("T")[0],
          juzNumber,
          versesRead: updatedProgress.find(j => j.juz === juzNumber)?.completed ? 100 : 0,
          totalVerses: 100,
          completed: updatedProgress.find(j => j.juz === juzNumber)?.completed || false,
        });
      } catch (error) {
        console.error("Error syncing progress to Convex:", error);
      }
    }

    setSaving(false);
  }, [juzProgress, userId, readingPlan, updateReadingPlanMutation, saveQuranProgressMutation]);

  // Render surah list item
  const renderSurahItem = ({ item }: { item: SurahInfo }) => (
    <TouchableOpacity
      style={styles.surahItem}
      onPress={() => openSurah(item.number)}
    >
      <View style={styles.surahItemNumber}>
        <Text style={styles.surahItemNumberText}>{item.number}</Text>
      </View>
      <View style={styles.surahItemInfo}>
        <Text style={styles.surahItemArabic}>{item.name}</Text>
        <Text style={styles.surahItemEnglish}>{item.englishName}</Text>
        <Text style={styles.surahItemMeaning}>{item.englishNameTranslation}</Text>
      </View>
      <View style={styles.surahItemMeta}>
        <Text style={styles.surahItemVersesText}>{item.numberOfAyahs} verses</Text>
        <Text style={styles.surahItemType}>{item.revelationType}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  // Render reading tab with full surah list
  const renderReadingTab = () => (
    <>
      {/* Today's Progress Card */}
      <View style={styles.readingHeroCard}>
        <View style={styles.readingHeroIcon}>
          <Ionicons name="book" size={32} color={colors.primary} />
        </View>
        <Text style={styles.readingHeroTitle}>Daily Quran Reading</Text>
        <Text style={styles.readingHeroSubtitle}>
          {dailyObjective.completed 
            ? "You've completed today's goal! 🎉" 
            : `Read ${dailyObjective.versesTarget} verses to complete your daily goal`}
        </Text>
        
        <View style={styles.readingHeroProgress}>
          <View style={styles.readingHeroProgressBar}>
            <View 
              style={[
                styles.readingHeroProgressFill,
                { width: `${Math.min((dailyObjective.versesRead / dailyObjective.versesTarget) * 100, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.readingHeroProgressText}>
            {dailyObjective.versesRead} / {dailyObjective.versesTarget} verses
          </Text>
        </View>

        {dailyObjective.completed && (
          <View style={styles.completedBadgeHero}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.completedBadgeText}>Goal Completed!</Text>
          </View>
        )}
      </View>

      {/* Reading Mode & Reciter Selection */}
      <View style={styles.settingsRow}>
        <TouchableOpacity 
          style={styles.settingButton}
          onPress={() => setShowReadingModeModal(true)}
        >
          <Ionicons name="text" size={20} color={colors.primary} />
          <Text style={styles.settingButtonText}>
            {getReadingModeLabel(readingModePreference)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingButton}
          onPress={() => setShowReciterModal(true)}
        >
          <Ionicons name="headset" size={20} color={colors.secondary} />
          <Text style={styles.settingButtonText} numberOfLines={1}>
            {selectedReciter.englishName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search surahs..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Surah List Header */}
      <View style={styles.surahListHeader}>
        <Text style={styles.surahListTitle}>All 114 Surahs</Text>
        <Text style={styles.surahListCount}>{filteredSurahs.length} surahs</Text>
      </View>

      {/* Surah List */}
      <FlatList
        data={filteredSurahs}
        renderItem={renderSurahItem}
        keyExtractor={(item) => item.number.toString()}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </>
  );

  const renderProgressTab = () => (
    <>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>Today's Reading</Text>
          <Text style={styles.heroJuz}>Juz {readingPlan.currentJuz}</Text>
          <Text style={styles.heroArabic}>{JUZ_NAMES[readingPlan.currentJuz - 1]}</Text>
          <Text style={styles.heroVerses}>{readingPlan.dailyVerses} verses goal</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.heroButton,
            juzProgress[readingPlan.currentJuz - 1]?.completed && styles.heroButtonCompleted
          ]}
          onPress={() => toggleJuzCompleted(readingPlan.currentJuz)}
          disabled={saving}
        >
          <Ionicons 
            name={juzProgress[readingPlan.currentJuz - 1]?.completed ? "checkmark-circle" : "play"} 
            size={32} 
            color={colors.textOnPrimary} 
          />
          <Text style={styles.heroButtonText}>
            {juzProgress[readingPlan.currentJuz - 1]?.completed ? "Done!" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Overview */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Overall Progress</Text>
          <Text style={styles.progressPercentage}>{overallProgress.toFixed(0)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
        </View>
        <View style={styles.progressStats}>
          <View style={styles.progressStatItem}>
            <Ionicons name="checkmark-done" size={20} color={colors.success} />
            <Text style={styles.progressStatValue}>{completedJuz}</Text>
            <Text style={styles.progressStatLabel}>Completed</Text>
          </View>
          <View style={styles.progressStatItem}>
            <Ionicons name="hourglass" size={20} color={colors.warning} />
            <Text style={styles.progressStatValue}>{30 - completedJuz}</Text>
            <Text style={styles.progressStatLabel}>Remaining</Text>
          </View>
          <View style={styles.progressStatItem}>
            <Ionicons name="flame" size={20} color={colors.error} />
            <Text style={styles.progressStatValue}>{streak.currentStreak}</Text>
            <Text style={styles.progressStatLabel}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Juz Grid */}
      <Text style={styles.sectionTitle}>All 30 Juz {saving && <Text style={styles.savingText}>(Saving...)</Text>}</Text>
      <View style={styles.juzGrid}>
        {juzProgress.map((juz) => (
          <TouchableOpacity
            key={juz.juz}
            style={[
              styles.juzGridItem,
              juz.completed && styles.juzGridItemCompleted,
              juz.juz === readingPlan.currentJuz && !juz.completed && styles.juzGridItemCurrent,
            ]}
            onPress={() => toggleJuzCompleted(juz.juz)}
            disabled={saving}
          >
            <Text style={[
              styles.juzGridNumber,
              juz.completed && styles.juzGridNumberCompleted,
            ]}>{juz.juz}</Text>
            {juz.completed && (
              <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} style={styles.juzGridCheck} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderBookmarksTab = () => (
    <>
      <View style={styles.bookmarkHeader}>
        <Text style={styles.sectionTitle}>Your Bookmarks</Text>
        <TouchableOpacity 
          style={styles.addBookmarkButton}
          onPress={() => setShowBookmarkModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyStateTitle}>No Bookmarks Yet</Text>
          <Text style={styles.emptyStateText}>
            Tap the + button to add your first bookmark
          </Text>
        </View>
      ) : (
        bookmarks.map((bookmark) => (
          <TouchableOpacity 
            key={bookmark.id} 
            style={styles.bookmarkCard}
            onPress={() => openSurah(bookmark.surahNumber)}
          >
            <View style={styles.bookmarkIcon}>
              <Ionicons name="bookmark" size={24} color={colors.secondary} />
            </View>
            <View style={styles.bookmarkInfo}>
              <Text style={styles.bookmarkSurah}>{bookmark.surah}</Text>
              <Text style={styles.bookmarkAyah}>Ayah {bookmark.ayah} • Juz {bookmark.juz}</Text>
              {bookmark.note && (
                <Text style={styles.bookmarkNote}>{bookmark.note}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.removeBookmark}
              onPress={() => removeBookmark(bookmark.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </>
  );

  const renderStreaksTab = () => (
    <>
      <View style={styles.streakHero}>
        <View style={styles.streakFireContainer}>
          <Ionicons name="flame" size={64} color={colors.secondary} />
        </View>
        <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>

      <View style={styles.streakStatsGrid}>
        <View style={styles.streakStatCard}>
          <Ionicons name="trophy" size={28} color={colors.secondary} />
          <Text style={styles.streakStatValue}>{streak.longestStreak}</Text>
          <Text style={styles.streakStatLabel}>Longest Streak</Text>
        </View>
        <View style={styles.streakStatCard}>
          <Ionicons name="calendar" size={28} color={colors.primary} />
          <Text style={styles.streakStatValue}>{streak.totalDaysRead}</Text>
          <Text style={styles.streakStatLabel}>Total Days</Text>
        </View>
      </View>

      <View style={styles.weeklyProgressCard}>
        <Text style={styles.weeklyProgressTitle}>This Week</Text>
        <View style={styles.weeklyDots}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <View key={index} style={styles.weeklyDotContainer}>
              <View style={[
                styles.weeklyDot,
                streak.weeklyProgress[index] && styles.weeklyDotActive,
                index === new Date().getDay() && styles.weeklyDotToday,
              ]}>
                {streak.weeklyProgress[index] && (
                  <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                )}
              </View>
              <Text style={[
                styles.weeklyDotLabel,
                index === new Date().getDay() && styles.weeklyDotLabelToday,
              ]}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.motivationCard}>
        <Ionicons name="sparkles" size={24} color={colors.secondary} />
        <Text style={styles.motivationText}>
          "The best of you are those who learn the Quran and teach it."
        </Text>
        <Text style={styles.motivationSource}>— Prophet Muhammad ﷺ</Text>
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="book" size={48} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
          <Text style={styles.loadingText}>Loading Quran...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quran</Text>
        <Text style={styles.subtitle}>Your reading journey</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "reading" && styles.activeTab]}
          onPress={() => setActiveTab("reading")}
        >
          <Ionicons 
            name="book-outline" 
            size={20} 
            color={activeTab === "reading" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "reading" && styles.activeTabText]}>Read</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "progress" && styles.activeTab]}
          onPress={() => setActiveTab("progress")}
        >
          <Ionicons 
            name="stats-chart-outline" 
            size={20} 
            color={activeTab === "progress" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "progress" && styles.activeTabText]}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "bookmarks" && styles.activeTab]}
          onPress={() => setActiveTab("bookmarks")}
        >
          <Ionicons 
            name="bookmark-outline" 
            size={20} 
            color={activeTab === "bookmarks" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "bookmarks" && styles.activeTabText]}>Bookmarks</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "streaks" && styles.activeTab]}
          onPress={() => setActiveTab("streaks")}
        >
          <Ionicons 
            name="flame-outline" 
            size={20} 
            color={activeTab === "streaks" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "streaks" && styles.activeTabText]}>Streaks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "reading" && renderReadingTab()}
        {activeTab === "progress" && renderProgressTab()}
        {activeTab === "bookmarks" && renderBookmarksTab()}
        {activeTab === "streaks" && renderStreaksTab()}
      </ScrollView>

      {/* Quran Reader Modal */}
      <QuranReader
        visible={isReadingMode}
        onClose={() => {
          if (dailyObjective.lockedIn && !dailyObjective.completed) {
            Alert.alert("📖 Stay Focused", "Complete your goal to exit.");
          } else {
            stopAudio();
            setIsReadingMode(false);
          }
        }}
        initialSurah={currentSurah}
        selectedReciter={selectedReciter}
        onReciterPress={() => setShowReciterModal(true)}
        onVerseRead={(verseNum) => markVerseRead(verseNum)}
      />

      {/* Reading Mode Selection Modal */}
      <Modal
        visible={showReadingModeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReadingModeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reading Mode</Text>
            
            <TouchableOpacity 
              style={[styles.modalOption, readingModePreference === "arabic" && styles.modalOptionActive]}
              onPress={() => changeReadingMode("arabic")}
            >
              <View style={styles.modalOptionIcon}>
                <Text style={styles.modalOptionArabic}>ع</Text>
              </View>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>Arabic Only</Text>
                <Text style={styles.modalOptionDesc}>Classic Quran reading</Text>
              </View>
              {readingModePreference === "arabic" && (
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalOption, readingModePreference === "translation" && styles.modalOptionActive]}
              onPress={() => changeReadingMode("translation")}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="language" size={24} color={colors.primary} />
              </View>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>With Translation</Text>
                <Text style={styles.modalOptionDesc}>Arabic + English translation</Text>
              </View>
              {readingModePreference === "translation" && (
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowReadingModeModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reciter Selection Modal */}
      <Modal
        visible={showReciterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Select Reciter</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {RECITERS.map((reciter) => (
                <TouchableOpacity 
                  key={reciter.id}
                  style={[styles.reciterItem, selectedReciter.id === reciter.id && styles.reciterItemActive]}
                  onPress={() => changeReciter(reciter)}
                >
                  <View style={styles.reciterIcon}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.reciterInfo}>
                    <Text style={styles.reciterName}>{reciter.englishName}</Text>
                    <Text style={styles.reciterArabicName}>{reciter.name}</Text>
                    <Text style={styles.reciterStyle}>{reciter.style}</Text>
                  </View>
                  {selectedReciter.id === reciter.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowReciterModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bookmark Modal */}
      <Modal
        visible={showBookmarkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookmarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Bookmark</Text>
            
            <Text style={styles.modalLabel}>Select Surah</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.juzSelector}>
              {SURAHS.slice(0, 20).map((surah) => (
                <TouchableOpacity
                  key={surah.number}
                  style={[styles.juzSelectItem, currentSurah === surah.number && styles.juzSelectItemActive]}
                  onPress={() => setCurrentSurah(surah.number)}
                >
                  <Text style={[styles.juzSelectText, currentSurah === surah.number && styles.juzSelectTextActive]}>
                    {surah.number}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Add a note..."
              value={bookmarkNote}
              onChangeText={setBookmarkNote}
              multiline
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowBookmarkModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={addBookmark}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Objective Modal */}
      <Modal
        visible={showSetObjectiveModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSetObjectiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.objectiveModal}>
            <Text style={styles.objectiveModalTitle}>📖 Set Your Daily Goal</Text>
            <Text style={styles.objectiveModalSubtitle}>
              How many verses do you want to read today?
            </Text>
            
            <View style={styles.objectiveOptions}>
              {[10, 20, 30, 50].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.objectiveOption,
                    dailyObjective.versesTarget === count && styles.objectiveOptionActive
                  ]}
                  onPress={() => setDailyObjective(prev => ({ ...prev, versesTarget: count }))}
                >
                  <Text style={[
                    styles.objectiveOptionText,
                    dailyObjective.versesTarget === count && styles.objectiveOptionTextActive
                  ]}>{count}</Text>
                  <Text style={styles.objectiveOptionLabel}>verses</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.lockInButton}
              onPress={() => setShowLockInConfirm(true)}
            >
              <Ionicons name="lock-closed" size={20} color="#FFF" />
              <Text style={styles.lockInButtonText}>Start with Focus Mode</Text>
            </TouchableOpacity>

            <View style={styles.objectiveButtons}>
              <TouchableOpacity 
                style={styles.objectiveCancelButton}
                onPress={() => setShowSetObjectiveModal(false)}
              >
                <Text style={styles.objectiveCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.objectiveStartButton}
                onPress={() => startReading(false, currentSurah)}
              >
                <Text style={styles.objectiveStartText}>Start Reading</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lock-in Confirmation Modal */}
      <Modal
        visible={showLockInConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLockInConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.lockInConfirmModal}>
            <Ionicons name="lock-closed" size={48} color={colors.secondary} />
            <Text style={styles.lockInConfirmTitle}>Enable Focus Mode?</Text>
            <Text style={styles.lockInConfirmText}>
              You're committing to read {dailyObjective.versesTarget} verses. You won't be able to exit until done.
            </Text>
            <View style={styles.lockInConfirmButtons}>
              <TouchableOpacity 
                style={styles.lockInConfirmCancel}
                onPress={() => setShowLockInConfirm(false)}
              >
                <Text style={styles.lockInConfirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.lockInConfirmStart}
                onPress={() => {
                  setShowLockInConfirm(false);
                  startReading(true, currentSurah);
                }}
              >
                <Ionicons name="lock-closed" size={18} color="#FFF" />
                <Text style={styles.lockInConfirmStartText}>I Commit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, padding: spacing.lg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, marginBottom: spacing.sm },
  title: { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.bold, color: colors.primary, marginBottom: spacing.xxs },
  subtitle: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.textSecondary },
  tabBar: { flexDirection: "row", marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xs, marginBottom: spacing.md, ...shadows.sm },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, gap: spacing.xs, borderRadius: borderRadius.md },
  activeTab: { backgroundColor: colors.primary + "15" },
  tabText: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.medium, color: colors.textMuted },
  activeTabText: { color: colors.primary, fontFamily: typography.fonts.semiBold },
  readingHeroCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, marginBottom: spacing.lg, alignItems: "center", ...shadows.md },
  readingHeroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + "20", justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  readingHeroTitle: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: spacing.xs },
  readingHeroSubtitle: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg },
  readingHeroProgress: { width: "100%", marginBottom: spacing.md },
  readingHeroProgressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", marginBottom: spacing.xs },
  readingHeroProgressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  readingHeroProgressText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.medium, color: colors.textSecondary, textAlign: "center" },
  completedBadgeHero: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.success + "20", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  completedBadgeText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.success },
  settingsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  settingButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, ...shadows.sm },
  settingButtonText: { flex: 1, fontSize: typography.sizes.sm, fontFamily: typography.fonts.medium, color: colors.text },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, gap: spacing.sm, ...shadows.sm },
  searchInput: { flex: 1, fontSize: typography.sizes.md, fontFamily: typography.fonts.regular, color: colors.text },
  surahListHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  surahListTitle: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text },
  surahListCount: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted },
  surahItem: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  surahItemNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "20", justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  surahItemNumberText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.bold, color: colors.primary },
  surahItemInfo: { flex: 1 },
  surahItemArabic: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, textAlign: "right", marginBottom: spacing.xxs },
  surahItemEnglish: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  surahItemMeaning: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted },
  surahItemMeta: { alignItems: "flex-end", marginRight: spacing.sm },
  surahItemVersesText: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.medium, color: colors.textSecondary },
  surahItemType: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted },
  heroCard: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.xl, marginBottom: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadows.lg },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textOnPrimary, opacity: 0.9, marginBottom: spacing.xs },
  heroJuz: { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.bold, color: colors.textOnPrimary },
  heroArabic: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.medium, color: colors.textOnPrimary, opacity: 0.9, marginBottom: spacing.xs },
  heroVerses: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textOnPrimary, opacity: 0.8 },
  heroButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.secondary, justifyContent: "center", alignItems: "center", ...shadows.md },
  heroButtonCompleted: { backgroundColor: colors.success },
  heroButtonText: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.semiBold, color: colors.textOnPrimary, marginTop: spacing.xxs },
  progressCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.sm },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  progressTitle: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  progressPercentage: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.primary },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", marginBottom: spacing.md },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  progressStats: { flexDirection: "row", justifyContent: "space-around" },
  progressStatItem: { alignItems: "center" },
  progressStatValue: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, marginTop: spacing.xs },
  progressStatLabel: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted },
  sectionTitle: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  savingText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted },
  juzGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  juzGridItem: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", ...shadows.sm },
  juzGridItemCompleted: { backgroundColor: colors.success },
  juzGridItemCurrent: { backgroundColor: colors.primary + "30", borderWidth: 2, borderColor: colors.primary },
  juzGridNumber: { fontSize: typography.sizes.md, fontFamily: typography.fonts.bold, color: colors.text },
  juzGridNumberCompleted: { color: colors.textOnPrimary },
  juzGridCheck: { position: "absolute", top: 2, right: 2 },
  bookmarkHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  addBookmarkButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.sm },
  emptyState: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyStateTitle: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, marginTop: spacing.md },
  emptyStateText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs },
  bookmarkCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  bookmarkIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary + "20", justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  bookmarkInfo: { flex: 1 },
  bookmarkSurah: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  bookmarkAyah: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted },
  bookmarkNote: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: "italic" },
  removeBookmark: { padding: spacing.sm },
  streakHero: { alignItems: "center", backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md },
  streakFireContainer: { marginBottom: spacing.md },
  streakNumber: { fontSize: 64, fontFamily: typography.fonts.bold, color: colors.text },
  streakLabel: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.medium, color: colors.textSecondary },
  streakStatsGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  streakStatCard: { flex: 1, alignItems: "center", backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.sm },
  streakStatValue: { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.bold, color: colors.text, marginTop: spacing.sm },
  streakStatLabel: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: spacing.xs },
  weeklyProgressCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.sm },
  weeklyProgressTitle: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text, marginBottom: spacing.md, textAlign: "center" },
  weeklyDots: { flexDirection: "row", justifyContent: "space-around" },
  weeklyDotContainer: { alignItems: "center" },
  weeklyDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border, justifyContent: "center", alignItems: "center", marginBottom: spacing.xs },
  weeklyDotActive: { backgroundColor: colors.success },
  weeklyDotToday: { borderWidth: 2, borderColor: colors.primary },
  weeklyDotLabel: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.medium, color: colors.textMuted },
  weeklyDotLabelToday: { color: colors.primary, fontFamily: typography.fonts.bold },
  motivationCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: "center", marginBottom: spacing.lg, ...shadows.sm },
  motivationText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.medium, color: colors.text, textAlign: "center", marginTop: spacing.md, fontStyle: "italic" },
  motivationSource: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, width: "100%", maxWidth: 400, ...shadows.lg },
  modalTitle: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: spacing.lg, textAlign: "center" },
  modalLabel: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.medium, color: colors.textSecondary, marginBottom: spacing.sm },
  modalInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.sizes.md, fontFamily: typography.fonts.regular, color: colors.text, minHeight: 80, textAlignVertical: "top", marginBottom: spacing.lg },
  modalButtons: { flexDirection: "row", gap: spacing.md },
  modalCancelButton: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.medium, color: colors.textSecondary },
  modalSaveButton: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, backgroundColor: colors.primary },
  modalSaveText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.textOnPrimary },
  modalCloseButton: { paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, backgroundColor: colors.primary, marginTop: spacing.md },
  modalCloseText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.textOnPrimary },
  modalOption: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, backgroundColor: colors.background },
  modalOptionActive: { backgroundColor: colors.primary + "20", borderWidth: 2, borderColor: colors.primary },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "20", justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  modalOptionArabic: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.primary },
  modalOptionInfo: { flex: 1 },
  modalOptionTitle: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  modalOptionDesc: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textMuted },
  reciterItem: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, backgroundColor: colors.background },
  reciterItemActive: { backgroundColor: colors.primary + "20", borderWidth: 2, borderColor: colors.primary },
  reciterIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + "20", justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  reciterInfo: { flex: 1 },
  reciterName: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.text },
  reciterArabicName: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary },
  reciterStyle: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted },
  juzSelector: { marginBottom: spacing.lg },
  juzSelectItem: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: spacing.sm },
  juzSelectItemActive: { backgroundColor: colors.primary },
  juzSelectText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.medium, color: colors.text },
  juzSelectTextActive: { color: colors.textOnPrimary },
  objectiveModal: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, width: "100%", maxWidth: 400, ...shadows.lg },
  objectiveModalTitle: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text, textAlign: "center", marginBottom: spacing.sm },
  objectiveModalSubtitle: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg },
  objectiveOptions: { flexDirection: "row", justifyContent: "space-around", marginBottom: spacing.lg },
  objectiveOption: { alignItems: "center", padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.background, minWidth: 70 },
  objectiveOptionActive: { backgroundColor: colors.primary },
  objectiveOptionText: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text },
  objectiveOptionTextActive: { color: colors.textOnPrimary },
  objectiveOptionLabel: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.regular, color: colors.textMuted },
  lockInButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.secondary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  lockInButtonText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: "#FFF" },
  objectiveButtons: { flexDirection: "row", gap: spacing.md },
  objectiveCancelButton: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  objectiveCancelText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.medium, color: colors.textSecondary },
  objectiveStartButton: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, backgroundColor: colors.primary },
  objectiveStartText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: colors.textOnPrimary },
  lockInConfirmModal: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: "center", width: "100%", maxWidth: 400, ...shadows.lg },
  lockInConfirmTitle: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  lockInConfirmText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg },
  lockInConfirmButtons: { flexDirection: "row", gap: spacing.md, width: "100%" },
  lockInConfirmCancel: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  lockInConfirmCancelText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.medium, color: colors.textSecondary },
  lockInConfirmStart: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.secondary },
  lockInConfirmStartText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.semiBold, color: "#FFF" },
});
