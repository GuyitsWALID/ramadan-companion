import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Dimensions, Linking, Alert } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  content?: string; // Full content for articles
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
  
  const featuredScrollRef = useRef<ScrollView>(null);

  // Load saved items
  useEffect(() => {
    loadSavedItems();
  }, []);

  // Set today's hadith, verse, and video based on date
  useEffect(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();
    
    setTodayHadith(dailyHadiths[dayOfWeek % dailyHadiths.length]);
    setTodayVerse(dailyQuranVerses[dayOfMonth % dailyQuranVerses.length]);
    setTodayVideo(dailyYouTubeVideos[dayOfMonth % dailyYouTubeVideos.length]);
  }, []);

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
            {blogPosts.slice(0, 3).map((post) => (
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

      {dailyYouTubeVideos.map((video) => (
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

      {dailyHadiths.map((hadith, index) => (
        <View key={hadith.id} style={styles.hadithListCard}>
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

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xxs,
  },
  tabActive: {
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: typography.fonts.semiBold,
  },
  tabBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xxs,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
  },

  // Featured Section
  featuredSection: {
    marginBottom: spacing.lg,
  },
  featuredCard: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 180,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    overflow: "hidden",
  },
  featuredGradient: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "flex-end",
  },
  featuredTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  featuredTypeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: "#FFF",
    textTransform: "capitalize",
  },
  featuredTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  featuredAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },

  // Hadith Card (Today)
  hadithCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.secondary + "30",
    ...shadows.md,
  },
  hadithHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  hadithLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.secondary,
  },
  hadithArabic: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  hadithEnglish: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  hadithSource: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Category Filter
  categoryFilter: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
    color: colors.textOnPrimary,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Content Cards
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  contentImage: {
    width: "100%",
    height: 140,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  contentInfo: {
    flex: 1,
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
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  typeBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    textTransform: "capitalize",
  },
  contentTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: typography.sizes.md * 1.4,
  },
  contentExcerpt: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * 1.5,
    marginBottom: spacing.sm,
  },
  contentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentAuthor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  contentDuration: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },

  // Tab Intro
  tabIntro: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  tabIntroTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  tabIntroText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },

  // Hadith List
  hadithListCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  hadithListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  hadithNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  hadithNumberText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.secondary,
  },
  hadithSourceInfo: {
    flex: 1,
  },
  hadithBookName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
  },
  hadithBookNumber: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  hadithListArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  hadithListEnglish: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hadithNarrator: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // Dua Cards
  duaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    ...shadows.sm,
  },
  duaCardHeader: {
    marginBottom: spacing.sm,
  },
  duaOccasionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.success + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  duaOccasionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.success,
  },
  duaCardTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  duaCardArabic: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  duaCardTranslation: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  duaCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  tapToExpand: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textMuted,
  },

  // Modal
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
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  modalAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  modalDuration: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.primary,
  },
  modalBody: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: typography.sizes.md * 1.7,
    marginBottom: spacing.xl,
  },
  modalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  modalTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  modalTagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },

  // Dua Modal
  duaSection: {
    marginBottom: spacing.xl,
  },
  duaSectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  duaFullArabic: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "center",
    lineHeight: 44,
  },
  duaTransliteration: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.medium,
    fontStyle: "italic",
    color: colors.textSecondary,
  },
  duaTranslation: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: typography.sizes.md * 1.6,
  },
  duaBenefitsSection: {
    backgroundColor: colors.success + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    flex: 1,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },

  // Verse of the Day
  verseCard: {
    backgroundColor: colors.primary + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    letterSpacing: 1,
  },
  verseSurah: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  verseArabic: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    textAlign: "right",
    lineHeight: typography.sizes.xxl * 1.8,
    marginBottom: spacing.md,
  },
  verseTranslation: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    fontStyle: "italic",
    lineHeight: typography.sizes.md * 1.6,
    marginBottom: spacing.sm,
  },
  verseTafsir: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Video Section (Explore tab)
  videoSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },
  videoCard: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadows.md,
    marginBottom: spacing.sm,
    position: "relative",
  },
  videoThumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surfaceElevated,
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  videoDurationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
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
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  videoMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  // Blog Section (Explore tab)
  blogSection: {
    marginBottom: spacing.lg,
  },
  blogCard: {
    width: SCREEN_WIDTH * 0.7,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.sm,
  },
  blogImage: {
    width: "100%",
    height: 120,
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
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  blogTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  blogFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blogAuthor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  blogReadTime: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },

  // YouTube Videos Tab
  youtubeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.sm,
  },
  youtubeThumbnailContainer: {
    position: "relative",
  },
  youtubeThumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surfaceElevated,
  },
  youtubePlayOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  youtubeDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
  },
  youtubeDurationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: "#FFF",
  },
  youtubeInfo: {
    padding: spacing.md,
  },
  youtubeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  youtubeCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  youtubeCategoryText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    textTransform: "capitalize",
  },
  youtubeTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: typography.sizes.md * 1.4,
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
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.md,
    ...shadows.sm,
  },
  moreVideosTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semiBold,
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
    justifyContent: "center",
    gap: spacing.sm,
  },
  channelChip: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  channelChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
    color: colors.primary,
  },

  // Blog Modal
  blogModalImage: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  blogModalCategory: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  blogModalCategoryText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  blogModalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  blogModalAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  blogModalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  blogModalAuthor: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.medium,
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
  },
  blogModalTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  blogModalTagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  blogModalContent: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.regular,
    color: colors.text,
    lineHeight: typography.sizes.md * 1.8,
  },
});