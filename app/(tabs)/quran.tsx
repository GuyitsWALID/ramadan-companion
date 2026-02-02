import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Animated } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

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

type TabType = "progress" | "bookmarks" | "streaks";

const JUZ_PROGRESS_KEY = "@ramadan_juz_progress";
const BOOKMARKS_KEY = "@ramadan_quran_bookmarks";
const STREAK_KEY = "@ramadan_reading_streak";

// Juz names in Arabic (simplified)
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("progress");
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [selectedJuz, setSelectedJuz] = useState(1);
  
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

  // Load saved progress from AsyncStorage
  useEffect(() => {
    loadProgress();
    loadBookmarks();
    loadStreak();
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
            name="book-outline" 
            size={20} 
            color={activeTab === "progress" ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === "progress" && styles.activeTabText]}>
            Progress
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
        {activeTab === "bookmarks" && renderBookmarksTab()}
        {activeTab === "streaks" && renderStreaksTab()}
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
});