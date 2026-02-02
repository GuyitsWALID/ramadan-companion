/**
 * Network Status Hook
 * Monitors network connectivity and provides offline state management
 */

import { useState, useEffect, useCallback } from "react";
import NetInfo, { NetInfoState, NetInfoSubscription } from "@react-native-community/netinfo";
import { 
  getOfflineQueue, 
  clearOfflineQueue, 
  recordLastSync,
  getCacheStats,
  removeFromOfflineQueue 
} from "../utils/cache";

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOffline: boolean;
}

interface OfflineQueueItem {
  id: string;
  type: "create" | "update" | "delete";
  resource: string;
  data: any;
  timestamp: number;
}

interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isOffline: boolean;
  offlineQueueSize: number;
  syncPending: boolean;
  lastSyncTime: string | null;
  syncOfflineActions: () => Promise<{ success: number; failed: number }>;
  refreshNetworkStatus: () => Promise<void>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
    isOffline: false,
  });
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [syncPending, setSyncPending] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Update network status
  const updateNetworkStatus = useCallback((state: NetInfoState) => {
    const status: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
      isOffline: !state.isConnected || state.isInternetReachable === false,
    };
    setNetworkStatus(status);
  }, []);

  // Refresh network status manually
  const refreshNetworkStatus = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkStatus(state);
    } catch (error) {
      console.error("Error refreshing network status:", error);
    }
  }, [updateNetworkStatus]);

  // Load cache stats
  const loadCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setOfflineQueueSize(stats.offlineQueueSize);
    setLastSyncTime(stats.lastSync);
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    let unsubscribe: NetInfoSubscription | null = null;

    const setup = async () => {
      // Get initial state
      const initialState = await NetInfo.fetch();
      updateNetworkStatus(initialState);

      // Subscribe to changes
      unsubscribe = NetInfo.addEventListener(updateNetworkStatus);

      // Load cache stats
      await loadCacheStats();
    };

    setup();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [updateNetworkStatus, loadCacheStats]);

  // Refresh queue size when coming back online
  useEffect(() => {
    if (!networkStatus.isOffline) {
      loadCacheStats();
    }
  }, [networkStatus.isOffline, loadCacheStats]);

  // Sync offline actions when back online
  const syncOfflineActions = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (networkStatus.isOffline) {
      return { success: 0, failed: 0 };
    }

    setSyncPending(true);
    let success = 0;
    let failed = 0;

    try {
      const queue = await getOfflineQueue();
      
      for (const action of queue) {
        try {
          // Process each action based on type and resource
          // This is where you would integrate with your backend
          await processOfflineAction(action);
          await removeFromOfflineQueue(action.id);
          success++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          failed++;
        }
      }

      if (success > 0) {
        await recordLastSync();
        await loadCacheStats();
      }
    } catch (error) {
      console.error("Error syncing offline actions:", error);
    } finally {
      setSyncPending(false);
    }

    return { success, failed };
  }, [networkStatus.isOffline, loadCacheStats]);

  return {
    networkStatus,
    isOffline: networkStatus.isOffline,
    offlineQueueSize,
    syncPending,
    lastSyncTime,
    syncOfflineActions,
    refreshNetworkStatus,
  };
}

/**
 * Process an individual offline action
 * Integrate this with your backend API
 */
async function processOfflineAction(action: OfflineQueueItem): Promise<void> {
  // This is a placeholder - integrate with your actual backend
  // For example, with Convex:
  // 
  // switch (action.resource) {
  //   case "prayer_completion":
  //     await convex.mutation(api.prayers.markCompleted, action.data);
  //     break;
  //   case "quran_progress":
  //     await convex.mutation(api.quran.updateProgress, action.data);
  //     break;
  //   case "fasting_record":
  //     await convex.mutation(api.fasting.updateRecord, action.data);
  //     break;
  // }

  // Simulate network delay for now
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  console.log(`Processed offline action: ${action.type} ${action.resource}`, action.data);
}

/**
 * Check if the app should work in offline mode
 */
export function useOfflineMode(): {
  isOffline: boolean;
  showOfflineBanner: boolean;
  dismissBanner: () => void;
} {
  const { isOffline } = useNetworkStatus();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Reset banner when coming back online
    if (!isOffline) {
      setBannerDismissed(false);
    }
  }, [isOffline]);

  return {
    isOffline,
    showOfflineBanner: isOffline && !bannerDismissed,
    dismissBanner: () => setBannerDismissed(true),
  };
}

export default useNetworkStatus;
