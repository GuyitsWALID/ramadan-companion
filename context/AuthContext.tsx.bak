import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

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
  quranGoal: number; // verses per day
  ramadanReminders: boolean;
}

interface User {
  _id: Id<"users">;
  email: string;
  name?: string;
  location?: Location;
  onboardingCompleted?: boolean;
  calculationMethod?: string;
  madhab?: string;
  quranGoal?: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<{ success: boolean; needsOnboarding: boolean }>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@ramadan_auth";
const ONBOARDING_STORAGE_KEY = "@ramadan_onboarding";

// Simple verification code storage (in production, use secure server-side verification)
let pendingVerifications: { [email: string]: { code: string; expires: number } } = {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Convex mutations
  const createUserMutation = useMutation(api.users.createUser);
  const updateUserLocationMutation = useMutation(api.users.updateUserLocation);

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [authData, onboardingData] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
      ]);

      if (authData) {
        const parsedUser = JSON.parse(authData);
        setUser(parsedUser);
      }

      if (onboardingData) {
        setIsOnboarded(JSON.parse(onboardingData));
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const signInWithEmail = async (email: string): Promise<void> => {
    try {
      // Generate verification code
      const code = generateVerificationCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store pending verification and email
      pendingVerifications[email] = { code, expires };
      setPendingEmail(email);

      // In production, you would send this via email
      // For demo purposes, we'll log the code
      console.log(`Verification code for ${email}: ${code}`);
      
      // Show alert for demo purposes
      alert(`Demo: Your verification code is ${code}`);
    } catch (error) {
      console.error("Error sending verification:", error);
      throw new Error("Failed to send verification code");
    }
  };

  const verifyCode = async (code: string): Promise<{ success: boolean; needsOnboarding: boolean }> => {
    try {
      if (!pendingEmail) {
        throw new Error("No pending email verification");
      }

      const pending = pendingVerifications[pendingEmail];
      
      if (!pending) {
        throw new Error("Verification expired. Please try again.");
      }

      if (Date.now() > pending.expires) {
        delete pendingVerifications[pendingEmail];
        throw new Error("Verification code expired. Please request a new one.");
      }

      if (pending.code !== code) {
        throw new Error("Invalid verification code");
      }

      // Code is valid - create or get user
      delete pendingVerifications[pendingEmail];
      const email = pendingEmail;
      setPendingEmail(null);

      // Create user in Convex
      const userId = await createUserMutation({ email });

      const newUser: User = {
        _id: userId,
        email,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);

      // Check if user needs onboarding
      const needsOnboarding = !isOnboarded;

      return { success: true, needsOnboarding };
    } catch (error: any) {
      console.error("Error verifying code:", error);
      throw error;
    }
  };

  const completeOnboarding = async (data: OnboardingData) => {
    if (!user) return;

    try {
      // Update user with onboarding data
      const updatedUser: User = {
        ...user,
        name: data.name,
        location: data.location,
        calculationMethod: data.calculationMethod,
        madhab: data.madhab,
        quranGoal: data.quranGoal,
        onboardingCompleted: true,
      };

      // Update in Convex if location is provided
      if (data.location && user._id) {
        await updateUserLocationMutation({
          userId: user._id,
          location: data.location,
        });
      }

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(true));

      setUser(updatedUser);
      setIsOnboarded(true);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, ONBOARDING_STORAGE_KEY]);
      setUser(null);
      setIsOnboarded(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isOnboarded,
        isLoading,
        signInWithEmail,
        verifyCode,
        completeOnboarding,
        signOut,
        updateUser,
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
