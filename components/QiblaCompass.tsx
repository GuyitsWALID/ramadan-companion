import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { colors, typography, spacing, borderRadius, shadows } from "../constants/theme";

interface QiblaCompassProps {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export default function QiblaCompass({ userLocation }: QiblaCompassProps) {
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  // Calculate Qibla direction from user's location
  const calculateQiblaDirection = (lat: number, lng: number): number => {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
    const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

    const y = Math.sin(kaabaLngRad - lngRad);
    const x =
      Math.cos(latRad) * Math.tan(kaabaLatRad) -
      Math.sin(latRad) * Math.cos(kaabaLngRad - lngRad);

    let qibla = (Math.atan2(y, x) * 180) / Math.PI;
    qibla = (qibla + 360) % 360;

    return qibla;
  };

  // Calculate distance to Mecca
  const calculateDistanceToMecca = (lat: number, lng: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
    const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((KAABA_LAT * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  useEffect(() => {
    if (userLocation) {
      const direction = calculateQiblaDirection(
        userLocation.latitude,
        userLocation.longitude
      );
      setQiblaDirection(direction);
      setIsCalibrated(true);
    }
  }, [userLocation]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startCompass = async () => {
      if (Platform.OS === "web") {
        // Web doesn't support magnetometer
        setHasPermission(false);
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setHasPermission(false);
          return;
        }

        setHasPermission(true);

        // Note: expo-location doesn't have magnetometer, so we simulate
        // In production, you'd use expo-sensors Magnetometer
        // For now, show static Qibla direction
      } catch (error) {
        console.error("Compass error:", error);
        setHasPermission(false);
      }
    };

    startCompass();

    // Cleanup not needed since we're not using magnetometer subscription
  }, []);

  // Animate compass rotation
  useEffect(() => {
    const rotation = qiblaDirection - compassHeading;
    Animated.spring(rotateAnim, {
      toValue: rotation,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  }, [compassHeading, qiblaDirection]);

  const rotateStyle = {
    transform: [
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  const distance = userLocation
    ? calculateDistanceToMecca(userLocation.latitude, userLocation.longitude)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.compassContainer}>
        {/* Compass ring */}
        <View style={styles.compassRing}>
          {/* Direction markers */}
          <Text style={[styles.directionLabel, styles.north]}>N</Text>
          <Text style={[styles.directionLabel, styles.east]}>E</Text>
          <Text style={[styles.directionLabel, styles.south]}>S</Text>
          <Text style={[styles.directionLabel, styles.west]}>W</Text>

          {/* Qibla indicator */}
          <Animated.View style={[styles.qiblaPointer, rotateStyle]}>
            <View style={styles.pointerLine} />
            <View style={styles.kaabaIcon}>
              <Ionicons name="locate" size={24} color={colors.textOnPrimary} />
            </View>
          </Animated.View>

          {/* Center dot */}
          <View style={styles.centerDot} />
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="compass" size={20} color={colors.primary} />
          <Text style={styles.infoLabel}>Qibla Direction:</Text>
          <Text style={styles.infoValue}>{qiblaDirection.toFixed(1)}°</Text>
        </View>

        {distance && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.secondary} />
            <Text style={styles.infoLabel}>Distance to Mecca:</Text>
            <Text style={styles.infoValue}>
              {distance.toLocaleString()} km
            </Text>
          </View>
        )}

        {!isCalibrated && (
          <View style={styles.calibrationNotice}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.calibrationText}>
              Enable location for accurate Qibla direction
            </Text>
          </View>
        )}

        {Platform.OS === "web" && (
          <View style={styles.webNotice}>
            <Ionicons name="information-circle" size={16} color={colors.textMuted} />
            <Text style={styles.webNoticeText}>
              Compass rotation available on mobile devices
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  compassContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  compassRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  directionLabel: {
    position: "absolute",
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.textSecondary,
  },
  north: {
    top: spacing.sm,
    color: colors.error,
  },
  east: {
    right: spacing.sm,
  },
  south: {
    bottom: spacing.sm,
  },
  west: {
    left: spacing.sm,
  },
  qiblaPointer: {
    position: "absolute",
    width: 4,
    height: 100,
    alignItems: "center",
  },
  pointerLine: {
    width: 4,
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  kaabaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -5,
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  infoContainer: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  calibrationNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning + "20",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  calibrationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.warning,
    flex: 1,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  webNoticeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.regular,
    color: colors.textMuted,
    flex: 1,
  },
});
