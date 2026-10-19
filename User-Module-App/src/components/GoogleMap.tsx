import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import {
  DARK_MAP_STYLE,
  DEFAULT_CENTER,
  PRESET_COORDS,
  computeDistanceKm,
  computeEstimatedEta,
  type LatLng,
} from "../lib/googleMaps";
import { colors, radii } from "../theme/tokens";

export interface EtaResult {
  durationText: string;
  distanceText: string;
  durationSeconds: number;
}

export interface GoogleMapProps {
  origin?: LatLng;
  destination?: LatLng;
  driver?: LatLng;
  etaText?: string;
  etaUnit?: string;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  showRoute?: boolean;
  onEtaCalculated?: (eta: EtaResult) => void;
  showCoordsChip?: boolean;
}

export default function GoogleMap({
  origin,
  destination,
  driver,
  etaText = "15 min",
  etaUnit = "away",
  interactive = true,
  style,
  showRoute = true,
  onEtaCalculated,
  showCoordsChip = false,
}: GoogleMapProps) {
  const mapRef = useRef<MapView>(null);
  const [liveEta, setLiveEta] = useState<EtaResult | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Compute distance and ETA only when both origin and destination exist
  useEffect(() => {
    if (origin && destination) {
      const km = computeDistanceKm(origin, destination);
      const eta = computeEstimatedEta(km);
      setLiveEta(eta);
      onEtaCalculated?.(eta);
    } else {
      setLiveEta(null);
    }
  }, [origin, destination, onEtaCalculated]);

  // Monitor tile loading timeout (4.5s)
  useEffect(() => {
    setIsMapLoaded(false);
    setHasTimedOut(false);
    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [retryKey, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  // Calculate center and span region based on actual points
  const region = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    if (origin) {
      lats.push(origin.lat);
      lngs.push(origin.lng);
    }
    if (destination) {
      lats.push(destination.lat);
      lngs.push(destination.lng);
    }
    if (driver) {
      lats.push(driver.lat);
      lngs.push(driver.lng);
    }

    if (lats.length === 0) {
      return {
        latitude: DEFAULT_CENTER.lat,
        longitude: DEFAULT_CENTER.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = Math.max(0.02, (maxLat - minLat) * 1.5 || 0.03);
    const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.5 || 0.03);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [origin, destination, driver]);

  const displayEta = liveEta ? liveEta.durationText : etaText;
  const displaySub = liveEta?.distanceText
    ? `${liveEta.distanceText} · ${etaUnit}`
    : etaUnit;

  const polylineCoords = useMemo(() => {
    if (!origin || !destination) return [];
    const coords = [
      { latitude: origin.lat, longitude: origin.lng },
    ];
    if (driver) {
      coords.push({ latitude: driver.lat, longitude: driver.lng });
    }
    coords.push({ latitude: destination.lat, longitude: destination.lng });
    return coords;
  }, [origin, destination, driver]);

  const mapProvider =
    Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const fitMapToPoints = (animated = true) => {
    const coordsToFit: { latitude: number; longitude: number }[] = [];
    if (origin) coordsToFit.push({ latitude: origin.lat, longitude: origin.lng });
    if (destination)
      coordsToFit.push({ latitude: destination.lat, longitude: destination.lng });
    if (driver) coordsToFit.push({ latitude: driver.lat, longitude: driver.lng });

    if (coordsToFit.length >= 2) {
      mapRef.current?.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated,
      });
    } else if (coordsToFit.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: coordsToFit[0].latitude,
          longitude: coordsToFit[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        animated ? 500 : 0
      );
    }
  };

  useEffect(() => {
    fitMapToPoints(true);
  }, [
    origin?.lat,
    origin?.lng,
    destination?.lat,
    destination?.lng,
    driver?.lat,
    driver?.lng,
  ]);

  // Normalized fallback coordinates for SVG rendering
  const fallbackPoints = useMemo(() => {
    if (!origin && !destination) return null;
    const lats = [origin?.lat ?? 26.8467, destination?.lat ?? 26.852];
    const lngs = [origin?.lng ?? 80.9462, destination?.lng ?? 80.949];
    if (driver) {
      lats.push(driver.lat);
      lngs.push(driver.lng);
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padX = 60;
    const padY = 50;
    const w = 360 - padX * 2;
    const h = 200 - padY * 2;
    const latSpan = maxLat - minLat || 0.005;
    const lngSpan = maxLng - minLng || 0.005;

    const toSvg = (pt?: LatLng) => {
      if (!pt) return { x: 180, y: 100 };
      const normX = (pt.lng - minLng) / lngSpan;
      const normY = (pt.lat - minLat) / latSpan;
      return {
        x: Math.round(padX + normX * w),
        y: Math.round(padY + (1 - normY) * h),
      };
    };

    return {
      originSvg: toSvg(origin),
      destSvg: toSvg(destination),
      driverSvg: driver ? toSvg(driver) : null,
    };
  }, [origin, destination, driver]);

  const handleInfoPress = () => {
    Alert.alert(
      "Google Maps Tiles Status",
      "Native Google Maps tiles are currently unavailable in this environment.\n\n" +
        "Root cause: Google Cloud Billing must be enabled, and the 'Maps SDK for Android' must be active without conflicting package restrictions in Expo Go.\n\n" +
        "Note: Route calculations, live coordinates, and ETA remain 100% active.",
      [{ text: "OK" }]
    );
  };

  const showFallback = !isMapLoaded && hasTimedOut;
  const showLoading = !isMapLoaded && !hasTimedOut;

  return (
    <View style={[styles.container, style]}>
      {/* 1. Underlying Native MapView */}
      <MapView
        key={`map-view-${retryKey}`}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={mapProvider}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={false}
        customMapStyle={DARK_MAP_STYLE}
        onMapReady={() => {
          setIsMapReady(true);
          if (__DEV__) {
            console.log(
              `[RoadRider:GoogleMap] MapView ready on ${Platform.OS} with provider ${mapProvider}`
            );
          }
          fitMapToPoints(false);
        }}
        onMapLoaded={() => {
          setIsMapLoaded(true);
          if (__DEV__) {
            console.log("[RoadRider:GoogleMap] MapView tiles loaded successfully");
          }
        }}
      >
        {/* Origin / Store Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title={origin.label || "Pickup"}
            tracksViewChanges={false}
          >
            <View style={styles.originMarker}>
              <View style={styles.originDot} />
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title={destination.label || "Destination"}
            tracksViewChanges={false}
          >
            <View style={styles.destinationMarker}>
              <View style={styles.destinationPin} />
            </View>
          </Marker>
        )}

        {/* Driver Marker */}
        {driver && (
          <Marker
            coordinate={{ latitude: driver.lat, longitude: driver.lng }}
            title={driver.label || "RoadRider Driver"}
            tracksViewChanges={false}
          >
            <View style={styles.driverMarker}>
              <Text style={styles.driverEmoji}>🚗</Text>
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {showRoute && origin && destination && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#e05a0f"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* 2. Loading State (0 - 4.5s while tiles are authenticating) */}
      {showLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#e05a0f" />
          <Text style={styles.loadingText}>Loading Google Map...</Text>
        </View>
      )}

      {/* 3. Fallback Route Canvas (Rendered if native tiles fail to load) */}
      {showFallback && (
        <View style={styles.fallbackCanvas}>
          {/* Subtle Vector Background Grid & Route */}
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 360 200">
            <Defs>
              <LinearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#e05a0f" stopOpacity="0.9" />
              </LinearGradient>
            </Defs>

            {/* Subtle Grid lines */}
            <Line x1="0" y1="50" x2="360" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1="0" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1="0" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1="90" y1="0" x2="90" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1="180" y1="0" x2="180" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <Line x1="270" y1="0" x2="270" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Route line */}
            {fallbackPoints && (
              <G>
                {/* Glow underlay */}
                <Line
                  x1={fallbackPoints.originSvg.x}
                  y1={fallbackPoints.originSvg.y}
                  x2={fallbackPoints.driverSvg ? fallbackPoints.driverSvg.x : fallbackPoints.destSvg.x}
                  y2={fallbackPoints.driverSvg ? fallbackPoints.driverSvg.y : fallbackPoints.destSvg.y}
                  stroke="#22c55e"
                  strokeWidth="6"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                />
                <Line
                  x1={fallbackPoints.originSvg.x}
                  y1={fallbackPoints.originSvg.y}
                  x2={fallbackPoints.driverSvg ? fallbackPoints.driverSvg.x : fallbackPoints.destSvg.x}
                  y2={fallbackPoints.driverSvg ? fallbackPoints.driverSvg.y : fallbackPoints.destSvg.y}
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                />

                {fallbackPoints.driverSvg && (
                  <>
                    <Line
                      x1={fallbackPoints.driverSvg.x}
                      y1={fallbackPoints.driverSvg.y}
                      x2={fallbackPoints.destSvg.x}
                      y2={fallbackPoints.destSvg.y}
                      stroke="#e05a0f"
                      strokeWidth="6"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                    />
                    <Line
                      x1={fallbackPoints.driverSvg.x}
                      y1={fallbackPoints.driverSvg.y}
                      x2={fallbackPoints.destSvg.x}
                      y2={fallbackPoints.destSvg.y}
                      stroke="#e05a0f"
                      strokeWidth="3"
                      strokeDasharray="6,4"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </G>
            )}
          </Svg>

          {/* Fallback Markers */}
          {fallbackPoints && (
            <>
              {/* Origin Marker */}
              <View
                style={[
                  styles.fallbackMarkerWrapper,
                  {
                    left: fallbackPoints.originSvg.x - 12,
                    top: fallbackPoints.originSvg.y - 12,
                  },
                ]}
              >
                <View style={styles.originMarker}>
                  <View style={styles.originDot} />
                </View>
                <Text style={styles.fallbackMarkerText} numberOfLines={1}>
                  {origin?.label || "Pickup"}
                </Text>
              </View>

              {/* Destination Marker */}
              <View
                style={[
                  styles.fallbackMarkerWrapper,
                  {
                    left: fallbackPoints.destSvg.x - 14,
                    top: fallbackPoints.destSvg.y - 14,
                  },
                ]}
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationPin} />
                </View>
                <Text style={styles.fallbackMarkerText} numberOfLines={1}>
                  {destination?.label || "Drop-off"}
                </Text>
              </View>

              {/* Driver Marker */}
              {fallbackPoints.driverSvg && (
                <View
                  style={[
                    styles.fallbackMarkerWrapper,
                    {
                      left: fallbackPoints.driverSvg.x - 15,
                      top: fallbackPoints.driverSvg.y - 15,
                    },
                  ]}
                >
                  <View style={styles.driverMarker}>
                    <Text style={styles.driverEmoji}>🚗</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Top Status Alert Badge */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleInfoPress}
            style={styles.statusBanner}
          >
            <View style={styles.statusDotWarning} />
            <Text style={styles.statusBannerText} numberOfLines={1}>
              Map Tiles Offline · Live Route Active
            </Text>
            <TouchableOpacity
              onPress={() => setRetryKey((k) => k + 1)}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* GPS Coordinates Chip - Only shown if explicitly requested and destination exists */}
      {showCoordsChip && destination && (
        <View style={styles.gpsChip}>
          <View style={styles.gpsLiveDot} />
          <Text style={styles.gpsText}>
            {destination.lat.toFixed(4)}° N, {destination.lng.toFixed(4)}° E
          </Text>
        </View>
      )}

      {/* ETA Bubble - Only shown when route/destination exists or custom eta */}
      {destination && (
        <View style={styles.etaBubble}>
          <Text style={styles.etaTitle}>{displayEta}</Text>
          <Text style={styles.etaSub}>{displaySub}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#161c24",
    position: "relative",
    overflow: "hidden",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 10,
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },
  fallbackCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0d1b2a",
    overflow: "hidden",
  },
  fallbackMarkerWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  fallbackMarkerText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    maxWidth: 90,
  },
  statusBanner: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  statusDotWarning: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
    marginRight: 6,
  },
  statusBannerText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
  },
  retryBtnText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },
  originMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  destinationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(224, 90, 15, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  destinationPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#e05a0f",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  driverMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff9900",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  driverEmoji: {
    fontSize: 13,
  },
  gpsChip: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(13, 27, 44, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  gpsLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  gpsText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 9,
    fontFamily: "monospace",
  },
  etaBubble: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  etaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  etaSub: {
    fontSize: 10,
    color: colors.muted,
  },
});

