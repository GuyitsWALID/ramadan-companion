import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Share,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTheme } from "../context/ThemeContext";
import { typography, spacing, borderRadius } from "../constants/theme";
import {
  SURAHS,
  RECITERS,
  SurahInfo,
  Reciter,
} from "../utils/quranData";
import {
  fetchSurahArabic,
  fetchSurahWithTranslation,
  fetchSurahAudio,
  saveLastRead,
  searchSurahs,
  SurahContent,
} from "../utils/quranService";

// ─── Types ───────────────────────────────────────────────────────────
type ViewMode = "verse" | "reading";
type SidebarTab = "surah" | "juz" | "verse" | "page";

interface QuranReaderProps {
  visible: boolean;
  onClose: () => void;
  initialSurah?: number;
  selectedReciter: Reciter;
  onReciterPress: () => void;
  onVerseRead?: (verseNumber: number) => void;
}

// ─── Constants ──────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.82;

const JUZ_DATA: { juz: number; name: string; startSurah: number; startVerse: number }[] = [
  { juz: 1, name: "الم", startSurah: 1, startVerse: 1 },
  { juz: 2, name: "سيقول", startSurah: 2, startVerse: 142 },
  { juz: 3, name: "تلك الرسل", startSurah: 2, startVerse: 253 },
  { juz: 4, name: "لن تنالوا", startSurah: 3, startVerse: 92 },
  { juz: 5, name: "والمحصنات", startSurah: 4, startVerse: 24 },
  { juz: 6, name: "لا يحب الله", startSurah: 4, startVerse: 148 },
  { juz: 7, name: "وإذا سمعوا", startSurah: 5, startVerse: 82 },
  { juz: 8, name: "ولو أننا", startSurah: 6, startVerse: 111 },
  { juz: 9, name: "قال الملأ", startSurah: 7, startVerse: 88 },
  { juz: 10, name: "واعلموا", startSurah: 8, startVerse: 41 },
  { juz: 11, name: "يعتذرون", startSurah: 9, startVerse: 93 },
  { juz: 12, name: "وما من دابة", startSurah: 11, startVerse: 6 },
  { juz: 13, name: "وما أبرئ", startSurah: 12, startVerse: 53 },
  { juz: 14, name: "ربما", startSurah: 15, startVerse: 1 },
  { juz: 15, name: "سبحان", startSurah: 17, startVerse: 1 },
  { juz: 16, name: "قال ألم", startSurah: 18, startVerse: 75 },
  { juz: 17, name: "اقترب", startSurah: 21, startVerse: 1 },
  { juz: 18, name: "قد أفلح", startSurah: 23, startVerse: 1 },
  { juz: 19, name: "وقال الذين", startSurah: 25, startVerse: 21 },
  { juz: 20, name: "أمن خلق", startSurah: 27, startVerse: 56 },
  { juz: 21, name: "اتل ما أوحي", startSurah: 29, startVerse: 45 },
  { juz: 22, name: "ومن يقنت", startSurah: 33, startVerse: 31 },
  { juz: 23, name: "وما لي", startSurah: 36, startVerse: 28 },
  { juz: 24, name: "فمن أظلم", startSurah: 39, startVerse: 32 },
  { juz: 25, name: "إليه يرد", startSurah: 41, startVerse: 47 },
  { juz: 26, name: "حم", startSurah: 46, startVerse: 1 },
  { juz: 27, name: "قال فما خطبكم", startSurah: 51, startVerse: 31 },
  { juz: 28, name: "قد سمع", startSurah: 58, startVerse: 1 },
  { juz: 29, name: "تبارك", startSurah: 67, startVerse: 1 },
  { juz: 30, name: "عم", startSurah: 78, startVerse: 1 },
];

// Approximate Quran pages (604 total), mapping page → surah+verse
// Simplified: just estimate page from surah/verse position
const TOTAL_PAGES = 604;

