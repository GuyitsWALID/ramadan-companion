import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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
              color={selectedType === type.type ? "#ffffff" : "#1a472a"}
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
                  <Ionicons name={getTypeIcon(item.type)} size={16} color="#1a472a" />
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
            <Ionicons name="search-outline" size={48} color="#ccc" />
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a472a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  typeFilter: {
    padding: 16,
    paddingTop: 0,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedChip: {
    backgroundColor: "#1a472a",
    borderColor: "#1a472a",
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a472a",
    marginLeft: 4,
  },
  selectedChipText: {
    color: "#ffffff",
  },
  categoryFilter: {
    padding: 16,
    paddingTop: 8,
  },
  categoryChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a472a",
  },
  contentList: {
    flex: 1,
    padding: 16,
  },
  contentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a472a",
    marginLeft: 4,
  },
  contentSeparator: {
    fontSize: 12,
    color: "#ccc",
    marginHorizontal: 4,
  },
  contentCategory: {
    fontSize: 12,
    color: "#666",
  },
  contentDuration: {
    fontSize: 12,
    color: "#666",
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    lineHeight: 24,
  },
  contentExcerpt: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  contentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  contentAuthor: {
    fontSize: 12,
    color: "#666",
  },
  contentPublished: {
    fontSize: 12,
    color: "#888",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
});