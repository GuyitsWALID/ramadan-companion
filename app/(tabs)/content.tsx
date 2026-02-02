import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius, shadows } from "../../constants/theme";

interface ContentItem {
  id: string;
  title: string;
  type: "article" | "video" | "podcast";
  excerpt: string;
  author: string;
  readTime?: string;
  duration?: string;
  imageUrl?: string;
  category: string;
  tags: string[];
  publishedAt: string;
}

// Mock content data
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
];

const categories = [
  "All",
  "Spirituality",
  "Ramadan Special",
  "Quran",
  "Prayer",
  "Charity",
  "Health",
];

const contentTypes = [
  { type: "All", icon: "apps" },
  { type: "Article", icon: "document-text-outline" },
  { type: "Video", icon: "videocam-outline" },
  { type: "Podcast", icon: "podcast-outline" },
];

export default function ContentScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [filteredContent, setFilteredContent] = useState(mockContent);

  // Filter content based on selected category and type
  useEffect(() => {
    let filtered = mockContent;

    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedType !== "All") {
      filtered = filtered.filter(item => 
        item.type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    setFilteredContent(filtered);
  }, [selectedCategory, selectedType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article":
        return "document-text-outline";
      case "video":
        return "videocam-outline";
      case "podcast":
        return "podcast-outline";
      default:
        return "document-outline";
    }
  };

  const formatDuration = (duration: string, readTime?: string) => {
    if (duration) return duration;
    if (readTime) return readTime;
    return "Unknown";
  };

  const handleContentPress = (item: ContentItem) => {
    console.log(`Opening content: ${item.title}`);
    // In a real app, this would navigate to content details
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Islamic Library</Text>
        <Text style={styles.subtitle}>Learn and grow your faith</Text>
      </View>

      {/* Content Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilter}>
        {contentTypes.map((type) => (
          <TouchableOpacity
            key={type.type}
            style={[
              styles.typeChip,
              selectedType === type.type && styles.selectedChip,
            ]}
            onPress={() => setSelectedType(type.type)}
          >
            <Ionicons
              name={type.icon as any}
              size={16}
              color={selectedType === type.type ? colors.textOnPrimary : colors.primary}
            />
            <Text style={[
              styles.typeChipText,
              selectedType === type.type && styles.selectedChipText,
            ]}>
              {type.type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.selectedChip,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.selectedChipText,
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      <ScrollView style={styles.contentList} showsVerticalScrollIndicator={false}>
        {filteredContent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.contentCard}
            onPress={() => handleContentPress(item)}
          >
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.contentImage} />
            )}
            
            <View style={styles.contentInfo}>
              <View style={styles.contentHeader}>
                <View style={styles.contentMeta}>
                  <Ionicons name={getTypeIcon(item.type)} size={16} color={colors.primary} />
                  <Text style={styles.contentType}>{item.type}</Text>
                  <Text style={styles.contentSeparator}>•</Text>
                  <Text style={styles.contentCategory}>{item.category}</Text>
                </View>
                <Text style={styles.contentDuration}>
                  {formatDuration(item.duration, item.readTime)}
                </Text>
              </View>

              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentExcerpt}>{item.excerpt}</Text>

              <View style={styles.contentFooter}>
                <Text style={styles.contentAuthor}>By {item.author}</Text>
                <Text style={styles.contentPublished}>{item.publishedAt}</Text>
              </View>

              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredContent.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.border} />
            <Text style={styles.emptyStateText}>No content found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try selecting different filters
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
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
  typeFilter: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  selectedChipText: {
    color: colors.textOnPrimary,
  },
  categoryFilter: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
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
  categoryChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
  },
  contentList: {
    flex: 1,
    padding: spacing.lg,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  contentImage: {
    width: "100%",
    height: 180,
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
  contentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentType: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.semiBold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  contentSeparator: {
    fontSize: typography.sizes.xs,
    color: colors.border,
    marginHorizontal: spacing.xs,
  },
  contentCategory: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  contentDuration: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  contentTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: typography.sizes.lg * 1.3,
  },
  contentExcerpt: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * 1.5,
    marginBottom: spacing.md,
  },
  contentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  contentAuthor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
  contentPublished: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
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
  },
});