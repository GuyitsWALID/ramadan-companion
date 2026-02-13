import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Dimensions, Linking, Alert } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { XMLParser } from "fast-xml-parser";
import { API_CONFIG } from "../../constants/api";
import { useTheme } from "../../context/ThemeContext";
import { typography, spacing, borderRadius } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ContentItem {
  id: string;
  title: string;
  type: "article" | "video" | "podcast" | "hadith" | "dua";
  excerpt: string;
  author: string;
  readTime?: string;
  duration?: string;
  imageUrl?: string;
  category: string;
  tags: string[];
  publishedAt: string;
  featured?: boolean;
  content?: string;
  source?: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  views: string;
  publishedAt: string;
  category: "lecture" | "recitation" | "nasheed" | "documentary";
}

interface QuranVerse {
  id: string;
  surahNumber: number;
  surahName: string;
  surahNameArabic: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  transliteration: string;
  tafsir?: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorImage?: string;
  coverImage: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  category: string;
}

interface Hadith {
  id: string;
  arabic: string;
  english: string;
  narrator: string;
  source: string;
  book: string;
  number: string;
}

interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  occasion: string;
  benefits: string[];
}

const STORAGE_KEY_SAVED = "@ramadan_saved_content";

// Daily YouTube Video Recommendations
const dailyYouTubeVideos: YouTubeVideo[] = [
  {
    id: "yt1",
    title: "The Power of Tahajjud Prayer",
    channelName: "Islamic Guidance",
    duration: "12:45",
    thumbnailUrl: "https://picsum.photos/seed/tahajjud/320/180",
    videoUrl: "https://www.youtube.com/watch?v=tahajjud",
    views: "1.2M",
    publishedAt: "2025-01-15",
    category: "lecture",
  },
  {
    id: "yt2",
    title: "Beautiful Quran Recitation - Surah Ar-Rahman",
    channelName: "Quran Academy",
    duration: "18:30",
    thumbnailUrl: "https://picsum.photos/seed/rahman/320/180",
    videoUrl: "https://www.youtube.com/watch?v=arrahman",
    views: "5.6M",
    publishedAt: "2025-01-14",
    category: "recitation",
  },
  {
    id: "yt3",
    title: "How to Make the Most of Ramadan",
    channelName: "Yaqeen Institute",
    duration: "25:00",
    thumbnailUrl: "https://picsum.photos/seed/ramadan2/320/180",
    videoUrl: "https://www.youtube.com/watch?v=ramadan",
    views: "890K",
    publishedAt: "2025-01-13",
    category: "lecture",
  },
  {
    id: "yt4",
    title: "Stories of the Prophets - Ibrahim (AS)",
    channelName: "FreeQuranEducation",
    duration: "45:20",
    thumbnailUrl: "https://picsum.photos/seed/ibrahim/320/180",
    videoUrl: "https://www.youtube.com/watch?v=ibrahim",
    views: "2.3M",
    publishedAt: "2025-01-12",
    category: "documentary",
  },
  {
    id: "yt5",
    title: "Nasheed - The Light of Muhammad ﷺ",
    channelName: "Native Deen",
    duration: "4:30",
    thumbnailUrl: "https://picsum.photos/seed/nasheed/320/180",
    videoUrl: "https://www.youtube.com/watch?v=nasheed",
    views: "3.1M",
    publishedAt: "2025-01-11",
    category: "nasheed",
  },
];

// Daily Quran Verses
const dailyQuranVerses: QuranVerse[] = [
  {
    id: "v1",
    surahNumber: 2,
    surahName: "Al-Baqarah",
    surahNameArabic: "البقرة",
    ayahNumber: 185,
    arabic: "شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ",
    translation: "The month of Ramadan in which was revealed the Quran, a guidance for mankind and clear proofs for the guidance and the criterion.",
    transliteration: "Shahru Ramadaana alladhee unzila feehi alquraanu hudan lilnnaasi wabayyinaatin mina alhuda waalfurqaani",
    tafsir: "This verse establishes the significance of Ramadan as the month when the Quran was first revealed to Prophet Muhammad ﷺ.",
  },
  {
    id: "v2",
    surahNumber: 96,
    surahName: "Al-Alaq",
    surahNameArabic: "العلق",
    ayahNumber: 1,
    arabic: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
    translation: "Read! In the Name of your Lord Who has created.",
    transliteration: "Iqra bismi rabbika allathee khalaqa",
    tafsir: "The first revelation to Prophet Muhammad ﷺ, emphasizing the importance of reading and seeking knowledge.",
  },
  {
    id: "v3",
    surahNumber: 93,
    surahName: "Ad-Duha",
    surahNameArabic: "الضحى",
    ayahNumber: 5,
    arabic: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
    translation: "And verily, your Lord will give you so that you shall be well-pleased.",
    transliteration: "Walasawfa yutika rabbuka fatarda",
    tafsir: "A promise from Allah of future blessings and satisfaction for those who remain patient.",
  },
  {
    id: "v4",
    surahNumber: 94,
    surahName: "Ash-Sharh",
    surahNameArabic: "الشرح",
    ayahNumber: 6,
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    translation: "Verily, with hardship comes ease.",
    transliteration: "Inna ma'a al-'usri yusra",
    tafsir: "A beautiful reminder that every difficulty is accompanied by relief and ease.",
  },
  {
    id: "v5",
    surahNumber: 55,
    surahName: "Ar-Rahman",
    surahNameArabic: "الرحمن",
    ayahNumber: 13,
    arabic: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
    translation: "Then which of the favors of your Lord will you deny?",
    transliteration: "Fabi-ayyi ala-i rabbikuma tukaththibani",
    tafsir: "This verse is repeated 31 times in Surah Ar-Rahman, asking mankind and jinn to reflect on Allah's blessings.",
  },
  {
    id: "v6",
    surahNumber: 3,
    surahName: "Aal-Imran",
    surahNameArabic: "آل عمران",
    ayahNumber: 139,
    arabic: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    translation: "Do not lose heart nor fall into despair, for you will be superior if you are true believers.",
    transliteration: "Wala tahinoo wala tahzanoo waantumu al-aʿlawna in kuntum mu'mineena",
    tafsir: "Encouragement to believers to stay strong in faith during difficult times.",
  },
  {
    id: "v7",
    surahNumber: 29,
    surahName: "Al-Ankabut",
    surahNameArabic: "العنكبوت",
    ayahNumber: 69,
    arabic: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا",
    translation: "And those who strive for Us - We will surely guide them to Our ways.",
    transliteration: "Waallatheena jahadoo feena lanahdiyannahum subulana",
    tafsir: "Promise of divine guidance for those who sincerely strive in the path of Allah.",
  },
];

