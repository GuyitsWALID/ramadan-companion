import { ConvexProvider, ConvexReactClient } from "convex/react";
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
import { UserProvider } from "../context/UserContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

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
    const inTabsGroup = segments[0] === "(tabs)";

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated, redirect to auth
      router.replace("/(auth)");
    } else if (isAuthenticated && !isOnboarded && segments[1] !== "onboarding") {
      // User is authenticated but hasn't completed onboarding
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && isOnboarded && inAuthGroup) {
      // User is fully set up, redirect to main app
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isOnboarded, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  // 3. Load Inter Fonts
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
    <ConvexProvider client={convex}>
      <AuthProvider>
        <UserProvider>
          <NavigationGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="support" options={{ presentation: "modal" }} />
            </Stack>
          </NavigationGuard>
        </UserProvider>
      </AuthProvider>
    </ConvexProvider>
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