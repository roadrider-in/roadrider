import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { type LatLng } from "../lib/googleMaps";
import {
  subscribeToCaptainTracking,
  type CaptainLocationUpdate,
} from "../services/captainTrackingService";
import { decodePolyline } from "../services/routesService";

export interface LiveTrackingState {
  captainLocation: (LatLng & { heading?: number }) | null;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  routePolyline: string | null;
  roadDistanceKm: number | null;
  estimatedDurationMins: number | null;
  orderStatus: string;
  deliveryStatus: string;
  partner: any | null;
  isStale: boolean;
  isLoading: boolean;
  lastUpdated: number | null;
  pickupCoords: LatLng | null;
  deliveryCoords: LatLng | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
}

export function useLiveTracking(orderId?: string | null) {
  const [tracking, setTracking] = useState<LiveTrackingState>({
    captainLocation: null,
    routeCoordinates: [],
    routePolyline: null,
    roadDistanceKm: null,
    estimatedDurationMins: null,
    orderStatus: "placed",
    deliveryStatus: "not_assigned",
    partner: null,
    isStale: false,
    isLoading: true,
    lastUpdated: null,
    pickupCoords: null,
    deliveryCoords: null,
    pickupAddress: null,
    deliveryAddress: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!orderId || !supabase) {
      setTracking((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const cleanDbId = orderId.startsWith("RR-") ? null : orderId;

    async function fetchInitial() {
      try {
        let query = supabase!
          .from("orders")
          .select(`
            id,
            order_status,
            delivery_status,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            delivery_address,
            delivery_latitude,
            delivery_longitude,
            route_polyline,
            road_distance_km,
            estimated_duration_mins,
            captain_latitude,
            captain_longitude,
            captain_heading,
            last_location_update,
            partner_id,
            partners (
              id,
              full_name,
              phone,
              vehicle_number,
              vehicle_model,
              rating,
              current_lat,
              current_lng
            )
          `);

        if (cleanDbId) {
          query = query.eq("id", cleanDbId);
        } else {
          query = query.limit(1);
        }

        const { data, error } = await query.maybeSingle();

        if (isMountedRef.current && data) {
          const coords = data.route_polyline ? decodePolyline(data.route_polyline) : [];
          const partnerObj: any = Array.isArray(data.partners) ? data.partners[0] : data.partners;

          let initialCaptain: (LatLng & { heading?: number }) | null = null;
          if (
            typeof data.captain_latitude === "number" &&
            typeof data.captain_longitude === "number"
          ) {
            initialCaptain = {
              lat: data.captain_latitude,
              lng: data.captain_longitude,
              heading: data.captain_heading || 0,
            };
          } else if (
            partnerObj &&
            typeof partnerObj.current_lat === "number" &&
            typeof partnerObj.current_lng === "number"
          ) {
            initialCaptain = {
              lat: partnerObj.current_lat,
              lng: partnerObj.current_lng,
              heading: 0,
            };
          }

          const lastUp = data.last_location_update
            ? new Date(data.last_location_update).getTime()
            : null;

          setTracking({
            captainLocation: initialCaptain,
            routeCoordinates: coords,
            routePolyline: data.route_polyline || null,
            roadDistanceKm: data.road_distance_km ? Number(data.road_distance_km) : null,
            estimatedDurationMins: data.estimated_duration_mins ? Number(data.estimated_duration_mins) : null,
            orderStatus: data.order_status || "placed",
            deliveryStatus: data.delivery_status || "not_assigned",
            partner: partnerObj || null,
            isStale: lastUp ? Date.now() - lastUp > 120000 : false,
            isLoading: false,
            lastUpdated: lastUp,
            pickupCoords:
              typeof data.pickup_latitude === "number" && typeof data.pickup_longitude === "number"
                ? { lat: data.pickup_latitude, lng: data.pickup_longitude }
                : null,
            deliveryCoords:
              typeof data.delivery_latitude === "number" && typeof data.delivery_longitude === "number"
                ? { lat: data.delivery_latitude, lng: data.delivery_longitude }
                : null,
            pickupAddress: data.pickup_address || null,
            deliveryAddress: data.delivery_address || null,
          });
        }
      } catch (err) {
        console.warn("[useLiveTracking] Initial fetch notice:", err);
      } finally {
        if (isMountedRef.current) {
          setTracking((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchInitial();

    // Subscribe to live Realtime updates if we have a valid database UUID
    const targetId = cleanDbId || orderId;
    const unsubscribe = subscribeToCaptainTracking(
      targetId,
      (update: CaptainLocationUpdate) => {
        if (!isMountedRef.current) return;
        setTracking((prev) => ({
          ...prev,
          captainLocation: {
            lat: update.captainLatitude,
            lng: update.captainLongitude,
            heading: update.captainHeading,
          },
          orderStatus: update.orderStatus || prev.orderStatus,
          deliveryStatus: update.deliveryStatus || prev.deliveryStatus,
          isStale: update.isStale,
          lastUpdated: update.lastUpdatedTimestamp,
        }));
      }
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [orderId]);

  return tracking;
}
