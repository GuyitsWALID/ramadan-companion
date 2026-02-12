import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Check if running in Expo Go
export const isExpoGo = Constants.appOwnership === "expo";

// Log warning for Expo Go users (only once at startup)
if (isExpoGo && Platform.OS === "android") {
  console.log(
    "[Notifications] Running in Expo Go - push notifications are limited. " +
    "Use a development build for full notification support."
  );
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions with Android 13+ support
export const requestNotificationPermissions = async () => {
  // Skip push notification setup in Expo Go on Android
  if (isExpoGo && Platform.OS === "android") {
    console.log("Skipping push notification permissions in Expo Go");
    return false;
  }

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

  try {
    const [hours, minutes] = time.split(":").map(Number);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${prayerName} Prayer Time`,
        body: `It's time for ${prayerName} prayer. May Allah accept your prayers.`,
        sound: "default",
        data: { prayerName, type: "prayer-time" },
        categoryId: "prayer-time-category",
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
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
        categoryId: "ramadan-category",
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: false, // These will be rescheduled daily
      },
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
          categoryId: "prayer-reminder-category",
        },
        trigger: { date: reminderTime },
        identifier: `${prayerName.toLowerCase()}-reminder`,
      });
      
      console.log(`Scheduled ${prayerName} reminder for ${reminderMinutes} minutes before ${prayerTime}`);
    }
  } catch (error) {
    console.error(`Error scheduling ${prayerName} reminder:`, error);
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All scheduled notifications cancelled");
  } catch (error) {
    console.error("Error cancelling notifications:", error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
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