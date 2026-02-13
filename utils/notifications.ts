import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
// Types only: avoid importing expo-notifications at runtime in Expo Go
import type { SchedulableTriggerInputTypes, CalendarTriggerInput, DateTriggerInput, TimeIntervalTriggerInput } from "expo-notifications";

// Check if running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";

// Log warning for Expo Go users (only once at startup)
if (isExpoGo && Platform.OS === "android") {
  console.log(
    "[Notifications] Running in Expo Go - remote push notifications are not supported in Expo Go. " +
    "Use a development build for full notification support: https://docs.expo.dev/develop/development-builds/introduction/"
  );
}

// Lazy-load `expo-notifications` so importing this module in Expo Go (Android)
// does not trigger runtime errors/warnings coming from expo-notifications' top-level code.
const loadNotificationsModule = async () => {
  if (isExpoGo && Platform.OS === "android") return null;
  return (await import("expo-notifications")) as typeof import("expo-notifications");
};

// Initialize handler only when the notifications module is available
export const initNotificationsIfAvailable = async () => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

// Request permissions with Android 13+ support
export const requestNotificationPermissions = async () => {
  // Ensure handler is initialized when available
  await initNotificationsIfAvailable();

  // Skip push notification setup in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log("Skipping push notification permissions in Expo Go");
    return false;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    const { status } = await Notifications.requestPermissionsAsync({
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });
    return status === "granted";
  } else {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  }
};

// Create prayer notification channels
export const createPrayerNotificationChannels = async () => {
  // Skip in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log("Skipping notification channels in Expo Go");
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  if (Platform.OS === "android") {
    // Fajr channel (special importance)
    await Notifications.setNotificationChannelAsync("fajr-prayer", {
      name: "Fajr Prayer",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFD700",
      bypassDnd: true,
    });

    // Regular prayers channel
    await Notifications.setNotificationChannelAsync("regular-prayers", {
      name: "Regular Prayers",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250],
      lightColor: "#0D5C4D",
    });

    // Prayer reminders channel
    await Notifications.setNotificationChannelAsync("prayer-reminders", {
      name: "Prayer Reminders",
      importance: Notifications.AndroidImportance.LOW,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 100],
      lightColor: "#1976D2",
    });

    // Ramadan special channel
    await Notifications.setNotificationChannelAsync("ramadan-special", {
      name: "Ramadan Special",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: "#f9a825",
      bypassDnd: true,
    });
  }
};

// Schedule prayer notification
export const schedulePrayerNotification = async (
  prayerName: string,
  time: string,
  channelId: string = "regular-prayers"
) => {
  // Skip in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log(`Skipping ${prayerName} notification in Expo Go`);
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  try {
    const [hours, minutes] = time.split(":").map(Number);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${prayerName} Prayer Time`,
        body: `It's time for ${prayerName} prayer. May Allah accept your prayers.`,
        sound: "default",
        data: { prayerName, type: "prayer-time" },
      },
      trigger: ({
        type: "calendar",
        hour: hours,
        minute: minutes,
        repeats: true,
      } as unknown) as CalendarTriggerInput,
      identifier: `${prayerName.toLowerCase()}-daily`,
    });
    
    console.log(`Scheduled ${prayerName} notification for ${time}`);
  } catch (error) {
    console.error(`Error scheduling ${prayerName} notification:`, error);
  }
};

// Schedule Ramadan special notifications
export const scheduleRamadanNotification = async (
  type: "sehri" | "iftar",
  time: string,
  dayNumber: number
) => {
  // Skip in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log(`Skipping ${type} notification in Expo Go`);
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  try {
    const [hours, minutes] = time.split(":").map(Number);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: type === "sehri" ? "🌙 Time for Sehri" : "🌅 Iftar Time",
        body: type === "sehri" 
          ? `Sehri time for Day ${dayNumber}. Have a blessed fast!`
          : `Iftar time for Day ${dayNumber}. Break your fast with dates!`,
        sound: "default",
        data: { type, dayNumber, notificationType: "ramadan-special" },
      },
      trigger: ({
        type: "calendar",
        hour: hours,
        minute: minutes,
        repeats: false, // These will be rescheduled daily
      } as unknown) as CalendarTriggerInput,
      identifier: `ramadan-${type}-day-${dayNumber}`,
    });
    
    console.log(`Scheduled Ramadan ${type} notification for Day ${dayNumber} at ${time}`);
  } catch (error) {
    console.error(`Error scheduling Ramadan ${type} notification:`, error);
  }
};

