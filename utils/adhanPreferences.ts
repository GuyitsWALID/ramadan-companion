import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdhanValue, DEFAULT_ADHAN } from "../constants/adhan";

const ADHAN_STORAGE_KEY = "@ramadan_companion_selected_adhan";

const VALID_VALUES: Set<AdhanValue> = new Set([
  "makkah",
  "madinah",
  "alaqsa",
  "egypt",
  "silent",
]);

export const loadSelectedAdhan = async (): Promise<AdhanValue> => {
  try {
    const saved = await AsyncStorage.getItem(ADHAN_STORAGE_KEY);
    if (saved && VALID_VALUES.has(saved as AdhanValue)) {
      return saved as AdhanValue;
    }
    return DEFAULT_ADHAN;
  } catch (error) {
    console.error("Error loading selected adhan:", error);
    return DEFAULT_ADHAN;
  }
};

export const saveSelectedAdhan = async (value: AdhanValue) => {
  try {
    await AsyncStorage.setItem(ADHAN_STORAGE_KEY, value);
  } catch (error) {
    console.error("Error saving selected adhan:", error);
  }
};