// Blog Posts
const blogPosts: BlogPost[] = [
  {
    id: "b1",
    title: "10 Ways to Maximize Your Ramadan Experience",
    excerpt: "Practical tips for making this Ramadan your most spiritually fulfilling one yet...",
    content: "Ramadan is a blessed month that offers countless opportunities for spiritual growth. Here are 10 practical ways to maximize your experience: 1. Set clear intentions before Ramadan begins. 2. Create a personalized worship schedule. 3. Increase your Quran recitation gradually. 4. Focus on quality over quantity in your prayers...",
    author: "Sheikh Ahmad Kutty",
    coverImage: "https://picsum.photos/seed/blog1/400/250",
    publishedAt: "2025-01-18",
    readTime: "8 min read",
    tags: ["Ramadan", "Productivity", "Worship"],
    category: "Spirituality",
  },
  {
    id: "b2",
    title: "Understanding Zakat: A Complete Guide",
    excerpt: "Everything you need to know about calculating and distributing your Zakat...",
    content: "Zakat is one of the five pillars of Islam and a mandatory form of charity. This comprehensive guide covers: Who must pay Zakat, How to calculate Nisab, The eight categories of Zakat recipients...",
    author: "Dr. Monzer Kahf",
    coverImage: "https://picsum.photos/seed/blog2/400/250",
    publishedAt: "2025-01-17",
    readTime: "12 min read",
    tags: ["Zakat", "Charity", "Islamic Finance"],
    category: "Charity",
  },
  {
    id: "b3",
    title: "The Sunnah of Prophet Muhammad ﷺ in Ramadan",
    excerpt: "Learn about the daily practices of the Prophet during the blessed month...",
    content: "Prophet Muhammad ﷺ had special practices during Ramadan that we can emulate. He would increase his worship, give more charity, and spend more time in reflection...",
    author: "Sheikh Yasir Qadhi",
    coverImage: "https://picsum.photos/seed/blog3/400/250",
    publishedAt: "2025-01-16",
    readTime: "10 min read",
    tags: ["Sunnah", "Prophet", "Ramadan"],
    category: "Seerah",
  },
  {
    id: "b4",
    title: "Maintaining Mental Health During Fasting",
    excerpt: "How to balance spiritual goals with mental wellness during Ramadan...",
    content: "While Ramadan is a time of spiritual rejuvenation, it's important to also care for our mental health. This article provides guidance on managing stress, anxiety, and maintaining emotional balance...",
    author: "Dr. Rania Awaad",
    coverImage: "https://picsum.photos/seed/blog4/400/250",
    publishedAt: "2025-01-15",
    readTime: "7 min read",
    tags: ["Mental Health", "Self-Care", "Ramadan"],
    category: "Health",
  },
  {
    id: "b5",
    title: "Teaching Children About Ramadan",
    excerpt: "Fun and engaging ways to introduce your kids to the spirit of Ramadan...",
    content: "Introducing children to Ramadan can be a beautiful experience. Here are creative ideas to help your little ones understand and participate in this blessed month...",
    author: "Ustadha Yasmin Mogahed",
    coverImage: "https://picsum.photos/seed/blog5/400/250",
    publishedAt: "2025-01-14",
    readTime: "6 min read",
    tags: ["Parenting", "Children", "Education"],
    category: "Ramadan Special",
  },
];

// Expanded content data
const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "The Spiritual Benefits of Fasting in Ramadan",
    type: "article",
    excerpt: "Discover the deep spiritual significance behind fasting and how it purifies the soul...",
    author: "Sheikh Ahmed Yasin",
    readTime: "5 min read",
    category: "Spirituality",
    tags: ["Ramadan", "Fasting", "Spirituality"],
    publishedAt: "2025-01-15",
    featured: true,
    content: "Fasting in Ramadan is not merely abstaining from food and drink. It is a comprehensive act of worship that purifies the soul, strengthens the will, and brings us closer to Allah...",
  },
  {
    id: "2",
    title: "Making the Most of Laylat al-Qadr",
    type: "video",
    excerpt: "A comprehensive guide to understanding and maximizing the Night of Power...",
    author: "Dr. Fatima Al-Rashid",
    duration: "45 min",
    imageUrl: "https://picsum.photos/seed/ramadan1/300/200.jpg",
    category: "Ramadan Special",
    tags: ["Laylat al-Qadr", "Prayer", "Ramadan"],
    publishedAt: "2025-01-12",
    featured: true,
  },
  {
    id: "3",
    title: "Daily Quran Reflections for Ramadan",
    type: "podcast",
    excerpt: "Join us for daily reflections on Quranic verses relevant to Ramadan themes...",
    author: "Imam Khalid Hassan",
    duration: "20 min",
    category: "Quran",
    tags: ["Quran", "Reflection", "Daily"],
    publishedAt: "2025-01-10",
    featured: true,
  },
  {
    id: "4",
    title: "The Importance of Charity in Islam",
    type: "article",
    excerpt: "Understanding the concept of Zakat and Sadaqah in Islamic tradition...",
    author: "Umar Abdullah",
    readTime: "8 min read",
    category: "Charity",
    tags: ["Zakat", "Charity", "Islamic Finance"],
    publishedAt: "2025-01-08",
    content: "Charity holds a central place in Islam. The Quran mentions charity in various forms over 30 times, emphasizing its importance...",
  },
  {
    id: "5",
    title: "Healthy Eating for Suhoor and Iftar",
    type: "article",
    excerpt: "Nutritional tips to maintain energy levels throughout your fasting day...",
    author: "Dr. Aisha Malik",
    readTime: "6 min read",
    category: "Health",
    tags: ["Health", "Nutrition", "Ramadan"],
    publishedAt: "2025-01-05",
  },
  {
    id: "6",
    title: "Taraweeh Prayer Guide for Beginners",
    type: "video",
    excerpt: "A step-by-step guide to performing Taraweeh prayers correctly...",
    author: "Sheikh Mahmoud El-Khatib",
    duration: "30 min",
    imageUrl: "https://picsum.photos/seed/taraweeh/300/200.jpg",
    category: "Prayer",
    tags: ["Taraweeh", "Prayer", "Ramadan"],
    publishedAt: "2025-01-03",
  },
  {
    id: "7",
    title: "Understanding the Quran - Surah Al-Fatiha",
    type: "podcast",
    excerpt: "Deep dive into the meanings and lessons from the opening chapter of the Quran...",
    author: "Dr. Yasir Qadhi",
    duration: "55 min",
    category: "Quran",
    tags: ["Quran", "Tafsir", "Al-Fatiha"],
    publishedAt: "2025-01-01",
  },
  {
    id: "8",
    title: "The Night Journey (Isra and Mi'raj)",
    type: "video",
    excerpt: "Explore the miraculous journey of Prophet Muhammad ﷺ...",
    author: "Dr. Omar Suleiman",
    duration: "40 min",
    imageUrl: "https://picsum.photos/seed/isra/300/200.jpg",
    category: "Seerah",
    tags: ["Isra", "Miraj", "Prophet"],
    publishedAt: "2024-12-28",
  },
];

