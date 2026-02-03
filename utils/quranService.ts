import AsyncStorage from "@react-native-async-storage/async-storage";
import { QURAN_API, CACHE_KEYS, SURAHS, RECITERS, ReadingMode, Verse, SurahInfo, Reciter } from "./quranData";

export interface SurahContent {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  verses: Verse[];
}

interface ApiAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
  audioSecondary?: string[];
}

interface ApiSurahResponse {
  code: number;
  status: string;
  data: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
    ayahs: ApiAyah[];
  };
}

interface ApiEditionsResponse {
  code: number;
  status: string;
  data: Array<{
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
    ayahs: ApiAyah[];
    edition: {
      identifier: string;
      language: string;
      name: string;
      englishName: string;
      type: string;
    };
  }>;
}

// Fetch surah with Arabic text only
export async function fetchSurahArabic(surahNumber: number): Promise<SurahContent | null> {
  const cacheKey = `${CACHE_KEYS.surahData(surahNumber)}_arabic`;
  
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const response = await fetch(QURAN_API.surah(surahNumber));
    const data: ApiSurahResponse = await response.json();
    
    if (data.code !== 200) {
      throw new Error("Failed to fetch surah");
    }
    
    const surahContent: SurahContent = {
      number: data.data.number,
      name: data.data.name,
      englishName: data.data.englishName,
      englishNameTranslation: data.data.englishNameTranslation,
      revelationType: data.data.revelationType,
      numberOfAyahs: data.data.numberOfAyahs,
      verses: data.data.ayahs.map((ayah) => ({
        number: ayah.numberInSurah,
        arabic: ayah.text,
      })),
    };
    
    // Cache for offline use
    await AsyncStorage.setItem(cacheKey, JSON.stringify(surahContent));
    
    return surahContent;
  } catch (error) {
    console.error("Error fetching surah:", error);
    
    // Try to return cached data even if expired
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    
    return null;
  }
}

// Fetch surah with Arabic and English translation
export async function fetchSurahWithTranslation(
  surahNumber: number,
  translationEdition: string = "en.sahih"
): Promise<SurahContent | null> {
  const cacheKey = `${CACHE_KEYS.surahData(surahNumber)}_${translationEdition}`;
  
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const response = await fetch(QURAN_API.surahWithTranslation(surahNumber, translationEdition));
    const data: ApiEditionsResponse = await response.json();
    
    if (data.code !== 200 || !data.data || data.data.length < 2) {
      throw new Error("Failed to fetch surah with translation");
    }
    
    const arabicData = data.data[0];
    const translationData = data.data[1];
    
    const surahContent: SurahContent = {
      number: arabicData.number,
      name: arabicData.name,
      englishName: arabicData.englishName,
      englishNameTranslation: arabicData.englishNameTranslation,
      revelationType: arabicData.revelationType,
      numberOfAyahs: arabicData.numberOfAyahs,
      verses: arabicData.ayahs.map((ayah, index) => ({
        number: ayah.numberInSurah,
        arabic: ayah.text,
        translation: translationData.ayahs[index]?.text || "",
      })),
    };
    
    // Cache for offline use
    await AsyncStorage.setItem(cacheKey, JSON.stringify(surahContent));
    
    return surahContent;
  } catch (error) {
    console.error("Error fetching surah with translation:", error);
    
    // Try to return cached data
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    
    return null;
  }
}

// Fetch surah with audio recitation
export async function fetchSurahAudio(
  surahNumber: number,
  reciterId: string = "ar.alafasy"
): Promise<{ verses: { number: number; audio: string }[] } | null> {
  const cacheKey = CACHE_KEYS.surahAudio(surahNumber, reciterId);
  
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const response = await fetch(QURAN_API.audio(surahNumber, reciterId));
    const data: ApiSurahResponse = await response.json();
    
    if (data.code !== 200) {
      throw new Error("Failed to fetch audio");
    }
    
    const audioData = {
      verses: data.data.ayahs.map((ayah) => ({
        number: ayah.numberInSurah,
        audio: ayah.audio || "",
      })),
    };
    
    // Cache for offline use
    await AsyncStorage.setItem(cacheKey, JSON.stringify(audioData));
    
    return audioData;
  } catch (error) {
    console.error("Error fetching audio:", error);
    
    // Try to return cached data
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    
    return null;
  }
}

// Save last read position
export async function saveLastRead(surahNumber: number, verseNumber: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.lastRead,
      JSON.stringify({ surah: surahNumber, verse: verseNumber, timestamp: Date.now() })
    );
  } catch (error) {
    console.error("Error saving last read:", error);
  }
}

// Get last read position
export async function getLastRead(): Promise<{ surah: number; verse: number; timestamp: number } | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.lastRead);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error getting last read:", error);
  }
  return null;
}

// Save reading mode preference
export async function saveReadingMode(mode: ReadingMode): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.readingMode, mode);
  } catch (error) {
    console.error("Error saving reading mode:", error);
  }
}

// Get reading mode preference
export async function getReadingMode(): Promise<ReadingMode> {
  try {
    const mode = await AsyncStorage.getItem(CACHE_KEYS.readingMode);
    if (mode === "arabic" || mode === "translation") {
      return mode;
    }
  } catch (error) {
    console.error("Error getting reading mode:", error);
  }
  return "translation"; // Default
}

// Save selected reciter
export async function saveSelectedReciter(reciterId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.selectedReciter, reciterId);
  } catch (error) {
    console.error("Error saving reciter:", error);
  }
}

// Get selected reciter
export async function getSelectedReciter(): Promise<Reciter> {
  try {
    const reciterId = await AsyncStorage.getItem(CACHE_KEYS.selectedReciter);
    if (reciterId) {
      const reciter = RECITERS.find((r) => r.id === reciterId);
      if (reciter) return reciter;
    }
  } catch (error) {
    console.error("Error getting reciter:", error);
  }
  return RECITERS[0]; // Default to Mishary Rashid Alafasy
}

// Get surah info from local data
export function getSurahInfo(surahNumber: number): SurahInfo | undefined {
  return SURAHS.find((s) => s.number === surahNumber);
}

// Get all surahs
export function getAllSurahs(): SurahInfo[] {
  return SURAHS;
}

// Get surahs by Juz
export function getSurahsByJuz(juzNumber: number): SurahInfo[] {
  return SURAHS.filter((s) => s.juz.includes(juzNumber));
}

// Search surahs by name
export function searchSurahs(query: string): SurahInfo[] {
  const lowerQuery = query.toLowerCase();
  return SURAHS.filter(
    (s) =>
      s.name.includes(query) ||
      s.englishName.toLowerCase().includes(lowerQuery) ||
      s.englishNameTranslation.toLowerCase().includes(lowerQuery)
  );
}

// Get total verse count
export function getTotalVerseCount(): number {
  return SURAHS.reduce((total, surah) => total + surah.numberOfAyahs, 0);
}
