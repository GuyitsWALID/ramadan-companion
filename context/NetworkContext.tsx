/**
 * Network Context
 * Provides network status and offline sync capabilities throughout the app
 */

import React, { createContext, useContext, ReactNode } from "react";
import { useNetworkStatus, useOfflineMode } from "../hooks/useNetworkStatus";

interface NetworkContextType {
  // Network status
  isConnected: boolean;
  isOffline: boolean;
  connectionType: string | null;
  
  // Offline sync
  offlineQueueSize: number;
  syncPending: boolean;
  lastSyncTime: string | null;
  syncOfflineActions: () => Promise<{ success: number; failed: number }>;
  refreshNetworkStatus: () => Promise<void>;
  
  // Banner control
  showOfflineBanner: boolean;
  dismissBanner: () => void;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const {
    networkStatus,
    isOffline,
    offlineQueueSize,
    syncPending,
    lastSyncTime,
    syncOfflineActions,
    refreshNetworkStatus,
  } = useNetworkStatus();

  const { showOfflineBanner, dismissBanner } = useOfflineMode();

  const value: NetworkContextType = {
    isConnected: networkStatus.isConnected,
    isOffline,
    connectionType: networkStatus.connectionType,
    offlineQueueSize,
    syncPending,
    lastSyncTime,
    syncOfflineActions,
    refreshNetworkStatus,
    showOfflineBanner,
    dismissBanner,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

export default NetworkContext;
