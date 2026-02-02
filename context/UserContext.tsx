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

interface QuranReadingPlan {
  dailyVerses: number;
  currentJuz: number;
  completedJuz: number[];
  startDate: string;
}

interface UserSettings {
  prayerReminders: boolean;
  quranReminders: boolean;
  ramadanReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  language: string;
  calculationMethod: string;
}

interface User {
  _id?: Id<"users">;
  email: string;
  name?: string;
  location?: Location;
  prayerReminders?: boolean;
  quranReadingPlan?: QuranReadingPlan;
  createdAt?: string;
}

interface UserContextType {
  user: User | null;
  userId: Id<"users"> | null;
  settings: UserSettings;
  loading: boolean;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateLocation: (location: Location) => Promise<void>;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  prayerReminders: true,
  quranReminders: true,
  ramadanReminders: true,
  soundEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  language: "english",
  calculationMethod: "MuslimWorldLeague",
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@ramadan_companion_user";
const SETTINGS_STORAGE_KEY = "@ramadan_companion_settings";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Convex mutations
  const createUserMutation = useMutation(api.users.createUser);
  const updateLocationMutation = useMutation(api.users.updateUserLocation);

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedUser, storedSettings] = await Promise.all([
        AsyncStorage.getItem(USER_STORAGE_KEY),
        AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
      ]);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const login = async (email: string, name?: string) => {
    try {
      setLoading(true);
      
      // Create user in Convex
      const userId = await createUserMutation({ email, name });
      
      const newUser: User = {
        _id: userId,
        email,
        name,
        createdAt: new Date().toISOString(),
      };

      await saveUser(newUser);
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
      setUser(null);
      setSettings(defaultSettings);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    await saveUser(updatedUser);
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...updates };
    await saveSettings(updatedSettings);
  };

  const updateLocation = async (location: Location) => {
    if (!user) return;

    try {
      // Update in Convex if we have a user ID
      if (user._id) {
        await updateLocationMutation({
          userId: user._id,
          location,
        });
      }

      // Update local state
      const updatedUser = { ...user, location };
      await saveUser(updatedUser);
    } catch (error) {
      console.error("Error updating location:", error);
      throw error;
    }
  };

  const value: UserContextType = {
    user,
    userId: user?._id || null,
    settings,
    loading,
    isAuthenticated: !!user,
    updateUser,
    updateSettings,
    updateLocation,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;
