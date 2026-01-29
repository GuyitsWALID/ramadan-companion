import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts, SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

// 1. Initialize Convex
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// 2. Keep Splash Screen visible
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 3. Load Fonts Safely (No local file paths needed!)
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: SpaceMono_400Regular,
  });

  // 4. Hide Splash Screen when ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 5. Loading State
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#1a472a" />
      </View>
    );
  }

  // 6. App Content
  return (
    <ConvexProvider client={convex}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* This points to app/(tabs) folder */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ConvexProvider>
  );
}