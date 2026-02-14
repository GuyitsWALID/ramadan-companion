import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Dimensions, Linking, Alert, ActivityIndicator, Platform } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
  reference?: string;
}



const categories = ["All", "Faith", "Prayer", "Ramadan", "Quran"];

type TabType = "explore" | "videos" | "hadiths" | "duas";

export default function ContentScreen() {
  const { colors, shadows } = useTheme();
  const styles = getStyles(colors, shadows);
  
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);

  // --- REAL DATA STATE ---
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideo[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [todayHadith, setTodayHadith] = useState<Hadith | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [todayVerse, setTodayVerse] = useState<QuranVerse | null>(null);
  const [todayVideo, setTodayVideo] = useState<YouTubeVideo | null>(null);
  const [dailyDuas, setDailyDuas] = useState<Dua[]>([]);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const featuredScrollRef = useRef<ScrollView>(null);

  // Helpers: resolve API keys
  const resolvedYouTubeKey = API_CONFIG.youtubeApiKey || (Constants.manifest?.extra?.YOUTUBE_API_KEY as string) || "";

  // Fetch YouTube videos with REAL durations
  const fetchYouTubeVideos = async () => {
    if (!resolvedYouTubeKey) {
      console.warn("YouTube API key not configured");
      return;
    }
    
    try {
      const q = encodeURIComponent("islamic lecture ramadan");
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${q}&key=${resolvedYouTubeKey}`;
      const searchRes = await fetch(searchUrl);
      
      if (!searchRes.ok) {
        console.error("YouTube API error:", searchRes.status);
        return;
      }
      
      const searchData = await searchRes.json();
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      
      // Fetch video details to get duration and statistics
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${resolvedYouTubeKey}`;
      const detailsRes = await fetch(detailsUrl);
      
      if (!detailsRes.ok) {
        console.error("YouTube details API error:", detailsRes.status);
        return;
      }
      
      const detailsData = await detailsRes.json();
      const items: YouTubeVideo[] = detailsData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        duration: formatYouTubeDuration(item.contentDetails.duration),
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        views: formatViews(item.statistics.viewCount),
        publishedAt: item.snippet.publishedAt,
        category: "lecture" as const,
      }));
      
      if (items.length) {
        setYouTubeVideos(items);
        setTodayVideo(items[0]);
      }
    } catch (err) {
      console.error("fetchYouTubeVideos failed:", err);
    }
  };

  // Format YouTube duration from ISO 8601 to readable format
  const formatYouTubeDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return "0:00";
    
    const hours = (match[1] || "").replace("H", "");
    const minutes = (match[2] || "0").replace("M", "");
    const seconds = (match[3] || "0").replace("S", "");
    
    if (hours) {
      return `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.padStart(2, "0")}`;
  };

  // Format view counts
  const formatViews = (views: string): string => {
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return views;
  };

  // Fetch articles from RSS feeds (uses API_CONFIG.articleFeeds; adds web/CORS proxy fallback and better logging)
  const fetchArticlesFromRss = async () => {
    try {
      const results: BlogPost[] = [];
      const feeds = (API_CONFIG.articleFeeds || []).slice(0, 10);
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

      for (const feedUrl of feeds) {
        try {
          let res = await fetch(feedUrl);

          // If running on web or the direct fetch failed, try a CORS proxy fallback
          if ((!res || !res.ok) && Platform.OS === "web") {
            console.warn(`RSS direct fetch failed for ${feedUrl} (status: ${res?.status}). Trying CORS proxy.`);
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
            res = await fetch(proxyUrl);
          }

          if (!res || !res.ok) {
            console.warn(`Skipping feed ${feedUrl} — fetch failed (status: ${res?.status})`);
            continue;
          }

          const text = await res.text();
          const parsed = parser.parse(text);
          const channel = parsed.rss?.channel || parsed.feed || parsed;

          let items: any[] = [];
          if (channel?.item) items = Array.isArray(channel.item) ? channel.item : [channel.item];
          else if (channel?.entry) items = Array.isArray(channel.entry) ? channel.entry : [channel.entry];

          if (!items || items.length === 0) {
            console.warn(`No items parsed from feed ${feedUrl}`);
            continue;
          }

          // take more items per feed to build a larger pool (we'll trim later)
          items.slice(0, 10).forEach((it: any) => {
            const content = (it.description || it["content:encoded"] || it.summary || it.content || "").toString();
            results.push({
              id: it.link || it.guid || (it.id && it.id['#text']) || `${feedUrl}#${Math.random()}`,
              title: it.title || (it.title && it.title['#text']) || "Untitled",
              excerpt: content.replace(/<[^>]+>/g, "").slice(0, 200) + "...",
              content: content.replace(/<[^>]+>/g, ""),
              author: it.creator || it["dc:creator"] || it.author || (it.author && it.author.name) || "Unknown",
              coverImage: it.enclosure?.["@_url"] || it["media:content"]?.["@_url"] || `https://picsum.photos/seed/${encodeURIComponent(it.title || it.guid)}/400/250`,
              publishedAt: (it.pubDate || it.published || (it['updated'] && it['updated']['#text']) || new Date().toISOString()).split("T")[0],
              readTime: "5 min read",
              tags: ["Islamic Knowledge"],
              category: "Faith",
            });
          });

          console.log(`Parsed ${Math.min(items.length, 5)} items from ${feedUrl}`);
        } catch (feedErr) {
          console.warn(`Failed to fetch/parse feed ${feedUrl}:`, feedErr);
        }
      }

      // Ensure we have at least 5 articles — if external feeds fail, append lightweight local fallbacks
      if (results.length < 5) {
        console.warn(`Only ${results.length} articles found — adding fallback articles to reach 5`);
        const localFallbacks: BlogPost[] = [
          { id: 'local-1', title: 'Benefits of Daily Dhikr', excerpt: 'Short daily remembrance practices to strengthen faith...', content: '', author: 'Ramadan Companion', coverImage: `https://picsum.photos/seed/fallback1/400/250`, publishedAt: new Date().toISOString().split('T')[0], readTime: '3 min read', tags: ['remembrance'], category: 'Faith' },
          { id: 'local-2', title: 'How to Make the Most of Taraweeh', excerpt: 'Practical tips for focused prayer and reflection during Ramadan...', content: '', author: 'Ramadan Companion', coverImage: `https://picsum.photos/seed/fallback2/400/250`, publishedAt: new Date().toISOString().split('T')[0], readTime: '4 min read', tags: ['prayer'], category: 'Prayer' },
          { id: 'local-3', title: 'Simple Quran Reading Plan', excerpt: 'A gentle plan to complete the Quran this Ramadan with consistency...', content: '', author: 'Ramadan Companion', coverImage: `https://picsum.photos/seed/fallback3/400/250`, publishedAt: new Date().toISOString().split('T')[0], readTime: '5 min read', tags: ['quran'], category: 'Quran' },
        ];
        for (const f of localFallbacks) {
          if (results.length >= 5) break;
          results.push(f);
        }
      }

      if (results.length > 0) {
        results.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
        setArticles(results);
        console.log(`Fetched ${results.length} articles (aggregated from ${feeds.length} feeds)`);
      } else {
        console.warn("No articles fetched from RSS feeds");
        setArticles([]);
      }
    } catch (err) {
      console.error("fetchArticlesFromRss failed:", err);
      setArticles([]);
    }
  };

  // Fetch daily Quran verse
  const fetchQuranVerse = async () => {
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 0);
      const diff = today.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      const meaningfulVerses = [
        { surah: 2, ayah: 185 }, { surah: 2, ayah: 186 }, { surah: 3, ayah: 139 },
        { surah: 13, ayah: 28 }, { surah: 16, ayah: 97 }, { surah: 29, ayah: 69 },
        { surah: 39, ayah: 53 }, { surah: 55, ayah: 13 }, { surah: 65, ayah: 3 },
        { surah: 93, ayah: 5 }, { surah: 94, ayah: 6 }, { surah: 96, ayah: 1 },
      ];
      
      const verseIndex = dayOfYear % meaningfulVerses.length;
      const selectedVerse = meaningfulVerses[verseIndex];
      
      const url = `https://api.alquran.cloud/v1/ayah/${selectedVerse.surah}:${selectedVerse.ayah}/editions/quran-uthmani,en.sahih`;
      const res = await fetch(url);
      
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        
        if (data && Array.isArray(data) && data.length >= 2) {
          setTodayVerse({
            id: `${selectedVerse.surah}-${selectedVerse.ayah}`,
            surahNumber: data[0].surah.number,
            surahName: data[0].surah.englishName,
            surahNameArabic: data[0].surah.name,
            ayahNumber: data[0].numberInSurah,
            arabic: data[0].text,
            translation: data[1].text,
            transliteration: "",
            tafsir: "",
          });
        }
      }
    } catch (err) {
      console.error("fetchQuranVerse failed:", err);
    }
  };

  // Fetch multiple daily hadiths (tries multiple endpoints, dedupes and provides local fallback)
  const fetchDailyHadiths = async (count = 10) => {
    const endpoints = [
      "https://random-hadith-generator.vercel.app/bukhari/",
      API_CONFIG.endpoints?.sutanlabHadithRandom,
      API_CONFIG.endpoints?.sunnahRandom,
    ].filter(Boolean as any);

    const tryNormalize = (obj: any) => {
      if (!obj) return null;
      if (obj.data && (obj.data.hadithArabic || obj.data.hadithEnglish)) {
        const d = obj.data;
        return {
          arabic: d.hadithArabic || d.arab || "",
          english: d.hadithEnglish || d.hadith || d.translate || "",
          narrator: d.englishNarrator || d.narrator || "",
          source: d.collection || "Sahih Bukhari",
          book: d.chapterName || d.book || "",
          number: String(d.hadithNumber || d.id || d.number || ""),
        };
      }

      if (obj.data && obj.data.hadith) {
        const d = obj.data.hadith;
        return {
          arabic: d.arab || d.arabic || "",
          english: d.translate || d.en || d.english || "",
          narrator: obj.data.name || obj.data.collection || "",
          source: obj.data.name || "",
          book: obj.data.book || "",
          number: String(obj.data.id || d.id || ""),
        };
      }

      if (obj.hadith) {
        const h = obj.hadith;
        return {
          arabic: h.arabic || h.arab || "",
          english: h.text || h.english || h.translate || "",
          narrator: h.narrator || obj.narrator || "",
          source: h.collection || obj.collection || "",
          book: h.book || "",
          number: String(h.number || obj.number || obj.id || ""),
        };
      }

      if (obj.hadithArabic || obj.hadithEnglish) {
        return {
          arabic: obj.hadithArabic || "",
          english: obj.hadithEnglish || "",
          narrator: obj.englishNarrator || "",
          source: obj.source || "",
          book: obj.chapterName || "",
          number: String(obj.hadithNumber || obj.id || ""),
        };
      }

      return null;
    };

    const collected: Hadith[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = Math.max(30, count * 6);

    while (collected.length < count && attempts < maxAttempts) {
      const url = endpoints[attempts % endpoints.length];
      try {
        let res = await fetch(url, url.includes("sunnah.com") && API_CONFIG.sunnahApiKey ? { headers: { "x-api-key": API_CONFIG.sunnahApiKey } } : undefined);
        console.log(`fetchDailyHadiths: tried ${url} -> ${res?.status}`);
        if (!res || !res.ok) { attempts++; continue; }

        const json = await res.json();
        const n = tryNormalize(json);
        if (n) {
          const dedupeKey = (n.english || n.arabic || n.number || "").slice(0, 200);
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            collected.push({ id: n.number || `${collected.length + 1}`, ...n });
          }
        }
      } catch (err) {
        console.warn("fetchDailyHadiths attempt failed for", url, err);
      }
      attempts++;
    }

    if (collected.length === 0) {
      console.warn("All hadith endpoints failed — using local fallback set");
      collected.push({
        id: "fallback-1",
        arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
        english: "Actions are judged by intentions.",
        narrator: "Prophet ﷺ — Bukhari",
        source: "Sahih Bukhari",
        book: "Various",
        number: "-",
      });
    }

    setHadiths(collected.slice(0, count));
    setTodayHadith(collected[0] || null);
    console.log(`Fetched ${collected.length} hadith(s)`);
  };

  // Fetch daily duas from Hisnul Muslim API
  const fetchDailyDuas = async () => {
    try {
      // Using a different approach - selecting from authenticated duas
      const duasList: Dua[] = [
        {
          id: "d1",
          title: "Dua for Breaking Fast",
          arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
          transliteration: "Dhahaba al-zama' wa abtalat al-'urooq wa thabata al-ajr in sha Allah",
          translation: "Thirst has gone, the veins are moist, and the reward is assured, if Allah wills",
          occasion: "At Iftar",
          benefits: ["Reward of fasting", "Gratitude expression", "Prophetic tradition"],
          reference: "Abu Dawud 2:306"
        },
        {
          id: "d2",
          title: "Dua for Laylat al-Qadr",
          arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
          transliteration: "Allahumma innaka 'afuwwun tuhibbul 'afwa fa'fu 'anni",
          translation: "O Allah, You are Forgiving and love forgiveness, so forgive me",
          occasion: "Last 10 Nights",
          benefits: ["Seeking forgiveness", "Taught by Prophet ﷺ to Aisha", "Simple yet profound"],
          reference: "Tirmidhi, Ibn Majah"
        },
        {
          id: "d3",
          title: "Morning Remembrance",
          arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ",
          transliteration: "Asbahna wa asbahal mulku lillahi walhamdulillah",
          translation: "We have entered the morning and the whole kingdom belongs to Allah, and praise is due to Allah",
          occasion: "Morning",
          benefits: ["Protection throughout day", "Starting with gratitude", "Acknowledging Allah's sovereignty"],
          reference: "Muslim 4:2088"
        },
        {
          id: "d4",
          title: "Before Sleep",
          arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
          transliteration: "Bismika Allahumma amootu wa ahya",
          translation: "In Your Name O Allah, I die and I live",
          occasion: "Before Sleep",
          benefits: ["Protection during sleep", "Remembering Allah", "Peace of mind"],
          reference: "Bukhari 7:71"
        },
        {
          id: "d5",
          title: "Entering the Mosque",
          arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
          transliteration: "Allahumma iftah li abwaba rahmatika",
          translation: "O Allah, open for me the doors of Your mercy",
          occasion: "Entering Mosque",
          benefits: ["Seeking Allah's mercy", "Preparing for prayer", "Prophetic tradition"],
          reference: "Muslim, Abu Dawud"
        },
        {
          id: "d6",
          title: "After Wudu",
          arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
          transliteration: "Ashhadu an la ilaha illallah wa ashhadu anna Muhammadan 'abduhu wa rasuluhu",
          translation: "I bear witness that there is no deity except Allah, and I bear witness that Muhammad is His servant and messenger",
          occasion: "After Ablution",
          benefits: ["Gates of Paradise opened", "Purification", "Faith affirmation"],
          reference: "Muslim 1:209"
        },
        {
          id: "d7",
          title: "When Leaving Home",
          arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ",
          transliteration: "Bismillah, tawakkaltu 'alallah",
          translation: "In the name of Allah, I place my trust in Allah",
          occasion: "Leaving Home",
          benefits: ["Protection", "Trust in Allah", "Safe journey"],
          reference: "Abu Dawud, Tirmidhi"
        },
      ];

      // Rotate duas based on day of week and provide 10 daily duas
      const today = new Date();
      const dayOfWeek = today.getDay();
      const selectedCount = 10;

      // Ensure each generated dua has a unique id (avoid duplicate React keys when the source list is shorter than selectedCount)
      const selectedDuas = Array.from({ length: selectedCount }, (_, i) => {
        const base = duasList[(dayOfWeek + i) % duasList.length];
        return { ...base, id: `${base.id}-${i}` } as Dua;
      });

      setDailyDuas(selectedDuas);
      console.log(`Duas loaded successfully — ${selectedDuas.length} items`);
    } catch (err) {
      console.error("fetchDailyDuas failed:", err);
    }
  };

  // Master fetch on mount
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      setIsLoading(true);
      setIsFetchingContent(true);
      
      await Promise.all([
        fetchYouTubeVideos(),
        fetchArticlesFromRss(),
        fetchQuranVerse(),
        fetchDailyHadiths(10),
        fetchDailyDuas(),
      ]);
      
      if (mounted) {
        setIsFetchingContent(false);
        setIsLoading(false);
      }
    })();
    
    return () => { mounted = false; };
  }, []);

  // Update filtered content when articles are fetched
  useEffect(() => {
    if (articles && articles.length) {
      const mapped: ContentItem[] = articles.map(a => ({
        id: a.id,
        title: a.title,
        type: "article" as const,
        excerpt: a.excerpt,
        author: a.author || "",
        readTime: a.readTime,
        duration: undefined,
        imageUrl: a.coverImage,
        category: a.category || "Faith",
        tags: a.tags || [],
        publishedAt: a.publishedAt,
        featured: false,
        content: a.content,
        source: "rss",
      }));

      setFilteredContent(mapped);
    }
  }, [articles]);

  const openYouTubeVideo = useCallback((videoUrl: string) => {
    Linking.openURL(videoUrl).catch(() => {
      Alert.alert("Error", "Could not open YouTube video");
    });
  }, []);


  // Filter content based on category and search
  useEffect(() => {
    let filtered = articles.map(a => ({
      id: a.id,
      title: a.title,
      type: "article" as const,
      excerpt: a.excerpt,
      author: a.author,
      readTime: a.readTime,
      imageUrl: a.coverImage,
      category: a.category,
      tags: a.tags,
      publishedAt: a.publishedAt,
      featured: false,
      content: a.content,
    }));

    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => 
        item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
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
  }, [selectedCategory, searchQuery, articles]);

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
  ];

  const renderExploreTab = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
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

      {/* Today's Hadith Card */}
      {!searchQuery && todayHadith && (
        <View style={styles.hadithCard}>
          <View style={styles.hadithHeader}>
            <Ionicons name="sparkles" size={20} color={colors.secondary} />
            <Text style={styles.hadithLabel}>Hadith of the Day</Text>
          </View>
          {todayHadith.arabic && (
            <Text style={styles.hadithArabic}>{todayHadith.arabic}</Text>
          )}
          <Text style={styles.hadithEnglish}>"{todayHadith.english}"</Text>
          <Text style={styles.hadithSource}>
            — {todayHadith.narrator} | {todayHadith.source}
          </Text>
        </View>
      )}

      {/* Verse of the Day */}
      {!searchQuery && todayVerse && (
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
        </View>
      )}

      {/* Daily Video Recommendation */}
      {!searchQuery && todayVideo && (
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
              {todayVideo.views && (
                <Text style={styles.videoViews}>{todayVideo.views} views</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Featured Articles Section */}
      {!searchQuery && articles.length > 0 && (
        <View style={styles.blogSection}>
          <Text style={styles.sectionTitle}>📖 Featured Articles</Text>
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
      {!searchQuery && (
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
      )}

      {/* All Articles List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === "All" ? "All Articles" : selectedCategory}
        </Text>
        
        {filteredContent.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.border} />
            <Text style={styles.emptyStateText}>No articles available</Text>
            <Text style={styles.emptyStateSubtext}>Check your internet connection</Text>
          </View>
        )}
        
        {filteredContent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.contentCard}
            onPress={() => setSelectedBlogPost(articles.find(a => a.id === item.id) || null)}
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

      {youTubeVideos.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={64} color={colors.border} />
          <Text style={styles.emptyStateText}>No videos available</Text>
          <Text style={styles.emptyStateSubtext}>Please check your YouTube API configuration</Text>
        </View>
      )}

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
              {video.views && (
                <Text style={styles.youtubeViews}>{video.views} views</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderHadithsTab = () => (
    <>
      <View style={styles.tabIntro}>
        <Ionicons name="book" size={32} color={colors.secondary} />
        <Text style={styles.tabIntroTitle}>Daily Hadith</Text>
        <Text style={styles.tabIntroText}>
          Authentic sayings of Prophet Muhammad ﷺ
        </Text>
      </View>

      {hadiths.length > 0 ? (
        hadiths.map((h, idx) => (
          <View key={h.id || idx} style={styles.hadithListCard}>
            <View style={styles.hadithListHeader}>
              <View style={styles.hadithNumber}>
                <Text style={styles.hadithNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.hadithSourceInfo}>
                <Text style={styles.hadithBookName}>{h.source}</Text>
                <Text style={styles.hadithBookNumber}>
                  {h.book && `Book: ${h.book}`}
                  {h.number && ` • #${h.number}`}
                </Text>
              </View>
            </View>
            {h.arabic && (
              <Text style={styles.hadithListArabic}>{h.arabic}</Text>
            )}
            <Text style={styles.hadithListEnglish}>"{h.english}"</Text>
            <Text style={styles.hadithNarrator}>Narrated by {h.narrator}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color={colors.border} />
          <Text style={styles.emptyStateText}>No hadith available</Text>
          <Text style={styles.emptyStateSubtext}>Please check your connection</Text>
        </View>
      )}
    </>
  );

  const renderDuasTab = () => (
    <>
      <View style={styles.tabIntro}>
        <Ionicons name="heart" size={32} color={colors.success} />
        <Text style={styles.tabIntroTitle}>Daily Duas</Text>
        <Text style={styles.tabIntroText}>
          Rotating supplications for every moment
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



  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Islamic content...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "explore" && renderExploreTab()}
        {activeTab === "videos" && renderVideosTab()}
        {activeTab === "hadiths" && renderHadithsTab()}
        {activeTab === "duas" && renderDuasTab()}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

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
              
              {selectedDua.reference && (
                <View style={styles.duaSection}>
                  <Text style={styles.duaSectionLabel}>Reference</Text>
                  <Text style={styles.duaTranslation}>{selectedDua.reference}</Text>
                </View>
              )}
              
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
                {selectedBlogPost.tags.map((tag, index) => (
                  <View key={index} style={styles.blogModalTag}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
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
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
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