const dailyHadiths: Hadith[] = [
  {
    id: "h1",
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    english: "Actions are judged by intentions",
    narrator: "Umar ibn Al-Khattab",
    source: "Sahih Bukhari",
    book: "Revelation",
    number: "1",
  },
  {
    id: "h2",
    arabic: "مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",
    english: "Whoever fasts during Ramadan with faith and seeking reward, his past sins will be forgiven",
    narrator: "Abu Hurairah",
    source: "Sahih Bukhari",
    book: "Fasting",
    number: "38",
  },
  {
    id: "h3",
    arabic: "الصِّيَامُ جُنَّةٌ",
    english: "Fasting is a shield",
    narrator: "Abu Hurairah",
    source: "Sahih Bukhari",
    book: "Fasting",
    number: "1894",
  },
];

const dailyDuas: Dua[] = [
  {
    id: "d1",
    title: "Dua for Breaking Fast",
    arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
    transliteration: "Dhahaba al-zama' wa abtalat al-'urooq wa thabata al-ajr in sha Allah",
    translation: "Thirst has gone, the veins are moist, and the reward is assured, if Allah wills",
    occasion: "At Iftar",
    benefits: ["Reward of fasting", "Gratitude expression", "Prophetic tradition"],
  },
  {
    id: "d2",
    title: "Dua for Laylat al-Qadr",
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    transliteration: "Allahumma innaka 'afuwwun tuhibbul 'afwa fa'fu 'anni",
    translation: "O Allah, You are Forgiving and love forgiveness, so forgive me",
    occasion: "Last 10 Nights",
    benefits: ["Seeking forgiveness", "Taught by Prophet ﷺ to Aisha", "Simple yet profound"],
  },
  {
    id: "d3",
    title: "Morning Remembrance",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ",
    transliteration: "Asbahna wa asbahal mulku lillahi walhamdulillah",
    translation: "We have entered the morning and the whole kingdom belongs to Allah, and praise is due to Allah",
    occasion: "Morning",
    benefits: ["Protection throughout day", "Starting with gratitude", "Acknowledging Allah's sovereignty"],
  },
];

const categories = [
  "All",
  "Spirituality",
  "Ramadan Special",
  "Quran",
  "Prayer",
  "Charity",
  "Health",
  "Seerah",
];

type TabType = "explore" | "videos" | "hadiths" | "duas" | "saved";

