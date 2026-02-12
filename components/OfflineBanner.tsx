/**
 * Offline Banner Component
 * Displays a banner when the app is offline with sync status
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography, spacing, borderRadius } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

interface OfflineBannerProps {
  isOffline: boolean;
  onDismiss?: () => void;
  showDismiss?: boolean;
  pendingActions?: number;
  syncPending?: boolean;
  onSync?: () => void;
  lastSyncTime?: string | null;
}

export function OfflineBanner({
  isOffline,
  onDismiss,
  showDismiss = true,
  pendingActions = 0,
  syncPending = false,
  onSync,
  lastSyncTime,
}: OfflineBannerProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -100,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [isOffline, slideAnim]);

  useEffect(() => {
    if (isOffline) {
      // Pulse animation for the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOffline, pulseAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.textOnPrimary} />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're Offline</Text>
          <Text style={styles.subtitle}>
            {pendingActions > 0
              ? `${pendingActions} action${pendingActions > 1 ? "s" : ""} pending sync`
              : lastSyncTime
              ? `Last synced ${lastSyncTime}`
              : "Changes will sync when online"}
          </Text>
        </View>

        <View style={styles.actions}>
          {pendingActions > 0 && onSync && !syncPending && (
            <TouchableOpacity style={styles.syncButton} onPress={onSync}>
              <Ionicons name="sync-outline" size={18} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
          
          {syncPending && (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          )}

          {showDismiss && onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Ionicons name="close" size={18} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

interface SyncStatusBadgeProps {
  isOffline: boolean;
  pendingActions: number;
  syncPending?: boolean;
}

export function SyncStatusBadge({ isOffline, pendingActions, syncPending }: SyncStatusBadgeProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (syncPending) {
    return (
      <View style={[styles.badge, styles.syncingBadge]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.badgeText}>Syncing...</Text>
      </View>
    );
  }

  if (isOffline) {
    return (
      <View style={[styles.badge, styles.offlineBadge]}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.error} />
        <Text style={[styles.badgeText, { color: colors.error }]}>Offline</Text>
        {pendingActions > 0 && (
          <View style={styles.pendingCount}>
            <Text style={styles.pendingCountText}>{pendingActions}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.onlineBadge]}>
      <Ionicons name="cloud-done-outline" size={14} color={colors.success} />
      <Text style={[styles.badgeText, { color: colors.success }]}>Online</Text>
    </View>
  );
}

interface CacheIndicatorProps {
  isCached: boolean;
  cacheAge?: string;
}

export function CacheIndicator({ isCached, cacheAge }: CacheIndicatorProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (!isCached) return null;

  return (
    <View style={styles.cacheIndicator}>
      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
      <Text style={styles.cacheText}>
        {cacheAge ? `Cached ${cacheAge}` : "Cached data"}
      </Text>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.semiBold,
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  syncButton: {
    padding: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: borderRadius.full,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  // Badge styles
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  offlineBadge: {
    backgroundColor: colors.error + "15",
  },
  onlineBadge: {
    backgroundColor: colors.success + "15",
  },
  syncingBadge: {
    backgroundColor: colors.primary + "15",
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.text,
  },
  pendingCount: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  pendingCountText: {
    fontSize: 10,
    fontFamily: typography.fonts.bold,
    color: colors.textOnPrimary,
  },
  // Cache indicator
  cacheIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
  },
  cacheText: {
    fontSize: 10,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
  },
});

export default OfflineBanner;
