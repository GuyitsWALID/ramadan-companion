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
import { getAdhanByValue } from "../constants/adhan";
import { loadSelectedAdhan } from "../utils/adhanPreferences";
import {
  calculateTodayPrayerTimes,
  getNextPrayerTime,
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
      // Load settings
      const settings = await loadNotificationSettings();
      const selectedAdhan = await loadSelectedAdhan();
      await createPrayerNotificationChannels(selectedAdhan, settings.soundEnabled);
      setNotificationSettings(settings);

      setIsInitialized(true);
      console.log("Notification system initialized successfully");
    } catch (error) {
      console.error("Error initializing notifications:", error);
    }
  };

  // Schedule daily prayer notifications
  const scheduleDailyPrayerNotifications = async (
    settingsOverride?: NotificationSettings
  ) => {
    try {
      const activeSettings = settingsOverride ?? notificationSettings;
      if (!activeSettings?.prayerReminders) {
        console.log("Prayer reminders disabled");
        return;
      }

      console.log("Scheduling daily prayer notifications...");

      // Cancel existing notifications to avoid duplicates
      await cancelAllNotifications();

      // Load prayer times and settings
      const prayerTimes = await calculateTodayPrayerTimes();
      const selectedAdhan = await loadSelectedAdhan();
      const selectedAdhanConfig = getAdhanByValue(selectedAdhan);
      const prayerSound =
        activeSettings.soundEnabled && selectedAdhan !== "silent"
          ? selectedAdhanConfig.notificationSound || "default"
          : undefined;
      const channelIds = await createPrayerNotificationChannels(
        selectedAdhan,
        activeSettings.soundEnabled
      );

      // Schedule each prayer
      await schedulePrayerNotification("Fajr", prayerTimes.fajr, channelIds.fajrChannelId, prayerSound);
      await schedulePrayerNotification("Dhuhr", prayerTimes.dhuhr, channelIds.regularChannelId, prayerSound);
      await schedulePrayerNotification("Asr", prayerTimes.asr, channelIds.regularChannelId, prayerSound);
      await schedulePrayerNotification("Maghrib", prayerTimes.maghrib, channelIds.regularChannelId, prayerSound);
      await schedulePrayerNotification("Isha", prayerTimes.isha, channelIds.regularChannelId, prayerSound);

      // Schedule pre-prayer reminders
      if (activeSettings.vibrationEnabled) {
        await schedulePrayerReminder("Fajr", prayerTimes.fajr, 15, prayerSound);
        await schedulePrayerReminder("Dhuhr", prayerTimes.dhuhr, 15, prayerSound);
        await schedulePrayerReminder("Asr", prayerTimes.asr, 15, prayerSound);
        await schedulePrayerReminder("Maghrib", prayerTimes.maghrib, 15, prayerSound);
        await schedulePrayerReminder("Isha", prayerTimes.isha, 15, prayerSound);
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

      const selectedAdhan = await loadSelectedAdhan();
      const selectedAdhanConfig = getAdhanByValue(selectedAdhan);
      const prayerSound =
        notificationSettings.soundEnabled && selectedAdhan !== "silent"
          ? selectedAdhanConfig.notificationSound || "default"
          : undefined;

      console.log(`Scheduling Ramadan notifications for day ${dayNumber}`);

      // Schedule Sehri
      await scheduleRamadanNotification("sehri", sehriTime, dayNumber, prayerSound);

      // Schedule Iftar
      await scheduleRamadanNotification("iftar", iftarTime, dayNumber, prayerSound);

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
        await scheduleDailyPrayerNotifications(newSettings);
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
