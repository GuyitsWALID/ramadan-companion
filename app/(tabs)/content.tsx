import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Dimensions, Linking } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

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

type TabType = "explore" | "hadiths" | "duas" | "saved";

export default function ContentScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const [filteredContent, setFilteredContent] = useState(mockContent);
  const [todayHadith, setTodayHadith] = useState<Hadith>(dailyHadiths[0]);
  
  const featuredScrollRef = useRef<ScrollView>(null);

  // Load saved items
  useEffect(() => {
    loadSavedItems();
  }, []);

  // Set today's hadith
  useEffect(() => {
    const today = new Date().getDay();
    setTodayHadith(dailyHadiths[today % dailyHadiths.length]);
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
});