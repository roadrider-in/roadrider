import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
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

export interface PickupPointMarker {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface GoogleMapProps {
  origin?: LatLng;
  destination?: LatLng;
  driver?: LatLng;
  captainLocation?: LatLng & { heading?: number };
  pickupPoints?: PickupPointMarker[];
  selectedPickupPointId?: string;
  onSelectPickupPoint?: (point: PickupPointMarker) => void;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  draggableMarker?: LatLng;
  onDragEnd?: (coords: LatLng) => void;
  showRecenterBtn?: boolean;
  onRecenter?: () => void;
  etaText?: string;
  etaUnit?: string;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  showRoute?: boolean;
  onEtaCalculated?: (eta: EtaResult) => void;
  showCoordsChip?: boolean;
  theme?: "dark" | "blue" | "default";
  showsUserLocation?: boolean;
}

export default function GoogleMap({
  origin,
  destination,
  driver,
  captainLocation,
  pickupPoints,
  selectedPickupPointId,
  onSelectPickupPoint,
  routeCoordinates,
  draggableMarker,
  onDragEnd,
  showRecenterBtn = false,
  onRecenter,
  etaText = "15 min",
  etaUnit = "away",
  interactive = true,
  style,
  showRoute = true,
  onEtaCalculated,
  showCoordsChip = false,
  theme = "default",
  showsUserLocation = false,
}: GoogleMapProps) {
  const mapRef = useRef<MapView>(null);
  const [liveEta, setLiveEta] = useState<EtaResult | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Stable ref for parent callback to break render loops
  const onEtaCalculatedRef = useRef(onEtaCalculated);
  useEffect(() => {
    onEtaCalculatedRef.current = onEtaCalculated;
  });

  // Track previous calculated ETA to avoid duplicate state sets
  const prevEtaRef = useRef<EtaResult | null>(null);

  // Compute distance and ETA strictly based on primitive coordinates
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = destination?.lat;
  const destLng = destination?.lng;
  const driverLat = driver?.lat;
  const driverLng = driver?.lng;

  useEffect(() => {
    if (
      typeof originLat === "number" &&
      typeof originLng === "number" &&
      typeof destLat === "number" &&
      typeof destLng === "number"
    ) {
      const orig: LatLng = { lat: originLat, lng: originLng };
      const dest: LatLng = { lat: destLat, lng: destLng };
      const km = computeDistanceKm(orig, dest);
      const eta = computeEstimatedEta(km);

      const prev = prevEtaRef.current;
      if (
        !prev ||
        prev.durationSeconds !== eta.durationSeconds ||
        prev.distanceText !== eta.distanceText ||
        prev.durationText !== eta.durationText
      ) {
        prevEtaRef.current = eta;
        setLiveEta(eta);
        onEtaCalculatedRef.current?.(eta);
      }
    } else {
      if (prevEtaRef.current !== null) {
        prevEtaRef.current = null;
        setLiveEta(null);
      }
    }
  }, [originLat, originLng, destLat, destLng]);

  // Calculate center and span region based on actual points
  const region = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    if (typeof originLat === "number" && typeof originLng === "number") {
      lats.push(originLat);
      lngs.push(originLng);
    }
    if (typeof destLat === "number" && typeof destLng === "number") {
      lats.push(destLat);
      lngs.push(destLng);
    }
    if (typeof driverLat === "number" && typeof driverLng === "number") {
      lats.push(driverLat);
      lngs.push(driverLng);
    }
    if (pickupPoints && pickupPoints.length > 0) {
      pickupPoints.forEach((p) => {
        lats.push(p.lat);
        lngs.push(p.lng);
      });
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
    const latDelta = Math.max(0.015, (maxLat - minLat) * 1.5 || 0.02);
    const lngDelta = Math.max(0.015, (maxLng - minLng) * 1.5 || 0.02);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [originLat, originLng, destLat, destLng, driverLat, driverLng, pickupPoints]);

  const displayEta = liveEta ? liveEta.durationText : etaText;
  const displaySub = liveEta?.distanceText
    ? `${liveEta.distanceText} · ${etaUnit}`
    : etaUnit;

  const polylineCoords = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      return routeCoordinates;
    }
    if (typeof originLat !== "number" || typeof destLat !== "number") return [];
    const coords = [{ latitude: originLat, longitude: originLng! }];
    if (typeof driverLat === "number" && typeof driverLng === "number") {
      coords.push({ latitude: driverLat, longitude: driverLng });
    }
    coords.push({ latitude: destLat, longitude: destLng! });
    return coords;
  }, [routeCoordinates, originLat, originLng, destLat, destLng, driverLat, driverLng]);

  const mapProvider =
    Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const fitMapToPoints = useCallback(
    (animated = true) => {
      const coordsToFit: { latitude: number; longitude: number }[] = [];
      if (typeof originLat === "number" && typeof originLng === "number") {
        coordsToFit.push({ latitude: originLat, longitude: originLng });
      }
      if (typeof destLat === "number" && typeof destLng === "number") {
        coordsToFit.push({ latitude: destLat, longitude: destLng });
      }
      if (typeof driverLat === "number" && typeof driverLng === "number") {
        coordsToFit.push({ latitude: driverLat, longitude: driverLng });
      }
      if (captainLocation && typeof captainLocation.lat === "number") {
        coordsToFit.push({ latitude: captainLocation.lat, longitude: captainLocation.lng });
      }
      if (routeCoordinates && routeCoordinates.length > 0) {
        const len = routeCoordinates.length;
        coordsToFit.push(routeCoordinates[0]);
        if (len > 2) coordsToFit.push(routeCoordinates[Math.floor(len / 2)]);
        coordsToFit.push(routeCoordinates[len - 1]);
      }

      if (coordsToFit.length >= 2) {
        mapRef.current?.fitToCoordinates(coordsToFit, {
          edgePadding: { top: 70, right: 60, bottom: 90, left: 60 },
          animated,
        });
      } else if (coordsToFit.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: coordsToFit[0].latitude,
            longitude: coordsToFit[0].longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          animated ? 500 : 0
        );
      }
    },
    [originLat, originLng, destLat, destLng, driverLat, driverLng, captainLocation, routeCoordinates]
  );

  useEffect(() => {
    fitMapToPoints(true);
  }, [fitMapToPoints]);

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
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        customMapStyle={theme === "dark" ? DARK_MAP_STYLE : undefined}
        onMapReady={() => {
          setIsMapReady(true);
          if (__DEV__) {
            console.log(
              `[RoadRider:GoogleMap] MapView ready on ${Platform.OS} with provider ${mapProvider}`
            );
          }
          fitMapToPoints(false);
        }}
      >
        {/* Origin / Store Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title={origin.label || "Pickup"}
            tracksViewChanges={false}
          >
            <View style={[styles.originMarker, theme === "blue" && styles.originMarkerBlue]}>
              <View style={[styles.originDot, theme === "blue" && styles.originDotBlue]} />
            </View>
          </Marker>
        )}

        {/* Nearby Pickup Points (Screen 2: Reference Image 5) */}
        {pickupPoints &&
          pickupPoints.map((point) => {
            const isSelected = selectedPickupPointId === point.id;
            return (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.lat, longitude: point.lng }}
                title={point.name}
                tracksViewChanges={false}
                onPress={() => onSelectPickupPoint?.(point)}
              >
                {isSelected ? (
                  <View style={styles.selectedPickupMarkerContainer}>
                    <View style={styles.selectedPickupPill}>
                      <Text style={styles.selectedPickupPillText}>Pickup Point</Text>
                    </View>
                    <View style={styles.selectedPickupPointer} />
                    <View style={styles.pickupPointRingOuter}>
                      <View style={styles.pickupPointRingInner} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickupPointRingOuter}>
                    <View style={styles.pickupPointRingInner} />
                  </View>
                )}
              </Marker>
            );
          })}

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
            title={driver.label || "RoadRider Captain"}
            tracksViewChanges={false}
          >
            <View style={[styles.driverMarker, theme === "blue" && styles.driverMarkerBlue]}>
              <Text style={styles.driverEmoji}>🚗</Text>
            </View>
          </Marker>
        )}

        {/* Real-time Captain Marker with Dynamic Heading Rotation */}
        {captainLocation && (
          <Marker
            coordinate={{ latitude: captainLocation.lat, longitude: captainLocation.lng }}
            title={captainLocation.label || "RoadRider Captain"}
            rotation={captainLocation.heading || 0}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
          >
            <View style={[styles.captainMarker, theme === "blue" && styles.captainMarkerBlue]}>
              <Text style={styles.captainEmoji}>🛵</Text>
            </View>
          </Marker>
        )}

        {/* Draggable Marker for precise pin drop */}
        {draggableMarker && (
          <Marker
            coordinate={{ latitude: draggableMarker.lat, longitude: draggableMarker.lng }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onDragEnd?.({ lat: latitude, lng: longitude });
            }}
            title="Drag to adjust location"
          >
            <View style={styles.draggableMarkerPin}>
              <View style={styles.draggableMarkerHead} />
              <View style={styles.draggableMarkerStem} />
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {showRoute && origin && destination && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={theme === "blue" ? "#1769E8" : "#e05a0f"}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Non-blocking subtle loading indicator */}
      {!isMapReady && (
        <View style={styles.loadingPill} pointerEvents="none">
          <ActivityIndicator size="small" color={theme === "blue" ? "#1769E8" : "#e05a0f"} />
          <Text style={styles.loadingPillText}>Loading map...</Text>
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

      {/* Floating Recenter Button */}
      {showRecenterBtn && (
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={() => (onRecenter ? onRecenter() : fitMapToPoints(true))}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Recenter map"
        >
          <Text style={styles.recenterIcon}>🎯</Text>
        </TouchableOpacity>
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
    backgroundColor: "#f1f5f9",
    position: "relative",
    overflow: "hidden",
  },
  loadingPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  loadingPillText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
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
  originMarkerBlue: {
    backgroundColor: "rgba(23, 105, 232, 0.25)",
  },
  originDotBlue: {
    backgroundColor: "#1769E8",
  },
  driverMarkerBlue: {
    backgroundColor: "#1769E8",
  },
  selectedPickupMarkerContainer: {
    alignItems: "center",
  },
  selectedPickupPill: {
    backgroundColor: "#15803d",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPickupPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  selectedPickupPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#15803d",
    marginBottom: 2,
  },
  pickupPointRingOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    borderWidth: 2.5,
    borderColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  pickupPointRingInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
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
  captainMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1769E8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  captainMarkerBlue: {
    backgroundColor: "#1769E8",
  },
  captainEmoji: {
    fontSize: 16,
  },
  draggableMarkerPin: {
    alignItems: "center",
    justifyContent: "center",
  },
  draggableMarkerHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 6,
  },
  draggableMarkerStem: {
    width: 3,
    height: 10,
    backgroundColor: "#ef4444",
  },
  recenterBtn: {
    position: "absolute",
    bottom: 70,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    zIndex: 15,
  },
  recenterIcon: {
    fontSize: 20,
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

