import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { typography, spacing, borderRadius } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

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
  const { colors, shadows } = useTheme();
  const styles = getStyles(colors, shadows);
  const buyMeACoffeeUrl = "https://buymeacoffee.com/WaliyawTech";

  const handleDonation = async () => {
    try {
      const supported = await Linking.canOpenURL(buyMeACoffeeUrl);
      if (!supported) {
        Alert.alert("Error", "Could not open donation page.");
        return;
      }
      await Linking.openURL(buyMeACoffeeUrl);
    } catch (error) {
      Alert.alert("Error", "Could not open donation page. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="heart" size={32} color={colors.error} />
            <Text style={styles.title}>Support Us</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
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
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Support Level</Text>
          {donationTiers.map((tier) => {
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  tier.popular && styles.popularTier,
                ]}
                onPress={handleDonation}
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
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={[
                  styles.donateButton,
                  tier.popular && styles.popularButton,
                ]}>
                  <Text style={[
                    styles.buttonText,
                    tier.popular && { color: colors.textOnPrimary }
                  ]}>
                    {`Donate $${tier.amount}`}
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

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  title: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text, marginLeft: spacing.md },
  closeButton: { padding: spacing.xs },
  section: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.lg, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: spacing.lg },
  reasonItem: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  reasonText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.regular, color: colors.text, marginLeft: spacing.md, flex: 1 },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  popularTier: { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  selectedTier: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  popularBadgeText: { color: colors.textOnPrimary, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bold },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  tierName: { fontSize: typography.sizes.xl, fontFamily: typography.fonts.bold, color: colors.text },
  tierAmount: { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.bold, color: colors.primary },
  tierDescription: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.textSecondary, marginBottom: spacing.lg },
  benefitsList: { marginBottom: spacing.lg },
  benefitItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  benefitText: { fontSize: typography.sizes.sm, fontFamily: typography.fonts.regular, color: colors.text, marginLeft: spacing.sm, flex: 1, lineHeight: 20 },
  donateButton: { backgroundColor: colors.border, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: "center" },
  selectedButton: { backgroundColor: colors.primary },
  popularButton: { backgroundColor: colors.secondary },
  buttonText: { fontSize: typography.sizes.md, fontFamily: typography.fonts.bold, color: colors.text },
});