// ─── Verse number marker (circular end-stop) ───────────────────────
function VerseEndMarker({ number, colors }: { number: number; colors: any }) {
  return (
    <Text style={{ color: colors.primary, fontSize: 18 }}>
      {" ﴿"}{convertToArabicNumeral(number)}{"﴾ "}
    </Text>
  );
}

function convertToArabicNumeral(num: number): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return num
    .toString()
    .split("")
    .map((d) => arabicNumerals[parseInt(d)])
    .join("");
}

/**
 * Normalize Arabic text for comparison: strip diacritics and unify alef variants.
 */
function normalizeArabic(text: string): string {
  return text
    // Remove diacritics (tashkeel, maddah, hamza marks, etc.)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A\u08D3-\u08E1\u08E3-\u08FF\u0653]/g, "")
    // Normalize alef variants (wasla ٱ, madda آ, hamza above أ, hamza below إ) → bare alef ا
    .replace(/[\u0671\u0622\u0623\u0625]/g, "\u0627");
}

/**
 * Extract the Bismillah portion from verse 1 text.
 * Returns { bismillah, rest } where bismillah is the "بسم الله الرحمن الرحيم" part
 * and rest is whatever follows (e.g. "الم" for Al-Baqarah).
 */
function splitBismillah(text: string, verseNum: number): { bismillah: string; rest: string } {
  if (verseNum !== 1) return { bismillah: "", rest: text };
  const plain = normalizeArabic(text);
  // Look for الرحيم (normalized base letters) which ends the Bismillah
  const marker = "\u0627\u0644\u0631\u062D\u064A\u0645"; // الرحيم
  const idx = plain.indexOf(marker);
  if (idx !== -1 && idx < 80) {
    // Map the position back to the original text.
    // Walk through original, counting non-removed chars to find where marker ends.
    const targetPlainPos = idx + marker.length;
    let plainPos = 0;
    let origEnd = 0;
    const diacriticRe = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A\u08D3-\u08E1\u08E3-\u08FF\u0653]/;
    for (let i = 0; i < text.length; i++) {
      if (!diacriticRe.test(text[i])) {
        plainPos++;
      }
      if (plainPos === targetPlainPos) {
        origEnd = i + 1;
        break;
      }
    }
    // Skip any trailing diacritics
    while (origEnd < text.length && diacriticRe.test(text[origEnd])) {
      origEnd++;
    }
    const bism = text.slice(0, origEnd).trim();
    const rest = text.slice(origEnd).trim();
    return { bismillah: bism, rest };
  }
  return { bismillah: "", rest: text };
}

