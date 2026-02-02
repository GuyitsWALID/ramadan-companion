import React, { useState, useEffect, useRef } from "react";
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
import { Magnetometer } from "expo-sensors";
import { typography, spacing, borderRadius } from "../constants/theme";

interface QiblaCompassProps {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  colors: any;
  shadows: any;
}

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export default function QiblaCompass({ userLocation, colors, shadows }: QiblaCompassProps) {
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [hasMagnetometer, setHasMagnetometer] = useState<boolean>(false);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [magnetometerData, setMagnetometerData] = useState<{ x: number; y: number; z: number } | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const compassRotateAnim = useRef(new Animated.Value(0)).current;

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

  // Calculate compass heading from magnetometer data
  const calculateHeading = (x: number, y: number): number => {
    let heading = Math.atan2(y, x) * (180 / Math.PI);
    // Adjust for magnetic declination and orientation
    heading = (heading + 360) % 360;
    // Convert to compass bearing (0 = North)
    heading = (360 - heading + 90) % 360;
    return heading;
  };

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const startMagnetometer = async () => {
      if (Platform.OS === "web") {
        setHasMagnetometer(false);
        return;
      }

      try {
        // Check if magnetometer is available
        const isAvailable = await Magnetometer.isAvailableAsync();
        if (!isAvailable) {
          setHasMagnetometer(false);
          console.log("Magnetometer not available on this device");
          return;
        }

        setHasMagnetometer(true);

        // Set update interval (in ms)
        Magnetometer.setUpdateInterval(100);

        // Subscribe to magnetometer updates
        subscription = Magnetometer.addListener((data) => {
          setMagnetometerData(data);
          const heading = calculateHeading(data.x, data.y);
          setCompassHeading(heading);
        });
      } catch (error) {
        console.error("Magnetometer error:", error);
        setHasMagnetometer(false);
      }
    };

    startMagnetometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Animate compass rotation based on heading
  useEffect(() => {
    Animated.spring(compassRotateAnim, {
      toValue: -compassHeading,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  }, [compassHeading]);

  // Animate qibla pointer rotation
  useEffect(() => {
    const rotation = qiblaDirection - compassHeading;
    Animated.spring(rotateAnim, {
      toValue: rotation,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  }, [compassHeading, qiblaDirection]);

  const qiblaRotateStyle = {
    transform: [
      {
        rotate: rotateAnim.interpolate({
          inputRange: [-360, 360],
          outputRange: ["-360deg", "360deg"],
        }),
      },
    ],
  };

  const compassRotateStyle = {
    transform: [
      {
        rotate: compassRotateAnim.interpolate({
          inputRange: [-360, 360],
          outputRange: ["-360deg", "360deg"],
        }),
      },
    ],
  };

  // Calculate angle to rotate to face Qibla
  const angleToQibla = ((qiblaDirection - compassHeading + 360) % 360).toFixed(1);

  const distance = userLocation
    ? calculateDistanceToMecca(userLocation.latitude, userLocation.longitude)
    : null;

  // Check if user is facing Qibla (within 10 degrees)
  const isFacingQibla = Math.abs(parseFloat(angleToQibla)) < 10 || Math.abs(parseFloat(angleToQibla) - 360) < 10;

  const styles = getStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <View style={styles.compassContainer}>
        {/* Compass ring with rotating background */}
        <Animated.View style={[styles.compassRing, compassRotateStyle]}>
          {/* Direction markers */}
          <Text style={[styles.directionLabel, styles.north]}>N</Text>
          <Text style={[styles.directionLabel, styles.east]}>E</Text>
          <Text style={[styles.directionLabel, styles.south]}>S</Text>
          <Text style={[styles.directionLabel, styles.west]}>W</Text>

          {/* Degree markers */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <View
              key={deg}
              style={[
                styles.degreeMark,
                {
                  transform: [
                    { rotate: `${deg}deg` },
                    { translateY: -90 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Fixed Qibla indicator (points in the Qibla direction) */}
        <Animated.View style={[styles.qiblaPointer, qiblaRotateStyle]}>
          <View style={styles.pointerLine} />
          <View style={[styles.kaabaIcon, isFacingQibla && styles.kaabaIconActive]}>
            <Text style={styles.kaabaEmoji}>🕋</Text>
          </View>
        </Animated.View>

        {/* Center dot */}
        <View style={styles.centerDot} />

        {/* Facing Qibla indicator */}
        {isFacingQibla && (
          <View style={styles.facingIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="compass" size={20} color={colors.primary} />
          <Text style={styles.infoLabel}>Qibla Direction:</Text>
          <Text style={styles.infoValue}>{qiblaDirection.toFixed(1)}°</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="navigate" size={20} color={colors.secondary} />
          <Text style={styles.infoLabel}>Current Heading:</Text>
          <Text style={styles.infoValue}>{compassHeading.toFixed(1)}°</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="arrow-forward-circle" size={20} color={isFacingQibla ? colors.success : colors.warning} />
          <Text style={styles.infoLabel}>Turn:</Text>
          <Text style={[styles.infoValue, isFacingQibla && { color: colors.success }]}>
            {isFacingQibla ? "Facing Qibla ✓" : `${angleToQibla}° to Qibla`}
          </Text>
        </View>

        {distance && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.tertiary} />
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

        {!hasMagnetometer && Platform.OS !== "web" && (
          <View style={styles.calibrationNotice}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.calibrationText}>
              Magnetometer not available. Showing static direction.
            </Text>
          </View>
        )}

        {hasMagnetometer && (
          <View style={styles.successNotice}>
            <Ionicons name="hardware-chip" size={16} color={colors.success} />
            <Text style={styles.successText}>
              Using device compass for real-time direction
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

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
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
    height: 220,
    position: "relative",
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
    position: "absolute",
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
  degreeMark: {
    position: "absolute",
    width: 2,
    height: 8,
    backgroundColor: colors.textMuted,
  },
  qiblaPointer: {
    position: "absolute",
    width: 4,
    height: 100,
    alignItems: "center",
    zIndex: 10,
  },
  pointerLine: {
    width: 4,
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  kaabaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -5,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  kaabaIconActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  kaabaEmoji: {
    fontSize: 22,
  },
  centerDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.surface,
    zIndex: 5,
  },
  facingIndicator: {
    position: "absolute",
    bottom: 0,
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  successNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.success + "20",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  successText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.medium,
    color: colors.success,
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
