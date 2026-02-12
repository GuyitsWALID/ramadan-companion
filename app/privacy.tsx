import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { typography, spacing, borderRadius } from "../constants/theme";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: February 12, 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          Ramadan Companion collects the following information to provide you with accurate prayer
          times, Qibla direction, and a personalized Ramadan experience:{"\n\n"}
          • <Text style={styles.bold}>Email address</Text> — for account creation and sign-in{"\n"}
          • <Text style={styles.bold}>Name</Text> — for personalization (optional){"\n"}
          • <Text style={styles.bold}>Location data</Text> — latitude/longitude for prayer time
          calculation and Qibla direction. Location is only accessed when you grant permission and
          is stored securely.{"\n"}
          • <Text style={styles.bold}>Prayer & fasting tracking data</Text> — records of your
          prayer completions, fasting days, and Quran reading progress{"\n"}
          • <Text style={styles.bold}>Preferences</Text> — calculation method, madhab, notification
          settings, theme preference
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information solely to:{"\n\n"}
          • Calculate accurate prayer times for your location{"\n"}
          • Determine Qibla direction{"\n"}
          • Send prayer and Ramadan reminder notifications (when enabled){"\n"}
          • Track and display your worship progress and statistics{"\n"}
          • Sync your data across devices via your account{"\n\n"}
          We do <Text style={styles.bold}>not</Text> sell, share, or monetize your personal data.
        </Text>

        <Text style={styles.sectionTitle}>3. Data Storage & Security</Text>
        <Text style={styles.body}>
          Your data is stored securely using Convex, a modern backend platform with encryption at
          rest and in transit. Local data is stored on your device using secure storage APIs.
          We implement industry-standard security measures to protect your information.
        </Text>

        <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
        <Text style={styles.body}>
          We use the following third-party services:{"\n\n"}
          • <Text style={styles.bold}>Convex</Text> — backend data storage and real-time sync{"\n"}
          • <Text style={styles.bold}>Al Quran Cloud API</Text> — Quran text and audio recitations{"\n"}
          • <Text style={styles.bold}>Expo Notifications</Text> — push notification delivery{"\n\n"}
          These services have their own privacy policies governing their use of data.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to:{"\n\n"}
          • Access your personal data{"\n"}
          • Delete your account and associated data{"\n"}
          • Disable location access at any time{"\n"}
          • Opt out of notifications{"\n"}
          • Export your tracking data{"\n\n"}
          To exercise any of these rights, contact us at privacy@ramadancompanion.app
        </Text>

        <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
        <Text style={styles.body}>
          Ramadan Companion is suitable for users of all ages. We do not knowingly collect
          additional personal information from children under 13 beyond what is described in this
          policy.
        </Text>

        <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this privacy policy from time to time. We will notify you of any changes
          by posting the new policy in the app. You are advised to review this page periodically.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this privacy policy, please contact us at:{"\n\n"}
          privacy@ramadancompanion.app
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    lastUpdated: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.regular,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bold,
      color: colors.text,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    body: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.regular,
      color: colors.textSecondary,
      lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    },
    bold: {
      fontFamily: typography.fonts.semiBold,
      color: colors.text,
    },
  });
