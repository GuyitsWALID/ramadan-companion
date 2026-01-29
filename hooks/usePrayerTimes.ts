import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { 
  calculateTodayPrayerTimes, 
  calculateMonthlyPrayerTimes,
  loadPrayerSettings,
  loadLocationData,
  savePrayerSettings,
  saveLocationData,
  PrayerSettings,
  LocationData 
} from "../utils/prayerTimes";
import { savePrayerTimes } from "../convex/_generated/api";

interface PrayerTime {
  name: string;
  time: string;
  completed: boolean;
  isUpcoming?: boolean;
  minutesUntil?: number;
}

export const usePrayerTimes = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);

  // Load saved data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [savedLocation, savedSettings] = await Promise.all([
        loadLocationData(),
        loadPrayerSettings(),
      ]);
      
      setLocation(savedLocation);
      setPrayerSettings(savedSettings);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  // Calculate prayer times
  useEffect(() => {
    if (location && prayerSettings) {
      calculateAndSetPrayerTimes();
    }
  }, [location, prayerSettings]);

  const calculateAndSetPrayerTimes = async () => {
    try {
      setLoading(true);
      const times = await calculateTodayPrayerTimes(location, prayerSettings);
      
      // Determine current and next prayer
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const prayerList: PrayerTime[] = [
        { name: "Fajr", time: times.fajr, completed: false },
        { name: "Sunrise", time: times.sunrise, completed: null },
        { name: "Dhuhr", time: times.dhuhr, completed: false },
        { name: "Asr", time: times.asr, completed: false },
        { name: "Maghrib", time: times.maghrib, completed: false },
        { name: "Isha", time: times.isha, completed: false },
      ];

      // Mark completed prayers and find next prayer
      let nextPrayerFound = false;
      prayerList.forEach(prayer => {
        if (prayer.completed === null) return; // Skip sunrise
        
        const [hours, minutes] = prayer.time.split(":").map(Number);
        const prayerTime = hours * 60 + minutes;
        
        if (prayerTime < currentTime) {
          prayer.completed = true;
        } else if (!nextPrayerFound) {
          prayer.isUpcoming = true;
          prayer.minutesUntil = prayerTime - currentTime;
          nextPrayerFound = true;
          setNextPrayer(prayer);
        }
      });

      // If all prayers for today are completed, set next prayer as tomorrow's Fajr
      if (!nextPrayerFound) {
        const [hours, minutes] = times.fajr.split(":").map(Number);
        const fajrTime = hours * 60 + minutes;
        prayerList[0].isUpcoming = true;
        prayerList[0].minutesUntil = (24 * 60) - currentTime + fajrTime;
        setNextPrayer(prayerList[0]);
      }

      setPrayerTimes(prayerList);
      setLoading(false);
    } catch (error) {
      console.error("Error calculating prayer times:", error);
      setLoading(false);
    }
  };

  // Toggle prayer completion
  const togglePrayerCompletion = async (prayerName: string) => {
    const updatedPrayers = prayerTimes.map(prayer => {
      if (prayer.name === prayerName && prayer.completed !== null) {
        const newCompleted = !prayer.completed;
        
        // Save to database/log user activity
        if (newCompleted) {
          console.log(`Prayer completed: ${prayerName} at ${new Date().toISOString()}`);
        }
        
        return { ...prayer, completed: newCompleted };
      }
      return prayer;
    });

    setPrayerTimes(updatedPrayers);

    // Recalculate next prayer
    const upcomingPrayer = updatedPrayers.find(p => p.isUpcoming);
    if (upcomingPrayer) {
      setNextPrayer(upcomingPrayer);
    }
  };

  // Update location
  const updateLocation = async (newLocation: LocationData) => {
    try {
      await saveLocationData(newLocation);
      setLocation(newLocation);
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  // Update prayer settings
  const updatePrayerSettings = async (newSettings: PrayerSettings) => {
    try {
      await savePrayerSettings(newSettings);
      setPrayerSettings(newSettings);
    } catch (error) {
      console.error("Error updating prayer settings:", error);
    }
  };

  // Get monthly prayer times
  const getMonthlyPrayerTimes = async (year: number, month: number) => {
    try {
      if (!location || !prayerSettings) {
        throw new Error("Location or prayer settings not available");
      }
      
      return await calculateMonthlyPrayerTimes(year, month, location, prayerSettings);
    } catch (error) {
      console.error("Error getting monthly prayer times:", error);
      return [];
    }
  };

  // Refresh prayer times
  const refreshPrayerTimes = async () => {
    await calculateAndSetPrayerTimes();
  };

  // Format time until next prayer
  const formatTimeUntil = (minutes?: number): string => {
    if (!minutes) return "";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return {
    prayerTimes,
    nextPrayer,
    location,
    prayerSettings,
    loading,
    togglePrayerCompletion,
    updateLocation,
    updatePrayerSettings,
    getMonthlyPrayerTimes,
    refreshPrayerTimes,
    formatTimeUntil,
  };
};