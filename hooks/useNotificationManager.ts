import { useState, useEffect } from "react";
import {
  requestNotificationPermissions,
  createPrayerNotificationChannels,
  schedulePrayerNotification,
  schedulePrayerReminder,
  scheduleRamadanNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  saveNotificationSettings,
  loadNotificationSettings,
  scheduleQuranReminder as scheduleQuranReminderNative,
  testNotification as testNotificationNative,
} from "../utils/notifications";
import {
  calculateTodayPrayerTimes,
  getNextPrayerTime,
  loadPrayerSettings,
  loadLocationData,
} from "../utils/prayerTimes";

interface NotificationSettings {
  prayerReminders: boolean;
  quranReminders: boolean;
  ramadanReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const useNotificationManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);

  // Initialize notifications system
  const initializeNotifications = async () => {
    try {
      console.log("Initializing notification system...");

      // Request permissions
      const granted = await requestNotificationPermissions();
      setHasPermissions(granted);

      if (!granted) {
        console.warn("Notification permissions not granted");
        return;
      }

      // Create notification channels
      await createPrayerNotificationChannels();

      // Load settings
      const settings = await loadNotificationSettings();
      setNotificationSettings(settings);

      setIsInitialized(true);
      console.log("Notification system initialized successfully");
    } catch (error) {
      console.error("Error initializing notifications:", error);
    }
  };

  // Schedule daily prayer notifications
  const scheduleDailyPrayerNotifications = async () => {
    try {
      if (!notificationSettings?.prayerReminders) {
        console.log("Prayer reminders disabled");
        return;
      }

      console.log("Scheduling daily prayer notifications...");

      // Cancel existing notifications to avoid duplicates
      await cancelAllNotifications();

      // Load prayer times and settings
      const prayerTimes = await calculateTodayPrayerTimes();
      const prayerSettings = await loadPrayerSettings();
      const location = await loadLocationData();

      // Schedule each prayer
      await schedulePrayerNotification("Fajr", prayerTimes.fajr, "fajr-prayer");
      await schedulePrayerNotification("Dhuhr", prayerTimes.dhuhr, "regular-prayers");
      await schedulePrayerNotification("Asr", prayerTimes.asr, "regular-prayers");
      await schedulePrayerNotification("Maghrib", prayerTimes.maghrib, "regular-prayers");
      await schedulePrayerNotification("Isha", prayerTimes.isha, "regular-prayers");

      // Schedule pre-prayer reminders
      if (notificationSettings.vibrationEnabled) {
        await schedulePrayerReminder("Fajr", prayerTimes.fajr, 15);
        await schedulePrayerReminder("Dhuhr", prayerTimes.dhuhr, 15);
        await schedulePrayerReminder("Asr", prayerTimes.asr, 15);
        await schedulePrayerReminder("Maghrib", prayerTimes.maghrib, 15);
        await schedulePrayerReminder("Isha", prayerTimes.isha, 15);
      }

      console.log("Daily prayer notifications scheduled");
    } catch (error) {
      console.error("Error scheduling daily prayer notifications:", error);
    }
  };

  // Schedule Ramadan notifications
  const scheduleRamadanNotifications = async (dayNumber: number, sehriTime: string, iftarTime: string) => {
    try {
      if (!notificationSettings?.ramadanReminders) {
        console.log("Ramadan reminders disabled");
        return;
      }

      console.log(`Scheduling Ramadan notifications for day ${dayNumber}`);

      // Schedule Sehri
      await scheduleRamadanNotification("sehri", sehriTime, dayNumber);

      // Schedule Iftar
      await scheduleRamadanNotification("iftar", iftarTime, dayNumber);

      console.log(`Ramadan notifications scheduled for day ${dayNumber}`);
    } catch (error) {
      console.error(`Error scheduling Ramadan notifications for day ${dayNumber}:`, error);
    }
  };

  // Schedule Quran reading reminder
  const scheduleQuranReminder = async (time: string) => {
    try {
      if (!notificationSettings?.quranReminders) {
        console.log("Quran reminders disabled");
        return;
      }

      await scheduleQuranReminderNative(time, notificationSettings.soundEnabled);
    } catch (error) {
      console.error("Error scheduling Quran reminder:", error);
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      await saveNotificationSettings(newSettings);
      setNotificationSettings(newSettings);
      
      // Reschedule notifications with new settings
      if (newSettings.prayerReminders) {
        await scheduleDailyPrayerNotifications();
      } else {
        await cancelAllNotifications();
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
    }
  };

  // Test notification (uses safe native wrapper)
  const testNotification = async () => {
    try {
      await testNotificationNative(notificationSettings?.soundEnabled ?? true);
      console.log("Test notification scheduled (wrapper)");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
    }
  };

  // Get next prayer notification info
  const getNextPrayerInfo = async () => {
    try {
      const nextPrayer = await getNextPrayerTime();
      if (nextPrayer) {
        const hours = Math.floor(nextPrayer.minutesUntil / 60);
        const minutes = nextPrayer.minutesUntil % 60;
        
        return {
          prayer: nextPrayer.name,
          time: nextPrayer.time,
          timeUntil: `${hours}h ${minutes}m`,
          minutesUntil: nextPrayer.minutesUntil,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting next prayer info:", error);
      return null;
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  // Auto-reschedule notifications daily
  useEffect(() => {
    if (isInitialized && notificationSettings?.prayerReminders) {
      scheduleDailyPrayerNotifications();
    }
  }, [isInitialized, notificationSettings?.prayerReminders]);

  return {
    isInitialized,
    hasPermissions,
    notificationSettings,
    initializeNotifications,
    scheduleDailyPrayerNotifications,
    scheduleRamadanNotifications,
    scheduleQuranReminder,
    updateNotificationSettings,
    testNotification,
    getNextPrayerInfo,
    getScheduledNotifications,
    cancelAllNotifications,
  };
};