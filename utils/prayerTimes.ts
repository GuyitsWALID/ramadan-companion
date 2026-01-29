import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from "adhan";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface PrayerSettings {
  calculationMethod: string;
  madhab: string;
}

const DEFAULT_SETTINGS: PrayerSettings = {
  calculationMethod: "MuslimWorldLeague",
  madhab: "Shafi",
};

const DEFAULT_LOCATION: LocationData = {
  latitude: 21.4225,
  longitude: 39.8262,
  city: "Makkah",
  country: "Saudi Arabia",
};

// Helper: Format Date to 24h string (HH:mm)
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// 1. Get current location
export const getCurrentLocation = async (): Promise<LocationData> => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return DEFAULT_LOCATION;

    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("Location error:", error);
    return DEFAULT_LOCATION;
  }
};

// 2. CORE CALCULATION ENGINE (Used by all functions)
const getAdhanTimes = (date: Date, loc: LocationData, settings: PrayerSettings): PrayerTimesData => {
  const coords = new Coordinates(loc.latitude, loc.longitude);
  
  let params;
  switch (settings.calculationMethod) {
    case "UmmAlQura": params = CalculationMethod.UmmAlQura(); break;
    case "NorthAmerica": params = CalculationMethod.NorthAmerica(); break;
    case "Dubai": params = CalculationMethod.Dubai(); break;
    case "MoonsightingCommittee": params = CalculationMethod.MoonsightingCommittee(); break;
    case "Kuwait": params = CalculationMethod.Kuwait(); break;
    case "Qatar": params = CalculationMethod.Qatar(); break;
    case "Singapore": params = CalculationMethod.Singapore(); break;
    default: params = CalculationMethod.MuslimWorldLeague();
  }

  params.madhab = settings.madhab === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;

  const prayerTimes = new PrayerTimes(coords, date, params);
  
  return {
    fajr: formatTime(prayerTimes.fajr),
    sunrise: formatTime(prayerTimes.sunrise),
    dhuhr: formatTime(prayerTimes.dhuhr),
    asr: formatTime(prayerTimes.asr),
    maghrib: formatTime(prayerTimes.maghrib),
    isha: formatTime(prayerTimes.isha),
  };
};

// 3. Exported Calculation Functions
export const calculateTodayPrayerTimes = async (location?: LocationData, settings?: PrayerSettings) => {
  const loc = location || (await loadLocationData());
  const prayerSettings = settings || (await loadPrayerSettings());
  return getAdhanTimes(new Date(), loc, prayerSettings);
};

export const calculatePrayerTimesForDate = async (date: Date, location?: LocationData, settings?: PrayerSettings) => {
  const loc = location || (await loadLocationData());
  const prayerSettings = settings || (await loadPrayerSettings());
  return getAdhanTimes(date, loc, prayerSettings);
};

export const calculateMonthlyPrayerTimes = async (year: number, month: number, location?: LocationData, settings?: PrayerSettings) => {
  const loc = location || (await loadLocationData());
  const prayerSettings = settings || (await loadPrayerSettings());
  const monthlyTimes = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    monthlyTimes.push({
      date: date.toISOString().split('T')[0],
      prayerTimes: getAdhanTimes(date, loc, prayerSettings),
    });
  }
  return monthlyTimes;
};

// 4. Next Prayer & Countdown
export const getNextPrayerTime = async (currentTimes?: PrayerTimesData) => {
  const times = currentTimes || (await calculateTodayPrayerTimes());
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: "Fajr", time: times.fajr },
    { name: "Dhuhr", time: times.dhuhr },
    { name: "Asr", time: times.asr },
    { name: "Maghrib", time: times.maghrib },
    { name: "Isha", time: times.isha },
  ];

  for (const prayer of prayers) {
    const [hrs, mins] = prayer.time.split(":").map(Number);
    const prayerTotalMinutes = hrs * 60 + mins;
    if (prayerTotalMinutes > currentTotalMinutes) {
      return { name: prayer.name, time: prayer.time, minutesUntil: prayerTotalMinutes - currentTotalMinutes };
    }
  }

  const [fHrs, fMins] = times.fajr.split(":").map(Number);
  return { name: "Fajr", time: times.fajr, minutesUntil: (1440 - currentTotalMinutes) + (fHrs * 60 + fMins) };
};

// 5. Storage Helpers
export const savePrayerSettings = async (s: PrayerSettings) => AsyncStorage.setItem("prayerSettings", JSON.stringify(s));
export const loadPrayerSettings = async (): Promise<PrayerSettings> => {
  const s = await AsyncStorage.getItem("prayerSettings");
  return s ? JSON.parse(s) : DEFAULT_SETTINGS;
};
export const saveLocationData = async (l: LocationData) => AsyncStorage.setItem("locationData", JSON.stringify(l));
export const loadLocationData = async (): Promise<LocationData> => {
  const l = await AsyncStorage.getItem("locationData");
  return l ? JSON.parse(l) : DEFAULT_LOCATION;
};

// 6. Metadata Helpers
export const getCalculationMethodName = (method: string): string => method.replace(/([A-Z])/g, ' $1').trim();
export const getMadhabName = (madhab: string): string => madhab;