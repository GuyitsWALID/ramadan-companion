import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface DonationTier {
  id: string;
  name: string;
  amount: number;
  description: string;
  benefits: string[];
  popular?: boolean;
}

const donationTiers: DonationTier[] = [
  {
    id: "bronze",
    name: "Supporter",
    amount: 5,
    description: "Support the app's development",
    benefits: [
      "Support app maintenance",
      "Your name in supporters list",
      "Remove ads (when added)",
    ],
  },
  {
    id: "silver",
    name: "Sponsor",
    amount: 15,
    description: "Help us add new features",
    benefits: [
      "All supporter benefits",
      "Early access to new features",
      "Priority support",
    ],
  },
  {
    id: "gold",
    name: "Patron",
    amount: 50,
    description: "Enable major improvements",
    benefits: [
      "All sponsor benefits",
      "Special supporter badge",
      "Monthly development updates",
    ],
  },
  {
    id: "platinum",
    name: "Benefactor",
    amount: 100,
    description: "Support the app's long-term vision",
    benefits: [
      "All patron benefits",
      "Custom app suggestions",
      "Personal thank you from team",
    ],
    popular: true,
  },
];

export default function SupportModal() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<DonationTier | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDonation = (tier: DonationTier) => {
    setSelectedTier(tier);
    processDonation(tier);
  };

  const processDonation = async (tier: DonationTier) => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert(
        "Thank You!",
        `Thank you for your generous ${tier.name} donation of $${tier.amount}!`,
        [{ text: "OK", onPress: () => setSelectedTier(null) }]
      );
    } catch (error) {
      Alert.alert("Error", "Processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="heart" size={32} color="#e91e63" />
            <Text style={styles.title}>Support Us</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Support Us?</Text>
          {[
            "Keep the app free for everyone",
            "Add new features and tools",
            "Improve accuracy of prayer times",
            "Add more Islamic resources"
          ].map((reason, i) => (
            <View key={i} style={styles.reasonItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Support Level</Text>
          {donationTiers.map((tier) => {
            const isSelected = selectedTier?.id === tier.id;
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  tier.popular && styles.popularTier,
                  isSelected && styles.selectedTier,
                ]}
                onPress={() => !isProcessing && handleDonation(tier)}
                disabled={isProcessing}
              >
                {tier.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierAmount}>${tier.amount}</Text>
                </View>
                
                <Text style={styles.tierDescription}>{tier.description}</Text>
                
                <View style={styles.benefitsList}>
                  {tier.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <Ionicons name="checkmark" size={16} color="#4caf50" />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={[
                  styles.donateButton,
                  isSelected && styles.selectedButton,
                  tier.popular && !isSelected && styles.popularButton,
                ]}>
                  <Text style={[
                    styles.buttonText,
                    (isSelected || tier.popular) && { color: "#ffffff" }
                  ]}>
                    {isProcessing && isSelected ? "Processing..." : `Donate $${tier.amount}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  title: { fontSize: 20, fontWeight: "bold", color: "#333", marginLeft: 12 },
  closeButton: { padding: 4 },
  section: { padding: 20, backgroundColor: "#ffffff", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 16 },
  reasonItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  reasonText: { fontSize: 16, color: "#333", marginLeft: 12, flex: 1 },
  tierCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  popularTier: { borderColor: "#f9a825", backgroundColor: "#fff8e1" },
  selectedTier: { borderColor: "#1a472a", backgroundColor: "#f0fdf4" },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: "#f9a825",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tierName: { fontSize: 20, fontWeight: "bold", color: "#333" },
  tierAmount: { fontSize: 24, fontWeight: "bold", color: "#1a472a" },
  tierDescription: { fontSize: 14, color: "#666", marginBottom: 16 },
  benefitsList: { marginBottom: 20 },
  benefitItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  benefitText: { fontSize: 14, color: "#333", marginLeft: 8, flex: 1, lineHeight: 20 },
  donateButton: { backgroundColor: "#e0e0e0", borderRadius: 8, padding: 16, alignItems: "center" },
  selectedButton: { backgroundColor: "#1a472a" },
  popularButton: { backgroundColor: "#f9a825" },
  buttonText: { fontSize: 16, fontWeight: "bold", color: "#333" },
});