// ─── Component ──────────────────────────────────────────────────────
export default function QuranReader({
  visible,
  onClose,
  initialSurah = 1,
  selectedReciter,
  onReciterPress,
  onVerseRead,
}: QuranReaderProps) {
  const { colors, shadows } = useTheme();
  const styles = getStyles(colors, shadows);

  // Core state
  const [currentSurah, setCurrentSurah] = useState(initialSurah);
  const [surahContent, setSurahContent] = useState<SurahContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("verse");
  const [showTranslation, setShowTranslation] = useState(true);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("surah");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // Audio
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const [audioData, setAudioData] = useState<{ number: number; audio: string }[]>([]);
  const [playingFullSurah, setPlayingFullSurah] = useState(false);
  const playingVerseRef = useRef<number | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const toastAnim = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView>(null);

  // ─── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (visible && initialSurah) {
      setCurrentSurah(initialSurah);
      loadSurah(initialSurah);
    }
  }, [visible, initialSurah]);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  // Keep ref in sync
  useEffect(() => {
    playingVerseRef.current = playingVerse;
  }, [playingVerse]);

  // ─── Sidebar animation ────────────────────────────────────────
  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  };

  // ─── Data loading ─────────────────────────────────────────────
  const loadSurah = async (num: number) => {
    setLoading(true);
    try {
      const content = showTranslation
        ? await fetchSurahWithTranslation(num)
        : await fetchSurahArabic(num);
      if (content) {
        setSurahContent(content);
        await saveLastRead(num, 1);
      }
      // Pre-load audio
      const audio = await fetchSurahAudio(num, selectedReciter.identifier);
      if (audio) setAudioData(audio.verses);
    } catch (e) {
      console.error("Error loading surah:", e);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSurah = (num: number) => {
    setCurrentSurah(num);
    loadSurah(num);
    closeSidebar();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const navigateToJuz = (juz: typeof JUZ_DATA[0]) => {
    navigateToSurah(juz.startSurah);
  };

  // ─── Audio ────────────────────────────────────────────────────
  const playVerse = async (verseNum: number) => {
    const data = audioData.find((v) => v.number === verseNum);
    if (!data?.audio) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: data.audio },
        { shouldPlay: true },
        (status: any) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            if (playingFullSurah && surahContent) {
              const next = (playingVerseRef.current || 0) + 1;
              if (next <= surahContent.numberOfAyahs) {
                setTimeout(() => playVerse(next), 300);
              } else {
                setPlayingFullSurah(false);
                setPlayingVerse(null);
              }
            } else {
              setPlayingVerse(null);
            }
          }
        }
      );
      setSound(s);
      setIsPlaying(true);
      setPlayingVerse(verseNum);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const playFullSurah = async () => {
    if (playingFullSurah) {
      // Stop
      await stopAudio();
      setPlayingFullSurah(false);
      return;
    }
    setPlayingFullSurah(true);
    playVerse(1);
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPlayingVerse(null);
    setPlayingFullSurah(false);
  };

  // ─── Copy & Share ─────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const copyVerse = async (arabic: string, translation?: string, verseNum?: number) => {
    const surahName = surahContent?.englishName || "";
    let text = arabic;
    if (translation) text += `\n\n${translation}`;
    text += `\n\n— ${surahName} ${verseNum ? `(${currentSurah}:${verseNum})` : ""}`;
    await Clipboard.setStringAsync(text);
    showToast("Verse copied!");
  };

  const shareVerse = async (arabic: string, translation?: string, verseNum?: number) => {
    const surahName = surahContent?.englishName || "";
    let text = arabic;
    if (translation) text += `\n\n${translation}`;
    text += `\n\n— ${surahName} (${currentSurah}:${verseNum})`;
    try {
      await Share.share({ message: text });
    } catch (e) {}
  };

  // ─── Filtered sidebar data ───────────────────────────────────
  const filteredSurahs = sidebarSearch.trim()
    ? searchSurahs(sidebarSearch)
    : SURAHS;

  const filteredJuz = sidebarSearch.trim()
    ? JUZ_DATA.filter(
        (j) =>
          j.name.includes(sidebarSearch) ||
          j.juz.toString().includes(sidebarSearch)
      )
    : JUZ_DATA;

  // ─── Surah navigation ────────────────────────────────────────
  const goToNextSurah = () => {
    if (currentSurah < 114) navigateToSurah(currentSurah + 1);
  };
  const goToPrevSurah = () => {
    if (currentSurah > 1) navigateToSurah(currentSurah - 1);
  };

  // ─── Render: Sidebar ─────────────────────────────────────────
  const renderSidebar = () => (
    <>
      {sidebarOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sidebarOverlay}
          onPress={closeSidebar}
        />
      )}
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: sidebarAnim }] },
        ]}
      >
        {/* Sidebar header */}
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>
            {currentSurah}. {SURAHS[currentSurah - 1]?.englishName}
          </Text>
          <TouchableOpacity onPress={closeSidebar}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Sidebar tabs */}
        <View style={styles.sidebarTabs}>
          {(["surah", "verse", "juz", "page"] as SidebarTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.sidebarTabBtn,
                sidebarTab === tab && styles.sidebarTabBtnActive,
              ]}
              onPress={() => setSidebarTab(tab)}
            >
              <Text
                style={[
                  styles.sidebarTabText,
                  sidebarTab === tab && styles.sidebarTabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.sidebarSearch}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.sidebarSearchInput}
            placeholder={`Search ${sidebarTab}...`}
            placeholderTextColor={colors.textMuted}
            value={sidebarSearch}
            onChangeText={setSidebarSearch}
          />
          {sidebarSearch.length > 0 && (
            <TouchableOpacity onPress={() => setSidebarSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sidebar content */}
        <FlatList<any>
          data={
            sidebarTab === "surah"
              ? filteredSurahs
              : sidebarTab === "juz"
              ? filteredJuz
              : sidebarTab === "verse" && surahContent
              ? surahContent.verses
              : sidebarTab === "page"
              ? Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1)
              : []
          }
          keyExtractor={(item: any, i) =>
            sidebarTab === "surah"
              ? `s${item.number}`
              : sidebarTab === "juz"
              ? `j${item.juz}`
              : sidebarTab === "verse"
              ? `v${item.number}`
              : `p${item}`
          }
          renderItem={({ item }: any) => {
            if (sidebarTab === "surah") {
              const s = item as SurahInfo;
              const isActive = s.number === currentSurah;
              return (
                <TouchableOpacity
                  style={[
                    styles.sidebarItem,
                    isActive && styles.sidebarItemActive,
                  ]}
                  onPress={() => navigateToSurah(s.number)}
                >
                  <Text style={[styles.sidebarItemNum, isActive && styles.sidebarItemTextActive]}>
                    {s.number}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sidebarItemName, isActive && styles.sidebarItemTextActive]}>
                      {s.englishName}
                    </Text>
                    <Text style={styles.sidebarItemSub}>
                      {s.name} · {s.numberOfAyahs} ayahs
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (sidebarTab === "juz") {
              const j = item as typeof JUZ_DATA[0];
              return (
                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={() => navigateToJuz(j)}
                >
                  <Text style={styles.sidebarItemNum}>{j.juz}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarItemName}>Juz {j.juz}</Text>
                    <Text style={styles.sidebarItemSub}>{j.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (sidebarTab === "verse") {
              const v = item as { number: number; arabic: string };
              return (
                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={() => {
                    closeSidebar();
                    // Scroll to verse (approximate)
                  }}
                >
                  <Text style={styles.sidebarItemNum}>{v.number}</Text>
                  <Text
                    style={[styles.sidebarItemName, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {v.arabic.substring(0, 50)}...
                  </Text>
                </TouchableOpacity>
              );
            }
            if (sidebarTab === "page") {
              const page = item as number;
              return (
                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={() => {
                    // Rough mapping: page → surah
                    const approxSurah = Math.min(
                      114,
                      Math.max(1, Math.ceil((page / TOTAL_PAGES) * 114))
                    );
                    navigateToSurah(approxSurah);
                  }}
                >
                  <Text style={styles.sidebarItemNum}>{page}</Text>
                  <Text style={styles.sidebarItemName}>Page {page}</Text>
                </TouchableOpacity>
              );
            }
            return null;
          }}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </>
  );

  // ─── Render: Verse-by-Verse mode ─────────────────────────────
  const renderVerseByVerse = () => (
    <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Bismillah — use the actual text from verse 1 if available */}
      {(() => {
        const v1 = surahContent?.verses?.[0];
        const bism = v1 ? splitBismillah(v1.arabic, 1).bismillah : "";
        return bism ? <Text style={styles.bismillah}>{bism}</Text> : null;
      })()}

      {(surahContent?.verses || []).filter((v) => splitBismillah(v.arabic, v.number).rest.length > 0).map((verse) => (
        <View
          key={verse.number}
          style={[
            styles.verseCard,
            playingVerse === verse.number && styles.verseCardPlaying,
          ]}
        >
          {/* Verse header: number + actions */}
          <View style={styles.verseHeader}>
            <View style={styles.verseNumBadge}>
              <Text style={styles.verseNumText}>{currentSurah}:{verse.number}</Text>
            </View>
            <View style={styles.verseActions}>
              <TouchableOpacity
                style={styles.verseActionBtn}
                onPress={() => {
                  if (playingVerse === verse.number && isPlaying) {
                    stopAudio();
                  } else {
                    playVerse(verse.number);
                  }
                }}
              >
                <Ionicons
                  name={playingVerse === verse.number && isPlaying ? "pause" : "play"}
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.verseActionBtn}
                onPress={() => copyVerse(splitBismillah(verse.arabic, verse.number).rest, verse.translation, verse.number)}
              >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.verseActionBtn}
                onPress={() => shareVerse(splitBismillah(verse.arabic, verse.number).rest, verse.translation, verse.number)}
              >
                <Ionicons name="share-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Arabic text */}
          <Text style={styles.verseArabic}>{splitBismillah(verse.arabic, verse.number).rest}</Text>

          {/* Translation */}
          {showTranslation && verse.translation && (
            <Text style={styles.verseTranslation}>{verse.translation}</Text>
          )}
        </View>
      ))}

      {/* Prev / Next */}
      <View style={styles.surahNav}>
        <TouchableOpacity
          style={[styles.surahNavBtn, currentSurah <= 1 && { opacity: 0.4 }]}
          onPress={goToPrevSurah}
          disabled={currentSurah <= 1}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.surahNavText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.surahNavBtn, currentSurah >= 114 && { opacity: 0.4 }]}
          onPress={goToNextSurah}
          disabled={currentSurah >= 114}
        >
          <Text style={styles.surahNavText}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // ─── Render: Reading (Mushaf) mode ────────────────────────────
  const renderReadingMode = () => {
    const verses = surahContent?.verses || [];
    return (
      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Surah name header */}
        <View style={styles.mushafSurahHeader}>
          <Text style={styles.mushafSurahName}>{surahContent?.name}</Text>
          <Text style={styles.mushafSurahEnglish}>
            {currentSurah}. {surahContent?.englishName}
          </Text>
          <Text style={styles.mushafSurahMeaning}>
            {SURAHS[currentSurah - 1]?.englishNameTranslation}
          </Text>
        </View>

        {/* Bismillah — from verse 1's actual text */}
        {(() => {
          const v1 = surahContent?.verses?.[0];
          const bism = v1 ? splitBismillah(v1.arabic, 1).bismillah : "";
          return bism ? <Text style={styles.mushafBismillah}>{bism}</Text> : null;
        })()}

        {/* Continuous Arabic text */}
        <View style={styles.mushafTextContainer}>
          <Text style={styles.mushafText}>
            {verses.filter((v) => splitBismillah(v.arabic, v.number).rest.length > 0).map((v, i) => (
              <React.Fragment key={v.number}>
                <Text
                  style={[
                    playingVerse === v.number && { color: colors.primary, backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => {
                    onVerseRead?.(v.number);
                  }}
                >
                  {splitBismillah(v.arabic, v.number).rest}
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 20 }}>
                  {" ﴿"}{convertToArabicNumeral(v.number)}{"﴾ "}
                </Text>
              </React.Fragment>
            ))}
          </Text>
        </View>

        {/* Translation section (collapsible) */}
        {showTranslation && (
          <View style={styles.mushafTranslationSection}>
            <Text style={styles.mushafTranslationTitle}>Translation</Text>
            {verses.map((v) => (
              <View key={v.number} style={styles.mushafTranslationItem}>
                <Text style={styles.mushafTranslationNum}>{v.number}</Text>
                <Text style={styles.mushafTranslationText}>
                  {v.translation || "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Prev / Next */}
        <View style={styles.surahNav}>
          <TouchableOpacity
            style={[styles.surahNavBtn, currentSurah <= 1 && { opacity: 0.4 }]}
            onPress={goToPrevSurah}
            disabled={currentSurah <= 1}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text style={styles.surahNavText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.surahNavBtn, currentSurah >= 114 && { opacity: 0.4 }]}
            onPress={goToNextSurah}
            disabled={currentSurah >= 114}
          >
            <Text style={styles.surahNavText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // ─── Main render ──────────────────────────────────────────────
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ── Top Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} style={styles.headerBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openSidebar}
            style={styles.headerCenter}
          >
            <Text style={styles.headerSurah} numberOfLines={1}>
              {currentSurah}. {SURAHS[currentSurah - 1]?.englishName}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Mode toggles ──────────────────────────────────── */}
        <View style={styles.controlBar}>
          {/* View mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeToggleBtn,
                viewMode === "verse" && styles.modeToggleBtnActive,
              ]}
              onPress={() => setViewMode("verse")}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={viewMode === "verse" ? colors.textOnPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  viewMode === "verse" && styles.modeToggleTextActive,
                ]}
              >
                Verse by Verse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeToggleBtn,
                viewMode === "reading" && styles.modeToggleBtnActive,
              ]}
              onPress={() => setViewMode("reading")}
            >
              <Ionicons
                name="book-outline"
                size={16}
                color={viewMode === "reading" ? colors.textOnPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  viewMode === "reading" && styles.modeToggleTextActive,
                ]}
              >
                Reading
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right side controls */}
          <View style={styles.controlActions}>
            <TouchableOpacity
              style={[
                styles.controlChip,
                showTranslation && styles.controlChipActive,
              ]}
              onPress={() => {
                setShowTranslation(!showTranslation);
                // Reload surah with/without translation
                if (showTranslation) {
                  // switching to arabic only
                  fetchSurahArabic(currentSurah).then((c) => c && setSurahContent(c));
                } else {
                  fetchSurahWithTranslation(currentSurah).then((c) => c && setSurahContent(c));
                }
              }}
            >
              <Ionicons
                name="language-outline"
                size={16}
                color={showTranslation ? colors.textOnPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.controlChipText,
                  showTranslation && styles.controlChipTextActive,
                ]}
              >
                Translation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlIconBtn} onPress={onReciterPress}>
              <Ionicons name="headset-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={playFullSurah}
            >
              <Ionicons
                name={playingFullSurah ? "stop-circle" : "play-circle"}
                size={22}
                color={playingFullSurah ? colors.error : colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content ───────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading surah...</Text>
          </View>
        ) : viewMode === "verse" ? (
          renderVerseByVerse()
        ) : (
          renderReadingMode()
        )}

        {/* ── Audio player bar ──────────────────────────────── */}
        {isPlaying && playingVerse && (
          <View style={styles.audioBar}>
            <Ionicons name="musical-notes" size={18} color={colors.primary} />
            <Text style={styles.audioBarText} numberOfLines={1}>
              Verse {playingVerse} · {selectedReciter.englishName}
            </Text>
            <TouchableOpacity onPress={stopAudio}>
              <Ionicons name="stop-circle" size={30} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Toast ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>

        {/* ── Sidebar overlay + drawer ──────────────────────── */}
        {renderSidebar()}
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const getStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingTop: Platform.OS === "ios" ? 50 : spacing.sm,
    },
    headerBtn: { padding: spacing.xs },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
    },
    headerSurah: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.text,
    },

    // Control bar
    controlBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modeToggle: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: 3,
    },
    modeToggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    modeToggleBtnActive: {
      backgroundColor: colors.primary,
    },
    modeToggleText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.medium,
      color: colors.textMuted,
    },
    modeToggleTextActive: {
      color: colors.textOnPrimary,
      fontFamily: typography.fonts.semiBold,
    },
    controlActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    controlChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
    },
    controlChipActive: { backgroundColor: colors.primary },
    controlChipText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.medium,
      color: colors.textMuted,
    },
    controlChipTextActive: { color: colors.textOnPrimary },
    controlIconBtn: { padding: spacing.xs },

    // Loading
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
    },

    // ── Verse by verse ─────────────────────────────────────
    bismillah: {
      fontSize: 28,
      fontFamily: typography.fonts.arabicQuran,
      color: colors.primary,
      textAlign: "center",
      marginVertical: spacing.xl,
      lineHeight: 48,
    },
    verseCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    verseCardPlaying: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    verseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    verseNumBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary + "18",
    },
    verseNumText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bold,
      color: colors.primary,
    },
    verseActions: { flexDirection: "row", gap: spacing.xs },
    verseActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary + "15",
      justifyContent: "center",
      alignItems: "center",
    },
    verseArabic: {
      fontSize: 24,
      fontFamily: typography.fonts.arabicQuran,
      color: colors.text,
      textAlign: "right",
      lineHeight: 48,
      marginBottom: spacing.md,
    },
    verseTranslation: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 24,
    },

    // ── Mushaf / Reading mode ──────────────────────────────
    mushafSurahHeader: {
      alignItems: "center",
      paddingVertical: spacing.xl,
      marginHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.lg,
    },
    mushafSurahName: {
      fontSize: 36,
      fontFamily: typography.fonts.arabicQuran,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    mushafSurahEnglish: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.primary,
      marginBottom: 2,
    },
    mushafSurahMeaning: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
    },
    mushafBismillah: {
      fontSize: 30,
      fontFamily: typography.fonts.arabicQuran,
      color: colors.primary,
      textAlign: "center",
      marginBottom: spacing.xl,
      lineHeight: 52,
    },
    mushafTextContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    mushafText: {
      fontSize: 26,
      fontFamily: typography.fonts.arabicQuran,
      color: colors.text,
      textAlign: "center",
      lineHeight: 56,
      writingDirection: "rtl",
    },
    mushafTranslationSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mushafTranslationTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    mushafTranslationItem: {
      flexDirection: "row",
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    mushafTranslationNum: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bold,
      color: colors.primary,
      minWidth: 28,
    },
    mushafTranslationText: {
      flex: 1,
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 22,
    },

    // ── Surah navigation ───────────────────────────────────
    surahNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    surahNavBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    surahNavText: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.medium,
      color: colors.primary,
    },

    // ── Audio bar ──────────────────────────────────────────
    audioBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    audioBarText: {
      flex: 1,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.medium,
      color: colors.text,
    },

    // ── Toast ──────────────────────────────────────────────
    toast: {
      position: "absolute",
      bottom: 80,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.success,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    toastText: {
      color: "#fff",
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.medium,
    },

    // ── Sidebar ────────────────────────────────────────────
    sidebarOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      zIndex: 10,
    },
    sidebar: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.surface,
      zIndex: 11,
      paddingTop: Platform.OS === "ios" ? 50 : spacing.md,
      ...shadows.lg,
    },
    sidebarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sidebarTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.text,
    },
    sidebarTabs: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sidebarTabBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    sidebarTabBtnActive: { backgroundColor: colors.primary },
    sidebarTabText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.medium,
      color: colors.textMuted,
    },
    sidebarTabTextActive: {
      color: colors.textOnPrimary,
      fontFamily: typography.fonts.semiBold,
    },
    sidebarSearch: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
    },
    sidebarSearchInput: {
      flex: 1,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.regular,
      color: colors.text,
      paddingVertical: 4,
    },
    sidebarItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sidebarItemActive: { backgroundColor: colors.primary + "15" },
    sidebarItemNum: {
      width: 32,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bold,
      color: colors.primary,
    },
    sidebarItemName: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
    },
    sidebarItemTextActive: { color: colors.primary },
    sidebarItemSub: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
