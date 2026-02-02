/**
 * Widget Data Provider
 * Provides data for home screen widgets (when platform support is available)
 * Can be used with expo-widgets or react-native-widget-extension
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WidgetData {
  lastUpdated: string;
  nextPrayer: {
    name: string;
    time: string;
    remaining: string;
  } | null;
  todayProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  ramadanDay: number | null;
  quranStreak: number;
  iftarTime: string | null;
  sehriTime: string | null;
}

const WIDGET_DATA_KEY = "@widget_data";
const WIDGET_SETTINGS_KEY = "@widget_settings";

export interface WidgetSettings {
  showNextPrayer: boolean;
  showPrayerProgress: boolean;
  showRamadanCountdown: boolean;
  showQuranStreak: boolean;
  refreshInterval: number; // in minutes
  theme: "light" | "dark" | "system";
}

const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  showNextPrayer: true,
  showPrayerProgress: true,
  showRamadanCountdown: true,
  showQuranStreak: true,
  refreshInterval: 15,
  theme: "system",
};

/**
 * Update widget data
 * Called when prayer times, progress, or other relevant data changes
 */
export async function updateWidgetData(data: Partial<WidgetData>): Promise<void> {
  try {
    const existing = await getWidgetData();
    const updated: WidgetData = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(updated));
    
    // Here you would trigger a widget refresh if using a widget library
    // For example: await WidgetKit.reloadAllTimelines(); // iOS
    // Or: await SharedGroupPreferences.setItem(...) // Android
    
  } catch (error) {
    console.error("Error updating widget data:", error);
  }
}

/**
 * Get current widget data
 */
export async function getWidgetData(): Promise<WidgetData> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error getting widget data:", error);
  }
  
  return {
    lastUpdated: new Date().toISOString(),
    nextPrayer: null,
    todayProgress: { completed: 0, total: 5, percentage: 0 },
    ramadanDay: null,
    quranStreak: 0,
    iftarTime: null,
    sehriTime: null,
  };
}

/**
 * Save widget settings
 */
export async function saveWidgetSettings(settings: Partial<WidgetSettings>): Promise<void> {
  try {
    const current = await getWidgetSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving widget settings:", error);
  }
}

/**
 * Get widget settings
 */
export async function getWidgetSettings(): Promise<WidgetSettings> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_SETTINGS_KEY);
    if (data) {
      return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error("Error getting widget settings:", error);
  }
  return DEFAULT_WIDGET_SETTINGS;
}

/**
 * Calculate time remaining until a specific time
 */
export function calculateTimeRemaining(targetTime: string): string {
  try {
    const [hours, minutes] = targetTime.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    // If the target time has passed, assume it's tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target.getTime() - now.getTime();
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  } catch (error) {
    return "--";
  }
}

/**
 * Get widget types available for the platform
 */
export function getAvailableWidgetTypes(): { id: string; name: string; description: string; size: string }[] {
  return [
    {
      id: "next-prayer",
      name: "Next Prayer",
      description: "Shows the next prayer time with countdown",
      size: "Small (2x1)",
    },
    {
      id: "prayer-progress",
      name: "Prayer Progress",
      description: "Today's prayer completion progress",
      size: "Small (2x2)",
    },
    {
      id: "ramadan-countdown",
      name: "Ramadan Countdown",
      description: "Days remaining in Ramadan with Iftar time",
      size: "Medium (4x2)",
    },
    {
      id: "daily-summary",
      name: "Daily Summary",
      description: "Prayer times, Quran streak, and Ramadan day",
      size: "Large (4x4)",
    },
    {
      id: "quran-streak",
      name: "Quran Streak",
      description: "Current Quran reading streak",
      size: "Small (2x1)",
    },
  ];
}

/**
 * Widget data sync interval
 * Call this periodically to keep widget data fresh
 */
export async function syncWidgetData(prayerTimes: any[], quranStreak: number, ramadanDay: number | null): Promise<void> {
  // Find next prayer
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  
  let nextPrayer = null;
  let completed = 0;
  
  for (const prayer of prayerTimes) {
    if (prayer.name === "Sunrise") continue;
    
    if (prayer.completed) {
      completed++;
    }
    
    if (!nextPrayer && prayer.time > currentTimeStr) {
      nextPrayer = {
        name: prayer.name,
        time: prayer.time,
        remaining: calculateTimeRemaining(prayer.time),
      };
    }
  }
  
  // If no next prayer today, first prayer is next (Fajr tomorrow)
  if (!nextPrayer && prayerTimes.length > 0) {
    const fajr = prayerTimes.find(p => p.name === "Fajr");
    if (fajr) {
      nextPrayer = {
        name: fajr.name,
        time: fajr.time,
        remaining: calculateTimeRemaining(fajr.time),
      };
    }
  }
  
  // Get Sehri (Fajr) and Iftar (Maghrib) times for Ramadan
  const fajr = prayerTimes.find(p => p.name === "Fajr");
  const maghrib = prayerTimes.find(p => p.name === "Maghrib");
  
  await updateWidgetData({
    nextPrayer,
    todayProgress: {
      completed,
      total: 5,
      percentage: (completed / 5) * 100,
    },
    ramadanDay,
    quranStreak,
    sehriTime: fajr?.time || null,
    iftarTime: maghrib?.time || null,
  });
}