export default function ContentScreen() {
  const { colors, shadows } = useTheme();
  const styles = getStyles(colors, shadows);
  
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [filteredContent, setFilteredContent] = useState(mockContent);
  const [todayHadith, setTodayHadith] = useState<Hadith>(dailyHadiths[0]);
  const [todayVerse, setTodayVerse] = useState<QuranVerse>(dailyQuranVerses[0]);
  const [todayVideo, setTodayVideo] = useState<YouTubeVideo>(dailyYouTubeVideos[0]);

  // --- Remote data state (falls back to mock data when unavailable) ---
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideo[]>(dailyYouTubeVideos);
  const [articles, setArticles] = useState<BlogPost[]>(blogPosts);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  const featuredScrollRef = useRef<ScrollView>(null);

  // Helpers: resolve API keys (supports app.json `extra` via Constants)
  const resolvedYouTubeKey = API_CONFIG.youtubeApiKey || (Constants.manifest?.extra?.YOUTUBE_API_KEY as string) || "";
  const resolvedSunnahKey = API_CONFIG.sunnahApiKey || (Constants.manifest?.extra?.SUNNAH_API_KEY as string) || "";

  // Fetch YouTube videos via YouTube Data API (if API key provided), otherwise keep mock
  const fetchYouTubeVideos = async () => {
    if (!resolvedYouTubeKey) return; // no key — keep mock
    try {
      const q = encodeURIComponent("islamic lecture");
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${q}&key=${resolvedYouTubeKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("YouTube API error");
      const data = await res.json();
      const items: YouTubeVideo[] = (data.items || []).map((it: any) => ({
        id: it.id.videoId,
        title: it.snippet.title,
        channelName: it.snippet.channelTitle,
        duration: "--:--",
        thumbnailUrl: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${it.id.videoId}`,
        views: "",
        publishedAt: it.snippet.publishedAt,
        category: "lecture",
      }));
      if (items.length) setYouTubeVideos(items);
    } catch (err) {
      console.warn("fetchYouTubeVideos failed:", err);
    }
  };

  // Use rss-parser for reliable RSS parsing
  const fetchArticlesFromRss = async () => {
    try {
      const feeds = API_CONFIG.articleFeeds || [];
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
      const results: BlogPost[] = [];

      await Promise.all(feeds.map(async (feedUrl) => {
        try {
          const res = await fetch(feedUrl);
          if (!res.ok) return;
          const text = await res.text();
          const parsed = parser.parse(text);

          // Support both RSS and Atom structures
          const channel = parsed.rss?.channel || parsed.feed || parsed;
          const items = channel?.item || channel?.entry || channel?.items || [];

          (Array.isArray(items) ? items : [items]).forEach((it: any, idx: number) => {
            const title = it.title?.["#text"] || it.title || "Untitled";
            const link = it.link?.href || it.link || (it.guid && it.guid["#text"]) || `${feedUrl}#${idx}`;
            const content = (it.content?.["#text"] || it["content:encoded"] || it.description || it.summary || "").toString();
            const pubDate = it.pubDate || it.published || it.updated || it["dc:date"] || new Date().toISOString();

            results.push({
              id: link,
              title: title.trim(),
              excerpt: content.replace(/<[^>]+>/g, "").slice(0, 200),
              content: content.replace(/<[^>]+>/g, ""),
              author: it.creator || it.author || it["dc:creator"] || "",
              coverImage: (it.enclosure && it.enclosure["@_url"]) || (it["media:thumbnail"] && it["media:thumbnail"]["@_url"]) || `https://picsum.photos/seed/${encodeURIComponent(title || 'rss')}/400/250`,
              publishedAt: pubDate.split ? pubDate.split("T")[0] : new Date(pubDate).toISOString().split("T")[0],
              readTime: "5 min read",
              tags: it.categories || [],
              category: (it.categories && it.categories[0]) || "Article",
            });
          });
        } catch (e) {
          console.warn("fast-xml-parser fetch failed", feedUrl, e);
        }
      }));

      if (results.length) {
        results.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
        setArticles(results.slice(0, 10));
      }
    } catch (err) {
      console.warn("fetchArticlesFromRss failed:", err);
    }
  };

  // Fetch a random/"verse of the day" from Quran.com public API (no API key required)
  const fetchQuranVerse = async () => {
    try {
      const url = `${API_CONFIG.endpoints.quranRandom}?language=en&translations=20&tafsirs=17`; // best-effort parameters
      const res = await fetch(url);
      if (!res.ok) throw new Error("Quran API error");
      const json = await res.json();
      const v = json?.verse || json?.data || json?.data?.verse || null;
      if (v) {
        setTodayVerse({
          id: String(v.id || `${v.chapter_id}:${v.verse_number}`),
          surahNumber: v.chapter_id || v.chapter?.id || 0,
          surahName: v.chapter?.name_simple || v.chapter?.name || "",
          surahNameArabic: v.chapter?.name_arabic || "",
          ayahNumber: v.verse_number || v.verse_number || 0,
          arabic: v.text_uthmani || v.text || v.verse || "",
          translation: (v.translations && v.translations[0]?.text) || v.translation || "",
          transliteration: "",
          tafsir: (v.tafsirs && v.tafsirs[0]?.text) || v.tafsir || "",
        });
      }
    } catch (err) {
      console.warn("fetchQuranVerse failed:", err);
    }
  };

  // Fetch daily hadith — try Sutanlab (public) first, then Sunnah.com if key provided, otherwise keep local mock
  const fetchDailyHadith = async () => {
    // 1) Try Sutanlab public endpoint (no API key expected)
    try {
      const sutanUrl = API_CONFIG.endpoints.sutanlabHadithRandom;
      const res = await fetch(sutanUrl);
      if (res.ok) {
        const json = await res.json();
        // sutanlab typical shape may vary; attempt to map common fields
        const had = json?.data || json?.hadith || json;
        if (had) {
          setTodayHadith({
            id: String(had._id || had.id || had.hadith_number || Math.random()),
            arabic: had.arabic || had.bodyArabic || had.text || dailyHadiths[0].arabic,
            english: had.english || had.bodyEnglish || had.textEn || dailyHadiths[0].english,
            narrator: had.narrator || (had.narrator && had.narrator.name) || dailyHadiths[0].narrator,
            source: had.collection || had.book || dailyHadiths[0].source,
            book: had.book || "",
            number: had.hadith_number || had.number || "",
          });
          return; // success — done
        }
      }
    } catch (e) {
      // continue to next option
      console.warn("Sutanlab hadith fetch failed:", e);
    }

    // 2) Try Sunnah.com if API key is available
    if (resolvedSunnahKey) {
      try {
        const url = API_CONFIG.endpoints.sunnahRandom;
        const res = await fetch(url, { headers: { "X-API-Key": resolvedSunnahKey } });
        if (res.ok) {
          const json = await res.json();
          const hadith = json.data || json.hadith || json;
          if (hadith) {
            setTodayHadith({
              id: String(hadith._id || hadith.id || hadith.hadith_number || Math.random()),
              arabic: hadith.bodyArabic || hadith.arabic || hadith.text || dailyHadiths[0].arabic,
              english: hadith.bodyEnglish || hadith.english || hadith.textEn || dailyHadiths[0].english,
              narrator: (hadith.narrator && hadith.narrator.name) || hadith.narrator || dailyHadiths[0].narrator,
              source: hadith.collection || hadith.book || dailyHadiths[0].source,
              book: hadith.book || "",
              number: hadith.hadith_number || hadith.number || "",
            });
            return;
          }
        }
      } catch (err) {
        console.warn("Sunnah API fetch failed:", err);
      }
    }

    // 3) Fallback — keep existing local hadith (no-op)
  };

  // Master fetch on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsFetchingContent(true);
      await Promise.all([
        fetchYouTubeVideos(),
        fetchArticlesFromRss(),
        fetchQuranVerse(),
        fetchDailyHadith(),
      ]);
      if (mounted) setIsFetchingContent(false);
    })();
    return () => { mounted = false; };
  }, []);

  // If remote data arrived, prefer it for the "today" cards
  useEffect(() => {
    if (youTubeVideos && youTubeVideos.length) setTodayVideo(youTubeVideos[0]);
  }, [youTubeVideos]);

  useEffect(() => {
    if (articles && articles.length) {
      // Map fetched BlogPost -> ContentItem and merge with mockContent so the "All Content" list shows live articles
      const mapped: ContentItem[] = articles.map(a => ({
        id: a.id,
        title: a.title,
        type: "article",
        excerpt: a.excerpt,
        author: a.author || "",
        readTime: a.readTime,
        duration: undefined,
        imageUrl: a.coverImage,
        category: a.category || "Article",
        tags: a.tags || [],
        publishedAt: a.publishedAt,
        featured: false,
        content: a.content,
        source: "rss",
      }));

      const merged = [...mapped, ...mockContent].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      setFilteredContent(merged);
    }
  }, [articles]);

  // Load saved items
  useEffect(() => {
    loadSavedItems();
  }, []);

  // Set today's hadith, verse, and video based on date
  useEffect(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();

    // Prefer remote/fetched data; fall back to local mock rotation
    if (youTubeVideos && youTubeVideos.length) {
      setTodayVideo(youTubeVideos[dayOfMonth % youTubeVideos.length]);
    } else {
      setTodayVideo(dailyYouTubeVideos[dayOfMonth % dailyYouTubeVideos.length]);
    }

    if (articles && articles.length) {
      // rotate through fetched articles for "today's" suggestion
      const idx = dayOfMonth % articles.length;
      const art = articles[idx];
      if (art) setSelectedBlogPost(art);
    } else {
      setSelectedBlogPost(blogPosts[dayOfMonth % blogPosts.length]);
    }

    if (todayVerse && todayVerse.id) {
      // already set by fetchQuranVerse; leave as-is
    } else {
      setTodayVerse(dailyQuranVerses[dayOfMonth % dailyQuranVerses.length]);
    }

    if (todayHadith && todayHadith.id) {
      // already set by fetchDailyHadith or earlier; leave as-is
    } else {
      setTodayHadith(dailyHadiths[dayOfWeek % dailyHadiths.length]);
    }
  }, [youTubeVideos, articles, todayHadith, todayVerse]);

  const loadSavedItems = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_SAVED);
      if (saved) {
        setSavedItems(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved items:", error);
    }
  };

  const openYouTubeVideo = useCallback((videoUrl: string) => {
    Linking.openURL(videoUrl).catch(() => {
      Alert.alert("Error", "Could not open YouTube video");
    });
  }, []);

  const toggleSaveItem = useCallback(async (itemId: string) => {
    const newSaved = savedItems.includes(itemId)
      ? savedItems.filter(id => id !== itemId)
      : [...savedItems, itemId];
    
    setSavedItems(newSaved);
    await AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(newSaved));
  }, [savedItems]);

  // Filter content based on category and search
  useEffect(() => {
    let filtered = mockContent;

    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredContent(filtered);
  }, [selectedCategory, searchQuery]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article": return "document-text-outline";
      case "video": return "videocam-outline";
      case "podcast": return "mic-outline";
      case "hadith": return "book-outline";
      case "dua": return "heart-outline";
      default: return "document-outline";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "article": return colors.primary;
      case "video": return "#E53935";
      case "podcast": return "#8E24AA";
      case "hadith": return colors.secondary;
      case "dua": return colors.success;
      default: return colors.textMuted;
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "explore", label: "Explore", icon: "compass-outline" },
    { key: "videos", label: "Videos", icon: "play-circle-outline" },
    { key: "hadiths", label: "Hadiths", icon: "book-outline" },
    { key: "duas", label: "Duas", icon: "heart-outline" },
    { key: "saved", label: "Saved", icon: "bookmark-outline" },
  ];

  const featuredContent = mockContent.filter(item => item.featured);

  const renderExploreTab = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles, videos, podcasts..."
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

      {/* Featured Carousel */}
      {!searchQuery && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <ScrollView 
            ref={featuredScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH - spacing.lg * 2}
          >
            {featuredContent.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.featuredCard}
                onPress={() => setSelectedContent(item)}
              >
                <View style={styles.featuredGradient}>
                  <View style={[styles.featuredTypeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                    <Ionicons name={getTypeIcon(item.type) as any} size={14} color="#FFF" />
                    <Text style={styles.featuredTypeText}>{item.type}</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{item.title}</Text>
                  <Text style={styles.featuredAuthor}>By {item.author}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Today's Hadith Card */}
      {!searchQuery && (
        <View style={styles.hadithCard}>
          <View style={styles.hadithHeader}>
            <Ionicons name="sparkles" size={20} color={colors.secondary} />
            <Text style={styles.hadithLabel}>Hadith of the Day</Text>
          </View>
          <Text style={styles.hadithArabic}>{todayHadith.arabic}</Text>
          <Text style={styles.hadithEnglish}>"{todayHadith.english}"</Text>
          <Text style={styles.hadithSource}>
            — {todayHadith.narrator} | {todayHadith.source}
          </Text>
        </View>
      )}

      {/* Verse of the Day */}
      {!searchQuery && (
        <View style={styles.verseCard}>
          <View style={styles.verseHeader}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={styles.verseLabel}>Verse of the Day</Text>
          </View>
          <Text style={styles.verseSurah}>
            {todayVerse.surahNameArabic} • {todayVerse.surahName} ({todayVerse.surahNumber}:{todayVerse.ayahNumber})
          </Text>
          <Text style={styles.verseArabic}>{todayVerse.arabic}</Text>
          <Text style={styles.verseTranslation}>"{todayVerse.translation}"</Text>
          {todayVerse.tafsir && (
            <Text style={styles.verseTafsir}>{todayVerse.tafsir}</Text>
          )}
        </View>
      )}

      {/* Daily Video Recommendation */}
      {!searchQuery && (
        <View style={styles.videoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📺 Video of the Day</Text>
            <TouchableOpacity onPress={() => setActiveTab("videos")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.videoCard}
            onPress={() => openYouTubeVideo(todayVideo.videoUrl)}
          >
            <Image 
              source={{ uri: todayVideo.thumbnailUrl }} 
              style={styles.videoThumbnail}
            />
            <View style={styles.videoDurationBadge}>
              <Text style={styles.videoDurationText}>{todayVideo.duration}</Text>
            </View>
            <View style={styles.videoPlayButton}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>{todayVideo.title}</Text>
            <View style={styles.videoMeta}>
              <Text style={styles.videoChannel}>{todayVideo.channelName}</Text>
              <Text style={styles.videoViews}>{todayVideo.views} views</Text>
            </View>
          </View>
        </View>
      )}

      {/* Blog Posts Section */}
      {!searchQuery && (
        <View style={styles.blogSection}>
          <Text style={styles.sectionTitle}>📖 Latest Articles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {articles.slice(0, 3).map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.blogCard}
                onPress={() => setSelectedBlogPost(post)}
              >
                <Image source={{ uri: post.coverImage }} style={styles.blogImage} />
                <View style={styles.blogContent}>
                  <Text style={styles.blogCategory}>{post.category}</Text>
                  <Text style={styles.blogTitle} numberOfLines={2}>{post.title}</Text>
                  <View style={styles.blogFooter}>
                    <Text style={styles.blogAuthor}>{post.author}</Text>
                    <Text style={styles.blogReadTime}>{post.readTime}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextActive,
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === "All" ? "All Content" : selectedCategory}
        </Text>
        {filteredContent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.contentCard}
            onPress={() => setSelectedContent(item)}
          >
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.contentImage} />
            )}
            <View style={styles.contentInfo}>
              <View style={styles.contentHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + "20" }]}>
                  <Ionicons name={getTypeIcon(item.type) as any} size={12} color={getTypeColor(item.type)} />
                  <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleSaveItem(item.id)}>
                  <Ionicons 
                    name={savedItems.includes(item.id) ? "bookmark" : "bookmark-outline"} 
                    size={20} 
                    color={savedItems.includes(item.id) ? colors.secondary : colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentExcerpt} numberOfLines={2}>{item.excerpt}</Text>
              <View style={styles.contentFooter}>
                <Text style={styles.contentAuthor}>{item.author}</Text>
                <Text style={styles.contentDuration}>
                  {item.readTime || item.duration}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        {filteredContent.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.border} />
            <Text style={styles.emptyStateText}>No content found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search or category</Text>
          </View>
        )}
      </View>
    </>
  );

  const getVideoCategoryColor = (category: YouTubeVideo["category"]) => {
    switch (category) {
      case "lecture": return colors.primary;
      case "recitation": return colors.success;
      case "nasheed": return colors.secondary;
      case "documentary": return "#9C27B0";
      default: return colors.textMuted;
    }
  };

  const getVideoCategoryIcon = (category: YouTubeVideo["category"]) => {
    switch (category) {
      case "lecture": return "school-outline";
      case "recitation": return "musical-notes-outline";
      case "nasheed": return "mic-outline";
      case "documentary": return "film-outline";
      default: return "videocam-outline";
    }
  };

  const renderVideosTab = () => (
    <>
      <View style={styles.tabIntro}>
        <Ionicons name="play-circle" size={32} color={colors.error} />
        <Text style={styles.tabIntroTitle}>Islamic Videos</Text>
        <Text style={styles.tabIntroText}>
          Curated YouTube content for spiritual enrichment
        </Text>
      </View>

      {youTubeVideos.map((video) => (
        <TouchableOpacity
          key={video.id}
          style={styles.youtubeCard}
          onPress={() => openYouTubeVideo(video.videoUrl)}
        >
          <View style={styles.youtubeThumbnailContainer}>
            <Image source={{ uri: video.thumbnailUrl }} style={styles.youtubeThumbnail} />
            <View style={styles.youtubePlayOverlay}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.95)" />
            </View>
            <View style={styles.youtubeDuration}>
              <Text style={styles.youtubeDurationText}>{video.duration}</Text>
            </View>
          </View>
          <View style={styles.youtubeInfo}>
            <View style={styles.youtubeHeader}>
              <View style={[styles.youtubeCategoryBadge, { backgroundColor: getVideoCategoryColor(video.category) + "20" }]}>
                <Ionicons name={getVideoCategoryIcon(video.category) as any} size={12} color={getVideoCategoryColor(video.category)} />
                <Text style={[styles.youtubeCategoryText, { color: getVideoCategoryColor(video.category) }]}>
                  {video.category}
                </Text>
              </View>
            </View>
            <Text style={styles.youtubeTitle} numberOfLines={2}>{video.title}</Text>
            <View style={styles.youtubeMeta}>
              <Text style={styles.youtubeChannel}>{video.channelName}</Text>
              <Text style={styles.youtubeViews}>{video.views} views</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.moreVideosCard}>
        <Ionicons name="logo-youtube" size={32} color="#FF0000" />
        <Text style={styles.moreVideosTitle}>More Islamic Content</Text>
        <Text style={styles.moreVideosText}>
          Subscribe to trusted Islamic channels for daily reminders
        </Text>
        <View style={styles.channelSuggestions}>
          {["Yaqeen Institute", "Islamic Guidance", "FreeQuranEducation"].map((channel) => (
            <View key={channel} style={styles.channelChip}>
              <Text style={styles.channelChipText}>{channel}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  const renderHadithsTab = () => (
    <>
      <View style={styles.tabIntro}>
        <Ionicons name="book" size={32} color={colors.secondary} />
        <Text style={styles.tabIntroTitle}>Daily Hadiths</Text>
        <Text style={styles.tabIntroText}>
          Authentic sayings of Prophet Muhammad ﷺ to guide your Ramadan
        </Text>
      </View>

      {([todayHadith, ...dailyHadiths.filter(h => h.id !== todayHadith.id)]).map((hadith, index) => (
        <View key={hadith.id || index} style={styles.hadithListCard}>
          <View style={styles.hadithListHeader}>
            <View style={styles.hadithNumber}>
              <Text style={styles.hadithNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.hadithSourceInfo}>
              <Text style={styles.hadithBookName}>{hadith.source}</Text>
              <Text style={styles.hadithBookNumber}>Book: {hadith.book} • #{hadith.number}</Text>
            </View>
          </View>
          <Text style={styles.hadithListArabic}>{hadith.arabic}</Text>
          <Text style={styles.hadithListEnglish}>"{hadith.english}"</Text>
          <Text style={styles.hadithNarrator}>Narrated by {hadith.narrator}</Text>
        </View>
      ))}
    </>
  );

  const renderDuasTab = () => (
    <>
      <View style={styles.tabIntro}>
        <Ionicons name="heart" size={32} color={colors.success} />
        <Text style={styles.tabIntroTitle}>Essential Duas</Text>
        <Text style={styles.tabIntroText}>
          Supplications for every moment of your Ramadan journey
        </Text>
      </View>

      {dailyDuas.map((dua) => (
        <TouchableOpacity 
          key={dua.id} 
          style={styles.duaCard}
          onPress={() => setSelectedDua(dua)}
        >
          <View style={styles.duaCardHeader}>
            <View style={styles.duaOccasionBadge}>
              <Ionicons name="time-outline" size={14} color={colors.success} />
              <Text style={styles.duaOccasionText}>{dua.occasion}</Text>
            </View>
          </View>
          <Text style={styles.duaCardTitle}>{dua.title}</Text>
          <Text style={styles.duaCardArabic} numberOfLines={1}>{dua.arabic}</Text>
          <Text style={styles.duaCardTranslation} numberOfLines={2}>{dua.translation}</Text>
          <View style={styles.duaCardFooter}>
            <Text style={styles.tapToExpand}>Tap to read full dua</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderSavedTab = () => {
    const savedContent = mockContent.filter(item => savedItems.includes(item.id));
    
    return (
      <>
        <View style={styles.tabIntro}>
          <Ionicons name="bookmark" size={32} color={colors.primary} />
          <Text style={styles.tabIntroTitle}>Saved Content</Text>
          <Text style={styles.tabIntroText}>
            Your bookmarked articles, videos, and podcasts
          </Text>
        </View>

        {savedContent.length > 0 ? (
          savedContent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.contentCard}
              onPress={() => setSelectedContent(item)}
            >
              <View style={styles.contentInfo}>
                <View style={styles.contentHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + "20" }]}>
                    <Ionicons name={getTypeIcon(item.type) as any} size={12} color={getTypeColor(item.type)} />
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleSaveItem(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.contentTitle}>{item.title}</Text>
                <Text style={styles.contentExcerpt} numberOfLines={2}>{item.excerpt}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={colors.border} />
            <Text style={styles.emptyStateText}>No saved content yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the bookmark icon on any content to save it here
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Islamic Library</Text>
        <Text style={styles.subtitle}>Learn and grow your faith</Text>
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
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === "saved" && savedItems.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{savedItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "explore" && renderExploreTab()}
        {activeTab === "videos" && renderVideosTab()}
        {activeTab === "hadiths" && renderHadithsTab()}
        {activeTab === "duas" && renderDuasTab()}
        {activeTab === "saved" && renderSavedTab()}
        
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Content Detail Modal */}
      <Modal
        visible={selectedContent !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedContent(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedContent(null)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectedContent && toggleSaveItem(selectedContent.id)}>
              <Ionicons 
                name={selectedContent && savedItems.includes(selectedContent.id) ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={colors.secondary} 
              />
            </TouchableOpacity>
          </View>
          {selectedContent && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(selectedContent.type) + "20", alignSelf: "flex-start" }]}>
                <Ionicons name={getTypeIcon(selectedContent.type) as any} size={14} color={getTypeColor(selectedContent.type)} />
                <Text style={[styles.typeBadgeText, { color: getTypeColor(selectedContent.type) }]}>{selectedContent.type}</Text>
              </View>
              <Text style={styles.modalTitle}>{selectedContent.title}</Text>
              <View style={styles.modalMeta}>
                <Text style={styles.modalAuthor}>By {selectedContent.author}</Text>
                <Text style={styles.modalDuration}>{selectedContent.readTime || selectedContent.duration}</Text>
              </View>
              <Text style={styles.modalBody}>
                {selectedContent.content || selectedContent.excerpt}
                {"\n\n"}
                {selectedContent.type === "video" && "This video content will be available in the full app with video player integration."}
                {selectedContent.type === "podcast" && "This podcast episode will be available in the full app with audio player integration."}
              </Text>
              <View style={styles.modalTags}>
                {selectedContent.tags.map((tag, i) => (
                  <View key={i} style={styles.modalTag}>
                    <Text style={styles.modalTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Dua Detail Modal */}
      <Modal
        visible={selectedDua !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedDua(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedDua(null)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          {selectedDua && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.duaOccasionBadge}>
                <Ionicons name="time-outline" size={14} color={colors.success} />
                <Text style={styles.duaOccasionText}>{selectedDua.occasion}</Text>
              </View>
              <Text style={styles.modalTitle}>{selectedDua.title}</Text>
              
              <View style={styles.duaSection}>
                <Text style={styles.duaSectionLabel}>Arabic</Text>
                <Text style={styles.duaFullArabic}>{selectedDua.arabic}</Text>
              </View>
              
              <View style={styles.duaSection}>
                <Text style={styles.duaSectionLabel}>Transliteration</Text>
                <Text style={styles.duaTransliteration}>{selectedDua.transliteration}</Text>
              </View>
              
              <View style={styles.duaSection}>
                <Text style={styles.duaSectionLabel}>Translation</Text>
                <Text style={styles.duaTranslation}>{selectedDua.translation}</Text>
              </View>
              
              <View style={styles.duaBenefitsSection}>
                <Text style={styles.duaSectionLabel}>Benefits</Text>
                {selectedDua.benefits.map((benefit, i) => (
                  <View key={i} style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Blog Post Modal */}
      <Modal
        visible={selectedBlogPost !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedBlogPost(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedBlogPost(null)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectedBlogPost && toggleSaveItem(selectedBlogPost.id)}>
              <Ionicons 
                name={selectedBlogPost && savedItems.includes(selectedBlogPost.id) ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={selectedBlogPost && savedItems.includes(selectedBlogPost.id) ? colors.secondary : colors.text} 
              />
            </TouchableOpacity>
          </View>
          {selectedBlogPost && (
            <ScrollView style={styles.modalContent}>
              <Image source={{ uri: selectedBlogPost.coverImage }} style={styles.blogModalImage} />
              <View style={styles.blogModalCategory}>
                <Text style={styles.blogModalCategoryText}>{selectedBlogPost.category}</Text>
              </View>
              <Text style={styles.modalTitle}>{selectedBlogPost.title}</Text>
              
              <View style={styles.blogModalMeta}>
                <View style={styles.blogModalAuthorInfo}>
                  <View style={styles.blogModalAvatar}>
                    <Ionicons name="person" size={16} color={colors.textMuted} />
                  </View>
                  <Text style={styles.blogModalAuthor}>{selectedBlogPost.author}</Text>
                </View>
                <Text style={styles.blogModalReadTime}>{selectedBlogPost.readTime}</Text>
              </View>
              
              <View style={styles.blogModalTags}>
                {selectedBlogPost.tags.map((tag) => (
                  <View key={tag} style={styles.blogModalTag}>
                    <Text style={styles.blogModalTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.blogModalContent}>{selectedBlogPost.content}</Text>
            </ScrollView>
          )}
        </SafeAreaView>
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
  
  // Search Container
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  
  // Featured Section
  featuredSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featuredCard: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 200,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    overflow: "hidden",
    ...shadows.md,
  },
  featuredGradient: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "flex-end",
  },
  featuredTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  featuredTypeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: "#FFF",
    marginBottom: spacing.xs,
  },
  featuredAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: "rgba(255,255,255,0.8)",
  },
  
  // Hadith Card
  hadithCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    ...shadows.sm,
  },
  hadithHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hadithLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
    textTransform: "uppercase",
  },
  hadithArabic: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  hadithEnglish: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  hadithSource: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  
  // Verse Card
  verseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  verseLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    textTransform: "uppercase",
  },
  verseSurah: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  verseArabic: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  verseTranslation: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.md,
  },
  verseTafsir: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  // Video Section
  videoSection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  videoCard: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  videoThumbnail: {
    width: "100%",
    height: 200,
    backgroundColor: colors.surfaceElevated,
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  videoDurationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },
  videoPlayButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  videoInfo: {
    padding: spacing.md,
  },
  videoTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  videoMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  videoChannel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  videoViews: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  
  // Blog Section
  blogSection: {
    marginBottom: spacing.xl,
  },
  blogCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    overflow: "hidden",
    ...shadows.md,
  },
  blogImage: {
    width: "100%",
    height: 160,
    backgroundColor: colors.surfaceElevated,
  },
  blogContent: {
    padding: spacing.md,
  },
  blogCategory: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  blogTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  blogFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  blogAuthor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  blogReadTime: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  
  // Category Filter
  categoryFilter: {
    marginBottom: spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  categoryChipTextActive: {
    color: "#FFF",
  },
  
  // Content List
  section: {
    marginBottom: spacing.lg,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.sm,
  },
  contentImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.surfaceElevated,
  },
  contentInfo: {
    padding: spacing.md,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  typeBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    textTransform: "uppercase",
  },
  contentTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contentExcerpt: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  contentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentAuthor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  contentDuration: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: "#FFF",
  },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: typography.sizes.xxs,
    fontFamily: typography.fonts.bold,
    color: "#FFF",
  },
  
  // Tab Intro
  tabIntro: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  tabIntroTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  tabIntroText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  
  // YouTube Cards
  youtubeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  youtubeThumbnailContainer: {
    position: "relative",
  },
  youtubeThumbnail: {
    width: "100%",
    height: 200,
    backgroundColor: colors.surfaceElevated,
  },
  youtubePlayOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  youtubeDuration: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  youtubeDurationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
  },
  youtubeInfo: {
    padding: spacing.md,
  },
  youtubeHeader: {
    marginBottom: spacing.sm,
  },
  youtubeCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  youtubeCategoryText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    textTransform: "uppercase",
  },
  youtubeTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  youtubeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  youtubeChannel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  youtubeViews: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  moreVideosCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  moreVideosTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  moreVideosText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  channelSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  channelChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  channelChipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  
  // Hadith List
  hadithListCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    ...shadows.sm,
  },
  hadithListHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hadithNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  hadithNumberText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.secondary,
  },
  hadithSourceInfo: {
    flex: 1,
  },
  hadithBookName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  hadithBookNumber: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  hadithListArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  hadithListEnglish: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  hadithNarrator: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  
  // Dua Cards
  duaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    ...shadows.sm,
  },
  duaCardHeader: {
    marginBottom: spacing.md,
  },
  duaOccasionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success + "20",
    gap: spacing.xs,
  },
  duaOccasionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.success,
    textTransform: "uppercase",
  },
  duaCardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  duaCardArabic: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  duaCardTranslation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  duaCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tapToExpand: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  
  // Dua Detail Modal
  duaSection: {
    marginBottom: spacing.xl,
  },
  duaSectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  duaFullArabic: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    textAlign: "right",
    lineHeight: 36,
  },
  duaTransliteration: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  duaTranslation: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 24,
  },
  duaBenefitsSection: {
    marginTop: spacing.lg,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  modalDuration: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  modalBody: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: 24,
  },
  modalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  modalTagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  
  // Blog Modal
  blogModalImage: {
    width: "100%",
    height: 200,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  blogModalCategory: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  blogModalCategoryText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.bold,
    color: colors.primary,
    textTransform: "uppercase",
  },
  blogModalMeta: {
    marginBottom: spacing.lg,
  },
  blogModalAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  blogModalAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  blogModalAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  blogModalReadTime: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  blogModalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blogModalTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  blogModalTagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  blogModalContent: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: 24,
  },
})