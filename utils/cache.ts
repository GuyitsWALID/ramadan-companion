/**
 * Caching Utility for Offline Support
 * Handles local data storage with expiration and network-aware syncing
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache keys
export const CACHE_KEYS = {
  PRAYER_TIMES: "@cache_prayer_times",
  QURAN_PROGRESS: "@cache_quran_progress",
  USER_PROFILE: "@cache_user_profile",
  CONTENT_LIBRARY: "@cache_content_library",
  FASTING_RECORD: "@ramadan_fasting_record",
  SAVED_CONTENT: "@ramadan_saved_content",
  LAST_SYNC: "@cache_last_sync",
  OFFLINE_QUEUE: "@cache_offline_queue",
} as const;

// Cache duration in milliseconds
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface OfflineAction {
  id: string;
  type: "create" | "update" | "delete";
  resource: string;
  data: any;
  timestamp: number;
}

/**
 * Store data in cache with expiration
 */
export async function setCache<T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATION.MEDIUM
): Promise<void> {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

/**
 * Get data from cache, returns null if expired or not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > cacheItem.expiry) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
}

/**
 * Get data from cache even if expired (for offline fallback)
 */
export async function getCacheForced<T>(key: string): Promise<{ data: T | null; isExpired: boolean; age: number }> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return { data: null, isExpired: true, age: 0 };

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const isExpired = Date.now() > cacheItem.expiry;
    const age = Date.now() - cacheItem.timestamp;

    return { data: cacheItem.data, isExpired, age };
  } catch (error) {
    console.error("Error getting forced cache:", error);
    return { data: null, isExpired: true, age: 0 };
  }
}

/**
 * Remove item from cache
 */
export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing cache:", error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Get cache age in human readable format
 */
export function formatCacheAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Queue an action for offline sync
 */
export async function queueOfflineAction(action: Omit<OfflineAction, "id" | "timestamp">): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error("Error queuing offline action:", error);
  }
}

/**
 * Get all queued offline actions
 */
export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const queue = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Error getting offline queue:", error);
    return [];
  }
}

/**
 * Remove an action from the offline queue
 */
export async function removeFromOfflineQueue(actionId: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter((a) => a.id !== actionId);
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from offline queue:", error);
  }
}

/**
 * Clear the offline queue
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
  } catch (error) {
    console.error("Error clearing offline queue:", error);
  }
}

/**
 * Record last sync time
 */
export async function recordLastSync(): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, JSON.stringify({ timestamp: Date.now() }));
  } catch (error) {
    console.error("Error recording last sync:", error);
  }
}

/**
 * Get last sync time
 */
export async function getLastSync(): Promise<{ timestamp: number; formatted: string } | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!data) return null;
    
    const { timestamp } = JSON.parse(data);
    const age = Date.now() - timestamp;
    
    return {
      timestamp,
      formatted: formatCacheAge(age),
    };
  } catch (error) {
    console.error("Error getting last sync:", error);
    return null;
  }
}

/**
 * Cache prayer times for offline access
 */
export async function cachePrayerTimes(prayerTimes: any[], date: string): Promise<void> {
  const key = `${CACHE_KEYS.PRAYER_TIMES}_${date}`;
  await setCache(key, prayerTimes, CACHE_DURATION.LONG);
}

/**
 * Get cached prayer times
 */
export async function getCachedPrayerTimes(date: string): Promise<any[] | null> {
  const key = `${CACHE_KEYS.PRAYER_TIMES}_${date}`;
  return await getCache<any[]>(key);
}

/**
 * Cache Quran reading progress
 */
export async function cacheQuranProgress(progress: any): Promise<void> {
  await setCache(CACHE_KEYS.QURAN_PROGRESS, progress, CACHE_DURATION.WEEK);
}

/**
 * Get cached Quran progress
 */
export async function getCachedQuranProgress(): Promise<any | null> {
  return await getCache(CACHE_KEYS.QURAN_PROGRESS);
}

/**
 * Cache user profile
 */
export async function cacheUserProfile(profile: any): Promise<void> {
  await setCache(CACHE_KEYS.USER_PROFILE, profile, CACHE_DURATION.LONG);
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(): Promise<any | null> {
  return await getCache(CACHE_KEYS.USER_PROFILE);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalItems: number;
  offlineQueueSize: number;
  lastSync: string | null;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith("@cache_") || k.startsWith("@ramadan_"));
    const queue = await getOfflineQueue();
    const lastSync = await getLastSync();

    return {
      totalItems: cacheKeys.length,
      offlineQueueSize: queue.length,
      lastSync: lastSync?.formatted || null,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return {
      totalItems: 0,
      offlineQueueSize: 0,
      lastSync: null,
    };
  }
}
