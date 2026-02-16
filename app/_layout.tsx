import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran";
import { UserProvider } from "../context/UserContext";
import { useUser } from "../context/UserContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NetworkProvider, useNetwork } from "../context/NetworkContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { useNotificationManager } from "../hooks/useNotificationManager";
import { lightColors as colors } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../components/OfflineBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. Initialize Convex
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// 2. Keep Splash Screen visible
SplashScreen.preventAutoHideAsync();

// Navigation guard component
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    console.log("[NavGuard]", { isAuthenticated, isOnboarded, inAuthGroup, segments: segments.join("/") });

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated, redirect to auth
      router.replace("/(auth)");
    } else if (isAuthenticated && !isOnboarded && inAuthGroup && segments[1] !== "onboarding") {
      // User is authenticated but hasn't completed onboarding
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && isOnboarded && inAuthGroup) {
      // User is fully set up, redirect to main app
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isOnboarded, isLoading, segments]);

  return <>{children}</>;
}

// Offline banner wrapper
function OfflineBannerWrapper({ children }: { children: React.ReactNode }) {
  const { 
    isOffline, 
    showOfflineBanner, 
    dismissBanner, 
    offlineQueueSize, 
    syncPending,
    syncOfflineActions,
    lastSyncTime 
  } = useNetwork();

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner
        isOffline={showOfflineBanner}
        onDismiss={dismissBanner}
        pendingActions={offlineQueueSize}
        syncPending={syncPending}
        onSync={syncOfflineActions}
        lastSyncTime={lastSyncTime}
      />
      {children}
    </View>
  );
}

function NotificationBootstrap({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useUser();
  const { isInitialized, updateNotificationSettings } = useNotificationManager();

  useEffect(() => {
    if (loading || !isInitialized) return;

    updateNotificationSettings({
      prayerReminders: settings.prayerReminders,
      quranReminders: settings.quranReminders,
      ramadanReminders: settings.ramadanReminders,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
    }).catch((error) => {
      console.error("Error syncing notification settings:", error);
    });
  }, [
    loading,
    isInitialized,
    settings.prayerReminders,
    settings.quranReminders,
    settings.ramadanReminders,
    settings.soundEnabled,
    settings.vibrationEnabled,
    updateNotificationSettings,
  ]);

  return <>{children}</>;
}

export default function RootLayout() {
  // 3. Load Inter Fonts
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    AmiriQuran_400Regular,
  });

  // 4. Hide Splash Screen when ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 5. Loading State with beautiful splash
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashIconContainer}>
          <Ionicons name="moon" size={64} color={colors.secondary} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  // 6. App Content with Auth Flow
  return (
    <ErrorBoundary>
      <ConvexAuthProvider client={convex} storage={AsyncStorage}>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <NetworkProvider>
                <NotificationBootstrap>
                  <NavigationGuard>
                    <OfflineBannerWrapper>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="support" options={{ presentation: "modal" }} />
                        <Stack.Screen name="widgets" options={{ presentation: "modal" }} />
                        <Stack.Screen name="privacy" options={{ presentation: "modal" }} />
                      </Stack>
                    </OfflineBannerWrapper>
                  </NavigationGuard>
                </NotificationBootstrap>
              </NetworkProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConvexAuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  splashIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loader: {
    marginTop: 24,
  },
});
