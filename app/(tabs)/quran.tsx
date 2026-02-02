import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Animated, Alert, BackHandler } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";

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

interface QuranVerse {
  number: number;
  arabic: string;
  translation: string;
  transliteration: string;
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

// Juz names in Arabic (simplified)
const JUZ_NAMES = [
  "الم", "سيقول", "تلك الرسل", "لن تنالوا", "والمحصنات",
  "لا يحب الله", "وإذا سمعوا", "ولو أننا", "قال الملأ", "واعلموا",
  "يعتذرون", "وما من دابة", "وما أبرئ", "ربما", "سبحان",
  "قال ألم", "اقترب", "قد أفلح", "وقال الذين", "أمن خلق",
  "اتل ما أوحي", "ومن يقنت", "وما لي", "فمن أظلم", "إليه يرد",
  "حم", "قال فما خطبكم", "قد سمع", "تبارك", "عم"
];

// Sample Quran verses - Surah Al-Fatiha and beginning of Al-Baqarah
const QURAN_VERSES: { [surahNumber: number]: QuranVerse[] } = {
  1: [
    { number: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.", transliteration: "Bismillahi ar-rahmani ar-raheem" },
    { number: 2, arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "All praise is due to Allah, Lord of the worlds.", transliteration: "Alhamdu lillahi rabbi al-'alameen" },
    { number: 3, arabic: "الرَّحْمَٰنِ الرَّحِيمِ", translation: "The Entirely Merciful, the Especially Merciful.", transliteration: "Ar-rahmani ar-raheem" },
    { number: 4, arabic: "مَالِكِ يَوْمِ الدِّينِ", translation: "Sovereign of the Day of Recompense.", transliteration: "Maliki yawmi ad-deen" },
    { number: 5, arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", translation: "It is You we worship and You we ask for help.", transliteration: "Iyyaka na'budu wa iyyaka nasta'een" },
    { number: 6, arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", translation: "Guide us to the straight path.", transliteration: "Ihdina as-sirat al-mustaqeem" },
    { number: 7, arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", translation: "The path of those upon whom You have bestowed favor, not of those who have evoked Your anger or of those who are astray.", transliteration: "Sirat alladhina an'amta 'alayhim ghayri al-maghdubi 'alayhim wa la ad-dalleen" },
  ],
  2: [
    { number: 1, arabic: "الم", translation: "Alif, Lam, Meem.", transliteration: "Alif-Lam-Meem" },
    { number: 2, arabic: "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ", translation: "This is the Book about which there is no doubt, a guidance for those conscious of Allah.", transliteration: "Dhalika al-kitabu la rayba feehi hudan lil-muttaqeen" },
    { number: 3, arabic: "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ", translation: "Who believe in the unseen, establish prayer, and spend out of what We have provided for them.", transliteration: "Alladhina yu'minuna bil-ghaybi wa yuqimuna as-salata wa mimma razaqnahum yunfiqun" },
    { number: 4, arabic: "وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ", translation: "And who believe in what has been revealed to you and what was revealed before you, and of the Hereafter they are certain.", transliteration: "Walladhina yu'minuna bima unzila ilayka wa ma unzila min qablika wa bil-akhirati hum yuqinun" },
    { number: 5, arabic: "أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ", translation: "Those are upon right guidance from their Lord, and it is those who are the successful.", transliteration: "Ula'ika 'ala hudan min rabbihim wa ula'ika hum al-muflihun" },
    { number: 6, arabic: "إِنَّ الَّذِينَ كَفَرُوا سَوَاءٌ عَلَيْهِمْ أَأَنذَرْتَهُمْ أَمْ لَمْ تُنذِرْهُمْ لَا يُؤْمِنُونَ", translation: "Indeed, those who disbelieve - it is all the same for them whether you warn them or do not warn them - they will not believe.", transliteration: "Inna alladhina kafaru sawa'un 'alayhim a-andhartahum am lam tundhirhum la yu'minun" },
    { number: 7, arabic: "خَتَمَ اللَّهُ عَلَىٰ قُلُوبِهِمْ وَعَلَىٰ سَمْعِهِمْ ۖ وَعَلَىٰ أَبْصَارِهِمْ غِشَاوَةٌ ۖ وَلَهُمْ عَذَابٌ عَظِيمٌ", translation: "Allah has set a seal upon their hearts and upon their hearing, and over their vision is a veil. And for them is a great punishment.", transliteration: "Khatama Allahu 'ala qulubihim wa 'ala sam'ihim wa 'ala absarihim ghishawatun wa lahum 'adhabun 'azeem" },
    { number: 8, arabic: "وَمِنَ النَّاسِ مَن يَقُولُ آمَنَّا بِاللَّهِ وَبِالْيَوْمِ الْآخِرِ وَمَا هُم بِمُؤْمِنِينَ", translation: "And of the people are some who say, 'We believe in Allah and the Last Day,' but they are not believers.", transliteration: "Wa mina an-nasi man yaqulu amanna billahi wa bil-yawmi al-akhiri wa ma hum bi-mu'mineen" },
    { number: 9, arabic: "يُخَادِعُونَ اللَّهَ وَالَّذِينَ آمَنُوا وَمَا يَخْدَعُونَ إِلَّا أَنفُسَهُمْ وَمَا يَشْعُرُونَ", translation: "They think to deceive Allah and those who believe, but they deceive not except themselves and perceive it not.", transliteration: "Yukhaadi'una Allaha walladhina amanu wa ma yakhda'una illa anfusahum wa ma yash'urun" },
    { number: 10, arabic: "فِي قُلُوبِهِم مَّرَضٌ فَزَادَهُمُ اللَّهُ مَرَضًا ۖ وَلَهُمْ عَذَابٌ أَلِيمٌ بِمَا كَانُوا يَكْذِبُونَ", translation: "In their hearts is disease, so Allah has increased their disease; and for them is a painful punishment because they used to lie.", transliteration: "Fi qulubihim maradun fazadahum Allahu maradan wa lahum 'adhabun aleemun bima kanu yakdhibun" },
  ],
};

const SURAH_NAMES: { [key: number]: { arabic: string; english: string; versesCount: number } } = {
  1: { arabic: "الفاتحة", english: "Al-Fatiha", versesCount: 7 },
  2: { arabic: "البقرة", english: "Al-Baqarah", versesCount: 286 },
};

export default function QuranScreen() {
  const { user: userContextUser, userId } = useUser();
  const { user: authUser } = useAuth();
  const { colors, shadows } = useTheme();
  
  const styles = getStyles(colors, shadows);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("progress");
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [selectedJuz, setSelectedJuz] = useState(1);
  
  // Reading mode states
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [versesReadToday, setVersesReadToday] = useState(0);
  const [showSetObjectiveModal, setShowSetObjectiveModal] = useState(false);
  const [showLockInConfirm, setShowLockInConfirm] = useState(false);
  const [dailyObjective, setDailyObjective] = useState<DailyObjective>({
    versesTarget: 20,
    versesRead: 0,
    completed: false,
    lockedIn: false,
  });
  
  // Merge user data - auth user takes priority
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
          `You have committed to reading ${dailyObjective.versesTarget} verses. You've read ${dailyObjective.versesRead} so far. Keep going, you're almost there!`,
          [{ text: "Continue Reading", style: "default" }]
        );
        return true; // Prevent going back
      }
      return false;
    });

    return () => backHandler.remove();
  }, [dailyObjective]);

  // Load saved progress from AsyncStorage
  useEffect(() => {
    loadProgress();
    loadBookmarks();
    loadStreak();
    loadDailyObjective();
  }, []);

  // Update reading plan from user context (including auth user's quran goal)
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

  const loadDailyObjective = async () => {
    try {
      const saved = await AsyncStorage.getItem(DAILY_OBJECTIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reset if it's a new day
        const today = new Date().toISOString().split("T")[0];
        if (parsed.startTime && !parsed.startTime.startsWith(today)) {
          // New day, reset objective
          setDailyObjective({
            versesTarget: parsed.versesTarget || 20,
            versesRead: 0,
            completed: false,
            lockedIn: false,
          });
        } else {
          setDailyObjective(parsed);
          setVersesReadToday(parsed.versesRead || 0);
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
        // Initialize with default progress including Arabic names
        const initialProgress = Array.from({ length: 30 }, (_, i) => ({
          juz: i + 1,
          name: `Juz ${i + 1}`,
          arabicName: JUZ_NAMES[i],
          completed: false,
          progress: 0,
          versesRead: 0,
          totalVerses: Math.floor(200 + Math.random() * 100), // Approximate verses per juz
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
        // Check if streak should be reset (missed a day)
        const lastRead = new Date(savedStreak.lastReadDate);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          // Streak broken, but keep longest streak
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
    if (streak.lastReadDate === today) return; // Already read today

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

  const addBookmark = async () => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      surah: `Al-Baqarah`, // Example - in real app, get from Quran API
      surahNumber: 2,
      ayah: Math.floor(Math.random() * 286) + 1,
      juz: selectedJuz,
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

  const completedJuz = juzProgress.filter(j => j.completed).length;
  const overallProgress = juzProgress.length > 0 ? (completedJuz / 30) * 100 : 0;
  const totalVersesRead = juzProgress.reduce((sum, j) => sum + (j.versesRead || 0), 0);

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

    // Update streak if completing (not uncompleting)
    const wasCompleted = juzProgress.find(j => j.juz === juzNumber)?.completed;
    if (!wasCompleted) {
      await updateStreak();
    }

    // Update current Juz to the next incomplete one
    const nextIncomplete = updatedProgress.find(j => !j.completed);
    if (nextIncomplete) {
      setReadingPlan(prev => ({ ...prev, currentJuz: nextIncomplete.juz }));
    }

    // Save to Convex if user is logged in
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

        // Save daily progress
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

  // Reading mode functions
  const startReading = (withLockIn: boolean) => {
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
    setIsReadingMode(true);
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

    // Update streak when completing
    if (isComplete && !dailyObjective.completed) {
      await updateStreak();
      Alert.alert(
        "🎉 Masha'Allah!",
        `You've completed your daily goal of ${dailyObjective.versesTarget} verses!`,
        [{ text: "Alhamdulillah", style: "default" }]
      );
    }
  };

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

        {!dailyObjective.completed ? (
          <TouchableOpacity 
            style={styles.startReadingButton}
            onPress={() => setShowSetObjectiveModal(true)}
          >
            <Ionicons name="play" size={24} color="#FFF" />
            <Text style={styles.startReadingButtonText}>
              {dailyObjective.versesRead > 0 ? "Continue Reading" : "Start Reading"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.completedBadgeText}>Goal Completed!</Text>
          </View>
        )}
      </View>

      {/* Surah Selection */}
      <View style={styles.surahSection}>
        <Text style={styles.surahSectionTitle}>Select Surah to Read</Text>
        {Object.entries(SURAH_NAMES).map(([num, surah]) => (
          <TouchableOpacity
            key={num}
            style={styles.surahItem}
            onPress={() => {
              setCurrentSurah(Number(num));
              setShowSetObjectiveModal(true);
            }}
          >
            <View style={styles.surahItemNumber}>
              <Text style={styles.surahItemNumberText}>{num}</Text>
            </View>
            <View style={styles.surahItemInfo}>
              <Text style={styles.surahItemArabic}>{surah.arabic}</Text>
              <Text style={styles.surahItemEnglish}>{surah.english}</Text>
            </View>
            <View style={styles.surahItemVerses}>
              <Text style={styles.surahItemVersesText}>{surah.versesCount} verses</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Focus Mode Explanation */}
      <View style={styles.focusModeCard}>
        <View style={styles.focusModeHeader}>
          <Ionicons name="lock-closed" size={24} color={colors.secondary} />
          <Text style={styles.focusModeTitle}>Focus Mode</Text>
        </View>
        <Text style={styles.focusModeDescription}>
          Enable Focus Mode to commit to your reading goal. Once enabled, you won't be able to leave until you complete your objective. This helps build consistency and dedication in your Quran reading journey.
        </Text>
        <View style={styles.focusModeQuote}>
          <Text style={styles.focusModeQuoteText}>
            "The best among you are those who learn the Quran and teach it."
          </Text>
          <Text style={styles.focusModeQuoteSource}>— Prophet Muhammad ﷺ (Sahih Bukhari)</Text>
        </View>
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="book" size={48} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
          <Text style={styles.loadingText}>Loading Quran progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Juz Details</Text>
      {juzProgress.slice(0, 10).map((juz) => (
        <TouchableOpacity
          key={juz.juz}
          style={[styles.juzCard, juz.completed && styles.completedJuzCard]}
          onPress={() => toggleJuzCompleted(juz.juz)}
          disabled={saving}
        >
          <View style={styles.juzCardLeft}>
            <View style={[styles.juzNumber, juz.completed && styles.juzNumberCompleted]}>
              <Text style={[styles.juzNumberText, juz.completed && styles.juzNumberTextCompleted]}>{juz.juz}</Text>
            </View>
            <View style={styles.juzInfo}>
              <Text style={styles.juzName}>{juz.name}</Text>
              <Text style={styles.juzArabic}>{juz.arabicName}</Text>
            </View>
          </View>
          <View style={styles.juzCardRight}>
            {juz.completed ? (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            ) : (
              <Ionicons name="radio-button-off" size={24} color={colors.textMuted} />
            )}
          </View>
        </TouchableOpacity>
      ))}
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
          <View key={bookmark.id} style={styles.bookmarkCard}>
            <View style={styles.bookmarkIcon}>
              <Ionicons name="bookmark" size={24} color={colors.secondary} />
            </View>
            <View style={styles.bookmarkInfo}>
              <Text style={styles.bookmarkSurah}>{bookmark.surah}</Text>
              <Text style={styles.bookmarkAyah}>Ayah {bookmark.ayah} • Juz {bookmark.juz}</Text>
              {bookmark.note && (
                <Text style={styles.bookmarkNote}>{bookmark.note}</Text>
              )}
              <Text style={styles.bookmarkDate}>
                {new Date(bookmark.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.removeBookmark}
              onPress={() => removeBookmark(bookmark.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}

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
            
            <Text style={styles.modalLabel}>Select Juz</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.juzSelector}>
              {Array.from({ length: 30 }, (_, i) => (
                <TouchableOpacity
                  key={i + 1}
                  style={[styles.juzSelectItem, selectedJuz === i + 1 && styles.juzSelectItemActive]}
                  onPress={() => setSelectedJuz(i + 1)}
                >
                  <Text style={[styles.juzSelectText, selectedJuz === i + 1 && styles.juzSelectTextActive]}>
                    {i + 1}
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
    </>
  );

  const renderStreaksTab = () => (
    <>
      {/* Streak Hero */}
      <View style={styles.streakHero}>
        <View style={styles.streakFireContainer}>
          <Ionicons name="flame" size={64} color={colors.secondary} />
        </View>
        <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>

      {/* Streak Stats */}
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

      {/* Weekly Progress */}
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

      {/* Motivation */}
      <View style={styles.motivationCard}>
        <Ionicons name="sparkles" size={24} color={colors.secondary} />
        <Text style={styles.motivationText}>
          "The best of you are those who learn the Quran and teach it."
        </Text>
        <Text style={styles.motivationSource}>— Prophet Muhammad ﷺ</Text>
      </View>

      {/* Reading Tips */}
      <Text style={styles.sectionTitle}>Tips to Keep Your Streak</Text>
      {[
        { icon: "alarm", title: "Set Daily Reminders", desc: "Read at the same time each day" },
        { icon: "location", title: "Create a Quiet Space", desc: "Find a peaceful reading spot" },
        { icon: "people", title: "Read with Others", desc: "Join a reading circle or group" },
        { icon: "headset", title: "Listen & Recite", desc: "Use audio to improve tajweed" },
      ].map((tip, index) => (
        <View key={index} style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name={tip.icon as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.tipInfo}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDesc}>{tip.desc}</Text>
          </View>
        </View>
      ))}
    </>
  );

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
          style={[styles.tab, activeTab === "progress" && styles.activeTab]}
          onPress={() => setActiveTab("progress")}
        >
          <Ionicons 
            name="stats-chart-outline" 
            size={20} 
            color={activeTab === "progress" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "progress" && styles.activeTabText]}>
            Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === "reading" && styles.activeTab]}
          onPress={() => setActiveTab("reading")}
        >
          <Ionicons 
            name="book-outline" 
            size={20} 
            color={activeTab === "reading" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "reading" && styles.activeTabText]}>
            Read
          </Text>
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
          <Text style={[styles.tabText, activeTab === "bookmarks" && styles.activeTabText]}>
            Bookmarks
          </Text>
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
          <Text style={[styles.tabText, activeTab === "streaks" && styles.activeTabText]}>
            Streaks
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "progress" && renderProgressTab()}
        {activeTab === "reading" && renderReadingTab()}
        {activeTab === "bookmarks" && renderBookmarksTab()}
        {activeTab === "streaks" && renderStreaksTab()}
      </ScrollView>

      {/* Reading Mode Modal */}
      <Modal
        visible={isReadingMode}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (dailyObjective.lockedIn && !dailyObjective.completed) {
            Alert.alert(
              "📖 Stay Focused",
              `You've committed to reading ${dailyObjective.versesTarget} verses. You've read ${dailyObjective.versesRead} so far. Complete your goal to exit.`,
              [{ text: "Continue Reading", style: "default" }]
            );
          } else {
            setIsReadingMode(false);
          }
        }}
      >
        <SafeAreaView style={styles.readingModeContainer}>
          <View style={styles.readingModeHeader}>
            <TouchableOpacity 
              onPress={() => {
                if (dailyObjective.lockedIn && !dailyObjective.completed) {
                  Alert.alert(
                    "📖 Stay Focused",
                    `You've committed to reading ${dailyObjective.versesTarget} verses. You've read ${dailyObjective.versesRead} so far.`,
                    [{ text: "Continue", style: "default" }]
                  );
                } else {
                  setIsReadingMode(false);
                }
              }}
            >
              <Ionicons 
                name={dailyObjective.lockedIn && !dailyObjective.completed ? "lock-closed" : "close"} 
                size={28} 
                color={dailyObjective.lockedIn && !dailyObjective.completed ? colors.secondary : colors.text} 
              />
            </TouchableOpacity>
            <View style={styles.readingModeTitle}>
              <Text style={styles.readingModeSurah}>
                {SURAH_NAMES[currentSurah]?.arabic || "الفاتحة"} • {SURAH_NAMES[currentSurah]?.english || "Al-Fatiha"}
              </Text>
            </View>
            <View style={styles.readingProgress}>
              <Text style={styles.readingProgressText}>
                {dailyObjective.versesRead}/{dailyObjective.versesTarget}
              </Text>
            </View>
          </View>

          {dailyObjective.lockedIn && !dailyObjective.completed && (
            <View style={styles.lockInBanner}>
              <Ionicons name="lock-closed" size={16} color="#FFF" />
              <Text style={styles.lockInBannerText}>
                Focus Mode: Read {dailyObjective.versesTarget - dailyObjective.versesRead} more verses to unlock
              </Text>
            </View>
          )}

          <View style={styles.readingProgressBar}>
            <View 
              style={[
                styles.readingProgressFill, 
                { width: `${Math.min((dailyObjective.versesRead / dailyObjective.versesTarget) * 100, 100)}%` }
              ]} 
            />
          </View>

          <ScrollView style={styles.versesContainer}>
            {(QURAN_VERSES[currentSurah] || []).map((verse) => (
              <TouchableOpacity
                key={verse.number}
                style={[
                  styles.verseCard,
                  verse.number <= dailyObjective.versesRead && styles.verseCardRead
                ]}
                onPress={() => markVerseRead(verse.number)}
              >
                <View style={styles.verseNumber}>
                  <Text style={styles.verseNumberText}>{verse.number}</Text>
                </View>
                <View style={styles.verseContent}>
                  <Text style={styles.verseArabic}>{verse.arabic}</Text>
                  <Text style={styles.verseTransliteration}>{verse.transliteration}</Text>
                  <Text style={styles.verseTranslation}>{verse.translation}</Text>
                </View>
                {verse.number <= dailyObjective.versesRead && (
                  <View style={styles.verseReadCheck}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            <View style={styles.surahNavigation}>
              <TouchableOpacity 
                style={styles.surahNavButton}
                onPress={() => currentSurah > 1 && setCurrentSurah(currentSurah - 1)}
                disabled={currentSurah <= 1}
              >
                <Ionicons name="chevron-back" size={24} color={currentSurah > 1 ? colors.primary : colors.textMuted} />
                <Text style={[styles.surahNavText, currentSurah <= 1 && { color: colors.textMuted }]}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.surahNavButton}
                onPress={() => currentSurah < 2 && setCurrentSurah(currentSurah + 1)}
                disabled={currentSurah >= 2}
              >
                <Text style={[styles.surahNavText, currentSurah >= 2 && { color: colors.textMuted }]}>Next</Text>
                <Ionicons name="chevron-forward" size={24} color={currentSurah < 2 ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {dailyObjective.completed && (
            <View style={styles.completionBanner}>
              <Ionicons name="trophy" size={24} color="#FFF" />
              <Text style={styles.completionText}>
                Masha'Allah! You've completed your daily goal! 🎉
              </Text>
              <TouchableOpacity 
                style={styles.exitButton}
                onPress={() => setIsReadingMode(false)}
              >
                <Text style={styles.exitButtonText}>Exit Reading</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
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
                  ]}>
                    {count}
                  </Text>
                  <Text style={styles.objectiveOptionLabel}>verses</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.lockInButton}
              onPress={() => {
                setShowLockInConfirm(true);
              }}
            >
              <Ionicons name="lock-closed" size={20} color="#FFF" />
              <Text style={styles.lockInButtonText}>Start with Focus Mode</Text>
            </TouchableOpacity>
            
            <Text style={styles.lockInDescription}>
              Focus Mode locks you in until you complete your goal. Stay committed to your reading!
            </Text>

            <View style={styles.objectiveButtons}>
              <TouchableOpacity 
                style={styles.objectiveCancelButton}
                onPress={() => setShowSetObjectiveModal(false)}
              >
                <Text style={styles.objectiveCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.objectiveStartButton}
                onPress={() => startReading(false)}
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
              You're committing to read {dailyObjective.versesTarget} verses. You won't be able to exit until you complete your goal.
            </Text>
            <Text style={styles.lockInConfirmQuote}>
              "Whoever reads a letter from the Book of Allah will have a reward..." - Prophet Muhammad ﷺ
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
                  startReading(true);
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
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  // Tab Bar
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
  // Hero Card
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.lg,
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroJuz: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  heroArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.medium,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroVerses: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  heroButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
  },
  heroButtonCompleted: {
    backgroundColor: colors.success,
  },
  heroButtonText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
    marginTop: spacing.xxs,
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
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  progressStatItem: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  progressStatValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  progressStatLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  // Section Title
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  savingText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  // Juz Grid
  juzGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  juzGridItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },
  juzGridItemCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  juzGridItemCurrent: {
    borderColor: colors.secondary,
    borderWidth: 3,
  },
  juzGridNumber: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  juzGridNumberCompleted: {
    color: colors.textOnPrimary,
  },
  juzGridCheck: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  // Juz Card
  juzCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  completedJuzCard: {
    backgroundColor: colors.success + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  juzCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  juzNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  juzNumberCompleted: {
    backgroundColor: colors.success,
  },
  juzNumberText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  juzNumberTextCompleted: {
    color: colors.textOnPrimary,
  },
  juzInfo: {
    flex: 1,
  },
  juzName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  juzArabic: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  juzCardRight: {
    justifyContent: "center",
  },
  completedBadge: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  // Bookmark Styles
  bookmarkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addBookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bookmarkCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    ...shadows.sm,
  },
  bookmarkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkSurah: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  bookmarkAyah: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bookmarkNote: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  bookmarkDate: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  removeBookmark: {
    padding: spacing.sm,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  juzSelector: {
    marginBottom: spacing.lg,
  },
  juzSelectItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  juzSelectItemActive: {
    backgroundColor: colors.primary,
  },
  juzSelectText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  juzSelectTextActive: {
    color: colors.textOnPrimary,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  // Streak Styles
  streakHero: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  streakFireContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  streakNumber: {
    fontSize: 64,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  streakLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.medium,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  streakStatsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  streakStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.sm,
  },
  streakStatValue: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  streakStatLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  weeklyProgressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  weeklyProgressTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  weeklyDots: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weeklyDotContainer: {
    alignItems: "center",
  },
  weeklyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  weeklyDotActive: {
    backgroundColor: colors.success,
  },
  weeklyDotToday: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  weeklyDotLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  weeklyDotLabelToday: {
    color: colors.primary,
    fontFamily: typography.fonts.bold,
  },
  motivationCard: {
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    marginBottom: spacing.lg,
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
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  tipInfo: {
    flex: 1,
  },
  tipTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  tipDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
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

  // Reading Tab Styles
  readingHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
    ...shadows.md,
  },
  readingHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  readingHeroTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  readingHeroSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  readingHeroProgress: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  readingHeroProgressBar: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  readingHeroProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  readingHeroProgressText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  startReadingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  startReadingButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "15",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  completedBadgeText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.success,
  },
  surahSection: {
    marginBottom: spacing.lg,
  },
  surahSectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  surahItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  surahItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  surahItemNumberText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  surahItemInfo: {
    flex: 1,
  },
  surahItemArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  surahItemEnglish: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  surahItemVerses: {
    marginRight: spacing.sm,
  },
  surahItemVersesText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  focusModeCard: {
    backgroundColor: colors.secondary + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  focusModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  focusModeTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  focusModeDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: typography.sizes.sm * 1.6,
    marginBottom: spacing.md,
  },
  focusModeQuote: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  focusModeQuoteText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  focusModeQuoteSource: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },

  // Reading Mode Modal Styles
  readingModeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  readingModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readingModeTitle: {
    flex: 1,
    alignItems: "center",
  },
  readingModeSurah: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  readingProgress: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  readingProgressText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  lockInBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  lockInBannerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: "#FFF",
  },
  readingProgressBar: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
  },
  readingProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  versesContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  verseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    ...shadows.sm,
  },
  verseCardRead: {
    backgroundColor: colors.success + "10",
    borderColor: colors.success,
    borderWidth: 1,
  },
  verseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  verseNumberText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
  },
  verseContent: {
    flex: 1,
  },
  verseArabic: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "right",
    lineHeight: typography.sizes.xl * 2,
    marginBottom: spacing.md,
  },
  verseTransliteration: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.secondary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  verseTranslation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * 1.6,
  },
  verseReadCheck: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },
  surahNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  surahNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  surahNavText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  completionBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.success,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  completionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
    textAlign: "center",
  },
  exitButton: {
    backgroundColor: "#FFF",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  exitButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.success,
  },

  // Objective Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  objectiveModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  objectiveModalTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  objectiveModalSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  objectiveOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  objectiveOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xxs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  objectiveOptionActive: {
    backgroundColor: colors.primary,
  },
  objectiveOptionText: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  objectiveOptionTextActive: {
    color: "#FFF",
  },
  objectiveOptionLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  lockInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lockInButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },
  lockInDescription: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  objectiveButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  objectiveCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  objectiveCancelText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  objectiveStartButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  objectiveStartText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },

  // Lock-in Confirmation Modal
  lockInConfirmModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  lockInConfirmTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  lockInConfirmText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: typography.sizes.sm * 1.5,
  },
  lockInConfirmQuote: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.secondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  lockInConfirmButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  lockInConfirmCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  lockInConfirmCancelText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  lockInConfirmStart: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    gap: spacing.xs,
  },
  lockInConfirmStartText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },
});