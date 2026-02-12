import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface OnboardingData {
  name: string;
  location?: Location;
  calculationMethod: string;
  madhab: string;
  prayerReminders: boolean;
  quranGoal: number;
  ramadanReminders: boolean;
}

export interface UserProfile {
  _id: any;
  userId: string;
  email: string;
  name?: string;
  location?: Location;
  calculationMethod?: string;
  madhab?: string;
  prayerReminders?: boolean;
  ramadanReminders?: boolean;
  quranGoal?: number;
  onboardingCompleted?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = "@ramadan_onboarding";

// Helper: clear stale Convex Auth tokens from AsyncStorage
// This prevents old/invalid tokens from interfering with fresh sign-in/sign-up
async function clearStaleAuthTokens() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(k => k.startsWith('__convexAuth'));
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log('[Auth] Cleared stale auth tokens:', authKeys.length);
    }
  } catch (e) {
    console.error('[Auth] Error clearing stale tokens:', e);
  }
}

// Helper: retry a mutation with exponential backoff
async function retryMutation<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1500): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isAuthError = error?.message?.includes('Not authenticated') || error?.message?.includes('not authenticated');
      if (isAuthError && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Auth] Mutation failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions();
  
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);

  // Fetch user profile from Convex when authenticated
  const profile = useQuery(
    api.tracking.getProfile,
    isAuthenticated ? {} : "skip"
  );
  
  const getOrCreateProfileMutation = useMutation(api.tracking.getOrCreateProfile);
  const completeOnboardingMutation = useMutation(api.tracking.completeOnboarding);
  const updateProfileMutation = useMutation(api.tracking.updateProfile);

  // Load onboarding state from AsyncStorage
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const data = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (data) {
          setIsOnboarded(JSON.parse(data));
        }
      } catch (error) {
        console.error("Error loading onboarding state:", error);
      } finally {
        setOnboardingLoaded(true);
      }
    };
    loadOnboardingState();
  }, []);

  // When we get a profile, check onboarding status
  useEffect(() => {
    if (profile?.onboardingCompleted) {
      setIsOnboarded(true);
      AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(true)).catch(console.error);
    }
  }, [profile]);

  // Auto-create profile when user first authenticates
  useEffect(() => {
    if (isAuthenticated && profile === null && !authLoading) {
      console.log("[Auth] Creating profile for new user");
      getOrCreateProfileMutation({}).catch(console.error);
    }
  }, [isAuthenticated, profile, authLoading]);

  // Debug: log auth state changes
  useEffect(() => {
    console.log("[Auth] State:", { isAuthenticated, authLoading, profileStatus: profile === undefined ? 'loading' : profile === null ? 'null' : 'loaded', isOnboarded, onboardingLoaded });
  }, [isAuthenticated, authLoading, profile, isOnboarded, onboardingLoaded]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      console.log("[Auth] Signing in...");
      const result = await signIn("password", { email, password, flow: "signIn" });
      console.log("[Auth] Sign in result:", JSON.stringify(result));
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw new Error(error?.message || "Failed to sign in. Please check your credentials.");
    }
  }, [signIn]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      console.log("[Auth] Signing up...");
      const result = await signIn("password", { email, password, flow: "signUp" });
      console.log("[Auth] Sign up result:", JSON.stringify(result));
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw new Error(error?.message || "Failed to create account. Please try again.");
    }
  }, [signIn]);

  const handleCompleteOnboarding = useCallback(async (data: OnboardingData) => {
    console.log("[Auth] Completing onboarding, isAuthenticated:", isAuthenticated);
    try {
      // Retry with backoff in case auth token hasn't fully propagated yet
      await retryMutation(() => completeOnboardingMutation({
        name: data.name,
        location: data.location,
        calculationMethod: data.calculationMethod,
        madhab: data.madhab,
        prayerReminders: data.prayerReminders,
        ramadanReminders: data.ramadanReminders,
        quranGoal: data.quranGoal,
      }));

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(true));
      setIsOnboarded(true);
      console.log("[Auth] Onboarding completed successfully");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    }
  }, [completeOnboardingMutation, isAuthenticated]);

  const handleSignOut = useCallback(async () => {
    try {
      await convexSignOut();
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setIsOnboarded(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [convexSignOut]);

  const handleUpdateUser = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      await updateProfileMutation({
        name: updates.name,
        location: updates.location,
        calculationMethod: updates.calculationMethod,
        madhab: updates.madhab,
        prayerReminders: updates.prayerReminders,
        ramadanReminders: updates.ramadanReminders,
        quranGoal: updates.quranGoal,
        onboardingCompleted: updates.onboardingCompleted,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }, [updateProfileMutation]);

  // Don't block on profile query - it can cause infinite loading if the query
  // never resolves (e.g. auth token timing). Use authLoading + onboardingLoaded only.
  const isLoading = authLoading || !onboardingLoaded;

  return (
    <AuthContext.Provider
      value={{
        user: profile as UserProfile | null,
        isAuthenticated,
        isOnboarded,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        completeOnboarding: handleCompleteOnboarding,
        signOut: handleSignOut,
        updateUser: handleUpdateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