// Schedule pre-prayer reminder
export const schedulePrayerReminder = async (
  prayerName: string,
  prayerTime: string,
  reminderMinutes: number = 15
) => {
  // Skip in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log(`Skipping ${prayerName} reminder in Expo Go`);
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  try {
    const [hours, minutes] = prayerTime.split(":").map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes - reminderMinutes, 0, 0);

    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${prayerName} Prayer Reminder`,
          body: `${prayerName} prayer starts in ${reminderMinutes} minutes. Prepare for prayer.`,
          sound: "default",
          data: { prayerName, type: "prayer-reminder" },
        },
        trigger: ({ type: "date", date: reminderTime } as unknown) as DateTriggerInput,
        identifier: `${prayerName.toLowerCase()}-reminder`,
      });
      
      console.log(`Scheduled ${prayerName} reminder for ${reminderMinutes} minutes before ${prayerTime}`);
    }
  } catch (error) {
    console.error(`Error scheduling ${prayerName} reminder:`, error);
  }
};

// Schedule Quran reading reminder (wrapper so caller doesn't import expo-notifications directly)
export const scheduleQuranReminder = async (time: string, soundEnabled = true) => {
  if (isExpoGo && Platform.OS === "android") {
    console.log("Skipping Quran reminder in Expo Go");
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  try {
    const [hours, minutes] = time.split(":").map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📖 Quran Reading Reminder",
        body: "Time for your daily Quran reading. May Allah benefit you through His words.",
        sound: soundEnabled ? "prayer-reminder.wav" : undefined,
        data: { type: "quran-reminder" },
      },
      trigger: ({
        type: "calendar",
        hour: hours,
        minute: minutes,
        repeats: true,
      } as unknown) as CalendarTriggerInput,
      identifier: "quran-reading-daily",
    });

    console.log(`Quran reading reminder scheduled for ${time}`);
  } catch (error) {
    console.error("Error scheduling Quran reminder:", error);
  }
};

// Test notification helper (safe to call from UI)
export const testNotification = async (soundEnabled = true) => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    console.log("Skipping test notification in Expo Go");
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🕌 Test Notification",
        body: "This is a test notification from Ramadan Companion!",
        sound: soundEnabled ? "adhan-regular.wav" : undefined,
      },
      trigger: ({ type: "timeInterval", seconds: 5, repeats: false } as unknown) as TimeIntervalTriggerInput,
      identifier: "test-notification",
    });
    console.log("Test notification scheduled");
  } catch (error) {
    console.error("Error scheduling test notification:", error);
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    console.log("Skipping cancelAllNotifications in Expo Go");
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All scheduled notifications cancelled");
  } catch (error) {
    console.error("Error cancelling notifications:", error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    console.log("No scheduled notifications available in Expo Go");
    return [];
  }

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
};

// Save notification settings
export const saveNotificationSettings = async (settings: {
  prayerReminders: boolean;
  quranReminders: boolean;
  ramadanReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}) => {
  try {
    await AsyncStorage.setItem("notificationSettings", JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving notification settings:", error);
  }
};

// Load notification settings
export const loadNotificationSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem("notificationSettings");
    return settings ? JSON.parse(settings) : {
      prayerReminders: true,
      quranReminders: true,
      ramadanReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  } catch (error) {
    console.error("Error loading notification settings:", error);
    return {
      prayerReminders: true,
      quranReminders: true,
      ramadanReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }
};