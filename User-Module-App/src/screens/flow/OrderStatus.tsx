import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleMap from "../../components/GoogleMap";
import { useLiveTracking } from "../../hooks/useLiveTracking";
import { useRouteCalculation } from "../../hooks/useRouteCalculation";
import Logo from "../../components/Logo";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import BottomNav from "../../components/BottomNav";
import { type Service } from "../../data/demo";
import { PRESET_COORDS, type LatLng } from "../../lib/googleMaps";
import { supabase } from "../../lib/supabase";
import { parseBackendStatus } from "../../lib/orderService";
import { resolveProductImageUrl } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import { rupees } from "../../lib/pricing";
import { useI18n } from "../../lib/i18n";
import CancelOrderModal from "../../components/CancelOrderModal";
import ReviewModal from "../../components/ReviewModal";

interface OrderStatusProps {
  orderId: string;
  initialView?: "confirmed" | "tracking";
}

type PartnerInfo = {
  id: string;
  full_name: string;
  phone: string;
  rating: number;
  current_lat?: number | null;
  current_lng?: number | null;
  vehicle_type?: string;
  vehicle_number?: string;
};

export default function OrderStatus({
  orderId,
  initialView = "tracking",
}: OrderStatusProps) {
  const { push, switchTab } = useNav();
  const { state, showToast, placeById } = useApp();
  const { t } = useI18n();

  const order =
    state.orders.find((o) => o.id === orderId || o.dbId === orderId) ??
    state.orders[0];

  const [resolvedDbId, setResolvedDbId] = useState<string | null>(
    order?.dbId || (orderId && !orderId.startsWith("RR-") && orderId.length === 36 ? orderId : null)
  );
  const targetDbId = resolvedDbId || order?.dbId || (orderId && !orderId.startsWith("RR-") && orderId.length === 36 ? orderId : null);
  const displayId = order?.id || orderId;

  // Resolve backend UUID if display ID or order number was passed
  useEffect(() => {
    let isMounted = true;
    async function resolveUuid() {
      if (resolvedDbId || !supabase) return;

      if (order?.dbId) {
        setResolvedDbId(order.dbId);
        return;
      }

      if (orderId && !orderId.startsWith("RR-") && orderId.length === 36) {
        setResolvedDbId(orderId);
        return;
      }

      if (orderId && orderId.startsWith("RR-")) {
        const hexPrefix = orderId.replace("RR-", "").toLowerCase();
        const { data } = await supabase
          .from("orders")
          .select("id")
          .ilike("id", `${hexPrefix}%`)
          .maybeSingle();

        if (isMounted && data?.id) {
          setResolvedDbId(data.id);
          return;
        }
      }

      const cleanNum = orderId.replace(/\D/g, "");
      if (cleanNum) {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", cleanNum)
          .maybeSingle();

        if (isMounted && data?.id) {
          setResolvedDbId(data.id);
        }
      }
    }

    resolveUuid();
    return () => {
      isMounted = false;
    };
  }, [orderId, order?.dbId, resolvedDbId]);

  const service: Service = order?.service ?? "food";
  const isRide = service === "rides";

  const cartCount =
    state.carts.food.lines.reduce((sum, l) => sum + l.qty, 0) +
    state.carts.grocery.lines.reduce((sum, l) => sum + l.qty, 0);

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>(
    order?.orderStatus || (order as any)?.status || "placed"
  );
  const [liveRestaurantStatus, setLiveRestaurantStatus] = useState<string>(
    order?.restaurantStatus || order?.orderStatus || (order as any)?.status || "placed"
  );
  const [liveDeliveryStatus, setLiveDeliveryStatus] = useState<string>(
    order?.deliveryStatus || "not_assigned"
  );
  const [countdownText, setCountdownText] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [customerDeliveryPin, setCustomerDeliveryPin] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);

  const isCancelled =
    liveRestaurantStatus === "cancelled" ||
    liveRestaurantStatus === "rejected" ||
    liveDeliveryStatus === "cancelled" ||
    liveStatus === "cancelled" ||
    liveStatus === "rejected" ||
    order?.status === -1 ||
    order?.orderStatus === "cancelled" ||
    order?.orderStatus === "rejected";

  // If this is a ride, route to dedicated ride tracking / waiting screens
  useEffect(() => {
    if (isRide && order) {
      if (!order.partnerId && order.status <= 0) {
        push({ name: "waitingForRider", orderId: order.id });
      } else {
        push({ name: "rideTracking", orderId: order.id });
      }
    }
  }, [isRide, order, push]);

  // Fetch initial partner info and live status from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadOrderAndPartner() {
      if (!supabase || !targetDbId) return;

      const { data: ord } = await supabase
        .from("orders")
        .select("partner_id, order_status, restaurant_status, delivery_status")
        .eq("id", targetDbId)
        .maybeSingle();

      if (!ord || !isMounted) return;

      const rawOs = (ord.order_status || (ord as any).status || "").toLowerCase().trim();
      if (rawOs) setLiveStatus(rawOs);
      if (ord.restaurant_status) setLiveRestaurantStatus(ord.restaurant_status.toLowerCase().trim());
      if (ord.delivery_status) setLiveDeliveryStatus(ord.delivery_status.toLowerCase().trim());

      const targetPartnerId = ord.partner_id || order?.partnerId;
      if (targetPartnerId) {
        const { data: p } = await supabase
          .from("partners")
          .select("*")
          .eq("id", targetPartnerId)
          .maybeSingle();
        if (isMounted && p) setPartner(p);
      }
    }

    loadOrderAndPartner();
    return () => {
      isMounted = false;
    };
  }, [targetDbId, order?.partnerId]);

  // Realtime subscription on orders table
  useEffect(() => {
    if (!supabase || !targetDbId) return;

    const channelName = `food-tracking-${targetDbId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${targetDbId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          const rawOs = (updated.order_status || updated.status || "").toLowerCase().trim();
          if (rawOs) {
            setLiveStatus(rawOs);
          }
          if (updated.restaurant_status) {
            setLiveRestaurantStatus(updated.restaurant_status.toLowerCase().trim());
          }
          if (updated.delivery_status) {
            setLiveDeliveryStatus(updated.delivery_status.toLowerCase().trim());
          }

          if (updated.partner_id && (!partner || partner.id !== updated.partner_id)) {
            if (supabase) {
              const { data: p } = await supabase
                .from("partners")
                .select("*")
                .eq("id", updated.partner_id)
                .maybeSingle();
              if (p) setPartner(p);
            }
          }

          // Exact status notifications
          if (rawOs === "ready") {
            showToast(t("order_ready_title", "Order Ready"));
          } else if (rawOs === "handed_over") {
            showToast(t("out_for_delivery_title", "Out for Delivery"));
          } else if (
            rawOs === "delivered" ||
            rawOs === "completed" ||
            updated.delivery_status === "delivered"
          ) {
            showToast(t("order_delivered_desc", "Your order has been delivered! Enjoy your meal."));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [targetDbId, partner, showToast, t]);

  // Realtime subscription on order_otp_verifications for instant customer delivery OTP updates
  useEffect(() => {
    if (!supabase || !targetDbId) return;

    const otpChannel = supabase
      .channel(`food-otp-rt-${targetDbId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_otp_verifications",
          filter: `order_id=eq.${targetDbId}`,
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.otp_type === "customer_delivery" && rec.otp_code) {
            setCustomerDeliveryPin(String(rec.otp_code).trim());
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(otpChannel);
      }
    };
  }, [targetDbId]);

  // Realtime partner location tracking subscription
  useEffect(() => {
    if (!supabase || !partner?.id) return;

    const partnerChannel = supabase
      .channel(`partner-live-loc-${partner.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partners",
          filter: `id=eq.${partner.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated) return;
          setPartner((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(partnerChannel);
      }
    };
  }, [partner?.id]);

  // Preparation Countdown Timer (persisted deadline from Vendor App)
  useEffect(() => {
    const updateCountdown = () => {
      const deadlineIso = order?.prepDeadline || order?.promisedBy;
      let deadlineMs = 0;

      if (deadlineIso) {
        deadlineMs = new Date(deadlineIso).getTime();
      } else if (order?.acceptedAt && order?.prepMinutes) {
        deadlineMs =
          new Date(order.acceptedAt).getTime() + order.prepMinutes * 60000;
      } else if (order?.createdAt && order?.prepMinutes) {
        deadlineMs = order.createdAt + order.prepMinutes * 60000;
      }

      if (deadlineMs > 0) {
        const diffSec = Math.floor((deadlineMs - Date.now()) / 1000);
        if (diffSec <= 0) {
          setIsOverdue(true);
          setCountdownText(t("packing_finishing", "Finishing up & packing now"));
        } else {
          setIsOverdue(false);
          const mins = Math.floor(diffSec / 60);
          const secs = diffSec % 60;
          setCountdownText(`${mins}:${secs < 10 ? "0" : ""}${secs} mins`);
        }
      } else {
        setCountdownText(`${order?.prepMinutes || 25} mins`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [order?.prepDeadline, order?.promisedBy, order?.acceptedAt, order?.createdAt, order?.prepMinutes, t]);

  const liveTracking = useLiveTracking(targetDbId || orderId);

  // Active Partner Info
  const activePartner: PartnerInfo | null = useMemo(() => {
    if (liveTracking.partner) {
      return {
        id: liveTracking.partner.id || partner?.id || "p1",
        full_name: liveTracking.partner.full_name || partner?.full_name || "Delivery Partner",
        phone: liveTracking.partner.phone || partner?.phone || "",
        rating: Number(liveTracking.partner.rating || partner?.rating || 4.9),
        current_lat: liveTracking.partner.current_lat ?? partner?.current_lat,
        current_lng: liveTracking.partner.current_lng ?? partner?.current_lng,
        vehicle_type: liveTracking.partner.vehicle_type || partner?.vehicle_type,
        vehicle_number: liveTracking.partner.vehicle_number || partner?.vehicle_number,
      };
    }
    return partner;
  }, [liveTracking.partner, partner]);

  const userPlace =
    state.places.find((p) => p.id === state.defaultPlaceId) ?? state.places[0];

  const destinationCoords: LatLng = useMemo(() => {
    if (liveTracking.deliveryCoords) {
      return {
        lat: liveTracking.deliveryCoords.lat,
        lng: liveTracking.deliveryCoords.lng,
        label: liveTracking.deliveryAddress || userPlace?.label || "Delivery",
      };
    }
    if ((order as any)?.destination_latitude && (order as any)?.destination_longitude) {
      return {
        lat: Number((order as any).destination_latitude),
        lng: Number((order as any).destination_longitude),
        label: (order as any).destination_address || userPlace?.label || "Delivery",
      };
    }
    if ((order as any)?.metadata?.dropCoords) {
      return {
        lat: (order as any).metadata.dropCoords.lat,
        lng: (order as any).metadata.dropCoords.lng,
        label: (order as any).metadata.dropAddress || "Delivery",
      };
    }
    if (userPlace?.coords) {
      return { ...userPlace.coords, label: userPlace.label };
    }
    return PRESET_COORDS.home;
  }, [liveTracking.deliveryCoords, liveTracking.deliveryAddress, order, userPlace]);

  const originCoords: LatLng = useMemo(() => {
    if (liveTracking.pickupCoords) {
      return {
        lat: liveTracking.pickupCoords.lat,
        lng: liveTracking.pickupCoords.lng,
        label: liveTracking.pickupAddress || order?.title || "Restaurant",
      };
    }
    if ((order as any)?.pickup_latitude && (order as any)?.pickup_longitude) {
      return {
        lat: Number((order as any).pickup_latitude),
        lng: Number((order as any).pickup_longitude),
        label: (order as any).pickup_address || order?.title || "Restaurant",
      };
    }
    if ((order as any)?.metadata?.pickupCoords) {
      return {
        lat: (order as any).metadata.pickupCoords.lat,
        lng: (order as any).metadata.pickupCoords.lng,
        label: (order as any).metadata.pickupAddress || order?.title || "Restaurant",
      };
    }
    return { ...PRESET_COORDS.restaurant, label: order?.title || "Restaurant" };
  }, [liveTracking.pickupCoords, liveTracking.pickupAddress, order]);

  // Compute road route if liveTracking doesn't already have one
  const { route: fallbackRoute } = useRouteCalculation(
    liveTracking.routeCoordinates.length === 0 ? originCoords : null,
    liveTracking.routeCoordinates.length === 0 ? destinationCoords : null
  );

  const activeRouteCoordinates = useMemo(() => {
    if (liveTracking.routeCoordinates.length > 0) {
      return liveTracking.routeCoordinates;
    }
    if (fallbackRoute?.coordinates && fallbackRoute.coordinates.length > 0) {
      return fallbackRoute.coordinates;
    }
    return undefined;
  }, [liveTracking.routeCoordinates, fallbackRoute]);

  // 1. Restaurant Step Index (0 to 3)
  const restaurantStepIndex = useMemo(() => {
    const rs = (liveRestaurantStatus || "").toLowerCase();
    const os = (liveStatus || "").toLowerCase();
    if (rs === "cancelled" || rs === "rejected" || os === "cancelled" || os === "rejected") return -1;
    // If order is past ready stage, restaurant progress is fully completed (3)
    if (["picked_up", "out_for_delivery", "delivered", "in_transit", "handed_over", "completed"].includes(os)) {
      return 3;
    }
    if (rs === "packed_ready" || rs === "ready" || os === "ready") return 3;
    if (rs === "preparing" || os === "preparing") return 2;
    if (rs === "accepted" || os === "accepted") return 1;
    return 0; // placed
  }, [liveRestaurantStatus, liveStatus]);

  const RESTAURANT_STEPS = useMemo(() => [
    { key: "placed", title: t("order_placed_title", "Order Placed"), desc: t("order_placed_desc", "Order received by restaurant") },
    { key: "accepted", title: t("restaurant_accepted_title", "Restaurant Accepted"), desc: t("restaurant_accepted_desc", "Kitchen acknowledged your order") },
    { key: "preparing", title: t("preparing_food_title", "Preparing Food"), desc: t("preparing_food_desc", "Chef is preparing your dishes") },
    { key: "ready", title: t("order_ready_title", "Order Ready"), desc: t("order_ready_desc", "Food packed, sealed & ready for pickup") },
  ], [t]);

  // 2. Delivery Step Index (0 to 4, or -2 if awaiting restaurant packed_ready)
  const isRiderSearchUnlocked = restaurantStepIndex >= 3;

  const deliveryStepIndex = useMemo(() => {
    const ds = (liveDeliveryStatus || "").toLowerCase().trim();
    const os = (liveStatus || "").toLowerCase().trim();
    if (ds === "cancelled" || ds === "failed" || os === "cancelled") return -1;
    if (ds === "delivered" || os === "delivered" || os === "completed") return 4;
    // handed_over is strictly Out for Delivery (Step 3)
    if (
      os === "handed_over" ||
      ds === "handed_over" ||
      ds === "out_for_delivery" ||
      os === "out_for_delivery" ||
      os === "in_transit" ||
      os === "on_the_way"
    ) {
      return 3;
    }
    if (ds === "picked_up" || os === "picked_up") return 2;
    if (ds === "assigned" || ds === "arriving_at_restaurant" || activePartner) return 1;
    if (ds === "searching" || isRiderSearchUnlocked || os === "ready") return 0;
    return -2;
  }, [liveDeliveryStatus, liveStatus, activePartner, isRiderSearchUnlocked]);

  const DELIVERY_STEPS = useMemo(() => [
    { key: "searching", title: t("finding_rider_title", "Finding Rider"), desc: t("finding_rider_desc", "Searching for nearby delivery partner") },
    { key: "assigned", title: t("rider_assigned_title", "Partner Assigned"), desc: t("rider_assigned_desc", "Heading to restaurant for pickup") },
    { key: "picked_up", title: t("rider_picked_up_title", "Order Picked Up"), desc: t("rider_picked_up_desc", "Food collected from restaurant") },
    { key: "out_for_delivery", title: t("out_for_delivery_title", "Out for Delivery"), desc: t("out_for_delivery_desc", "Rider on the way to your door") },
    { key: "delivered", title: t("order_delivered_title", "Order Delivered"), desc: t("order_delivered_desc", "Delivered! Enjoy your meal") },
  ], [t]);

  // Real Rider Coordinates: ONLY show if partner is assigned and active
  const riderCoords: LatLng | undefined = useMemo(() => {
    if (deliveryStepIndex >= 1 && liveTracking.captainLocation) {
      return {
        lat: liveTracking.captainLocation.lat,
        lng: liveTracking.captainLocation.lng,
        label: `${activePartner?.full_name || "Rider"} (Live)`,
      };
    }
    if (
      deliveryStepIndex >= 1 &&
      activePartner?.current_lat &&
      activePartner?.current_lng &&
      typeof activePartner.current_lat === "number" &&
      typeof activePartner.current_lng === "number"
    ) {
      return {
        lat: activePartner.current_lat,
        lng: activePartner.current_lng,
        label: `${activePartner.full_name} (Delivery)`,
      };
    }
    return undefined;
  }, [activePartner, deliveryStepIndex, liveTracking.captainLocation]);

  // Fetch Customer Delivery Verification PIN strictly for customer_delivery from order_otp_verifications
  useEffect(() => {
    let isMounted = true;
    async function loadDeliveryPin() {
      if (!supabase || !targetDbId) return;

      setIsLoadingPin(true);
      try {
        // Query order_otp_verifications strictly filtered by current order ID and customer_delivery
        const { data, error } = await supabase
          .from("order_otp_verifications")
          .select("id, order_id, otp_type, otp_code, expires_at, verified_at")
          .eq("order_id", targetDbId)
          .eq("otp_type", "customer_delivery")
          .maybeSingle();

        if (error) {
          console.warn("[OrderStatus] order_otp_verifications select error:", error.message);
        }

        if (data && data.otp_type === "customer_delivery" && data.otp_code) {
          const isExpired = data.expires_at && new Date(data.expires_at).getTime() < Date.now();
          if (!isExpired && isMounted) {
            setCustomerDeliveryPin(String(data.otp_code).trim());
            return;
          }
        }

        // Fallback RPC if table row is being derived or pre-generated
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_customer_delivery_otp", {
          p_order_id: targetDbId,
        });

        if (!rpcErr && rpcData && rpcData.success && rpcData.otp_code && isMounted) {
          setCustomerDeliveryPin(String(rpcData.otp_code).trim());
        }
      } catch (err) {
        console.warn("[OrderStatus] Error loading delivery PIN:", err);
      } finally {
        if (isMounted) setIsLoadingPin(false);
      }
    }

    loadDeliveryPin();
    const interval = setInterval(loadDeliveryPin, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [targetDbId]);

  // Dynamic Headline Title and Subtitle with strict backend status mapping
  const statusTitle = useMemo(() => {
    const os = (liveStatus || "").toLowerCase().trim();
    const ds = (liveDeliveryStatus || "").toLowerCase().trim();
    const rs = (liveRestaurantStatus || "").toLowerCase().trim();

    if (isCancelled) return t("order_cancelled_title", "Order Cancelled");
    if (deliveryStepIndex === 4 || os === "delivered" || os === "completed" || ds === "delivered") {
      return t("order_delivered_title", "Delivered Successfully!");
    }

    // MANDATORY RULE 1: handed_over = Out for Delivery (NEVER Order Ready)
    if (
      os === "handed_over" ||
      ds === "handed_over" ||
      os === "out_for_delivery" ||
      ds === "out_for_delivery" ||
      os === "in_transit" ||
      os === "on_the_way" ||
      deliveryStepIndex === 3
    ) {
      return t("out_for_delivery_title", "Out for Delivery");
    }

    // MANDATORY RULE 2: ready = Order Ready (NEVER Out for Delivery)
    if (os === "ready" || rs === "ready" || rs === "packed_ready" || restaurantStepIndex === 3) {
      return t("order_ready_title", "Order Ready");
    }

    // Picked up
    if (deliveryStepIndex === 2 || os === "picked_up" || ds === "picked_up") {
      return t("rider_picked_up_title", "Rider Picked Up Your Food");
    }

    // Partner Assigned / Searching
    if (deliveryStepIndex === 1) return t("rider_assigned_title", "Delivery Partner Assigned");
    if (deliveryStepIndex === 0) return t("finding_rider_title", "Finding Nearby Delivery Partner");

    // Restaurant Progress Headings
    if (restaurantStepIndex === 2 || os === "preparing" || rs === "preparing") {
      return t("preparing_food_title", "Kitchen Preparing Your Food");
    }
    if (restaurantStepIndex === 1 || os === "accepted" || rs === "accepted") {
      return t("restaurant_accepted_title", "Restaurant Accepted Your Order");
    }
    return t("order_placed_title", "Order Placed · Awaiting Confirmation");
  }, [isCancelled, deliveryStepIndex, restaurantStepIndex, liveStatus, liveDeliveryStatus, liveRestaurantStatus, t]);

  const statusSubtitle = useMemo(() => {
    const os = (liveStatus || "").toLowerCase().trim();
    const ds = (liveDeliveryStatus || "").toLowerCase().trim();
    const rs = (liveRestaurantStatus || "").toLowerCase().trim();

    if (isCancelled) {
      return t("order_cancelled_desc", "This order was cancelled. Any online payment will be refunded.");
    }
    if (deliveryStepIndex === 4 || os === "delivered" || os === "completed" || ds === "delivered") {
      return t("order_delivered_desc", "Delivered! Enjoy your meal");
    }

    // MANDATORY RULE 1: handed_over = Out for Delivery subtitle
    if (
      os === "handed_over" ||
      ds === "handed_over" ||
      os === "out_for_delivery" ||
      ds === "out_for_delivery" ||
      os === "in_transit" ||
      os === "on_the_way" ||
      deliveryStepIndex === 3
    ) {
      return t("out_for_delivery_desc", "Delivery partner is navigating to your address.");
    }

    // MANDATORY RULE 2: ready = Order Ready subtitle
    if (os === "ready" || rs === "ready" || rs === "packed_ready" || restaurantStepIndex === 3) {
      return t("order_ready_desc", "Your food is packed and ready for pickup by the delivery partner.");
    }

    if (deliveryStepIndex === 2 || os === "picked_up" || ds === "picked_up") {
      return t("rider_picked_up_desc", "Order handed over to partner. Heading your way.");
    }
    if (deliveryStepIndex === 1) {
      return t("rider_assigned_desc", "Partner heading to restaurant for pickup");
    }
    if (deliveryStepIndex === 0) {
      return t("finding_rider_desc", "Food is packed! Searching for the nearest delivery captain to pick up your order...");
    }
    if (restaurantStepIndex === 2 || os === "preparing" || rs === "preparing") {
      return isOverdue
        ? t("packing_finishing", "Kitchen is finishing up the preparation and packaging.")
        : `${t("estimated_prep_time", "Estimated preparation countdown")}: ${countdownText}`;
    }
    return t("order_pending_subtitle", "We keep you updated at every step.");
  }, [isCancelled, deliveryStepIndex, restaurantStepIndex, liveStatus, liveDeliveryStatus, liveRestaurantStatus, isOverdue, countdownText, t]);

  const storeName = order?.title || "Approved Restaurant";

  const handleCallPartner = () => {
    if (partner?.phone) {
      Linking.openURL(`tel:${partner.phone}`).catch(() => {
        showToast(`Rider phone: ${partner.phone}`);
      });
    } else {
      showToast("Rider phone is not available yet.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map Header */}
      <View style={styles.mapHeader}>
        <GoogleMap
          origin={originCoords}
          destination={destinationCoords}
          driver={riderCoords}
          captainLocation={
            deliveryStepIndex >= 1 && liveTracking.captainLocation
              ? liveTracking.captainLocation
              : undefined
          }
          routeCoordinates={activeRouteCoordinates}
          showRoute
          showRecenterBtn
          theme="default"
          interactive
        />

        {/* Live ETA floating badge */}
        <View style={styles.mapEtaBadge}>
          <Icon name="clock" size={12} color="#FFFFFF" />
          <Text style={styles.mapEtaText}>
            {deliveryStepIndex >= 3
              ? liveTracking.estimatedDurationMins
                ? `${liveTracking.estimatedDurationMins} mins away`
                : "12 mins away"
              : countdownText || "20 mins"}
          </Text>
        </View>

        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <Logo light size={22} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "help", orderId: displayId })}
            style={styles.helpButton}
          >
            <Icon name="shield" size={13} color="#ffffff" />
            <Text style={styles.helpButtonText}>{t("help", "Help")}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Main Tracking Sheet */}
      <View style={styles.sheetContainer}>
        <View style={styles.sheetDragBar} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Headline Banner */}
          <View style={styles.headerBanner}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.kicker,
                  { color: isCancelled ? "#ef4444" : colors.accent },
                ]}
              >
                {isCancelled
                  ? t("cancelled", "CANCELLED")
                  : deliveryStepIndex >= 4 || liveStatus === "delivered" || liveStatus === "completed"
                  ? t("completed", "COMPLETED")
                  : liveStatus === "handed_over" || liveStatus === "out_for_delivery" || deliveryStepIndex === 3
                  ? t("out_for_delivery_kicker", "OUT FOR DELIVERY")
                  : liveStatus === "ready" || restaurantStepIndex === 3
                  ? t("order_ready_kicker", "ORDER READY")
                  : t("live_tracking", "LIVE ORDER TRACKING")}
              </Text>
              <Text style={styles.mainTitle}>{statusTitle}</Text>
              <Text style={styles.mainSubtitle}>{statusSubtitle}</Text>
            </View>

            {/* Countdown Badge for Kitchen Preparation */}
            {restaurantStepIndex >= 1 && restaurantStepIndex <= 2 && !isCancelled && (
              <View
                style={[
                  styles.countdownBadge,
                  isOverdue && styles.countdownBadgeOverdue,
                ]}
              >
                <Icon
                  name="clock"
                  size={14}
                  color={isOverdue ? "#b45309" : colors.accent}
                />
                <Text
                  style={[
                    styles.countdownText,
                    isOverdue && styles.countdownTextOverdue,
                  ]}
                >
                  {countdownText}
                </Text>
              </View>
            )}
          </View>

          {/* Cancel Order Action when pending/early stage */}
          {!isCancelled && restaurantStepIndex <= 2 && (
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.8}
            >
              <Icon name="close" size={14} color="#dc2626" />
              <Text style={styles.cancelActionText}>
                {t("cancel_order_btn", "Cancel Order")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Rate & Review Action when delivered */}
          {!isCancelled && deliveryStepIndex >= 4 && !hasReviewed && (
            <TouchableOpacity
              style={styles.rateActionBtn}
              onPress={() => setShowReviewModal(true)}
              activeOpacity={0.8}
            >
              <Icon name="star" size={16} filled color="#ffffff" />
              <Text style={styles.rateActionText}>
                {t("rate_experience", "Rate & Review Your Order")}
              </Text>
            </TouchableOpacity>
          )}

          {/* ============================================================== */}
          {/* SECTION A: RESTAURANT PROGRESS TIMELINE */}
          {/* ============================================================== */}
          {!isCancelled && (
            <View style={styles.timelineCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="food" size={14} color={colors.accent} />
                <Text style={styles.sectionHeader}>
                  {t("timeline_restaurant_title", "RESTAURANT PROGRESS")}
                </Text>
              </View>

              <View style={styles.timelineList}>
                {RESTAURANT_STEPS.map((step, idx) => {
                  const isCompleted = idx <= restaurantStepIndex;
                  const isCurrent = idx === restaurantStepIndex;
                  const isLast = idx === RESTAURANT_STEPS.length - 1;

                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineIndicatorCol}>
                        <View
                          style={[
                            styles.timelineCircle,
                            isCompleted && styles.timelineCircleCompleted,
                            isCurrent && styles.timelineCircleCurrent,
                          ]}
                        >
                          {isCompleted ? (
                            <Icon name="check" size={10} color="#ffffff" />
                          ) : (
                            <View style={styles.timelineDotInner} />
                          )}
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.timelineConnector,
                              idx < restaurantStepIndex &&
                                styles.timelineConnectorCompleted,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.timelineTextCol}>
                        <Text
                          style={[
                            styles.timelineStepTitle,
                            isCompleted && styles.timelineStepTitleCompleted,
                            isCurrent && styles.timelineStepTitleCurrent,
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.timelineStepDesc}>
                          {step.desc}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* SECTION B: DELIVERY PROGRESS & RIDER SEARCH */}
          {/* ============================================================== */}
          {!isCancelled && (
            <View style={styles.timelineCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="car" size={14} color={colors.accent} />
                <Text style={styles.sectionHeader}>
                  {t("timeline_delivery_title", "DELIVERY PROGRESS")}
                </Text>
              </View>

              {/* B1. Awaiting Kitchen Packaging Notice (Rider search has NOT started) */}
              {!isRiderSearchUnlocked ? (
                <View style={styles.awaitingPrepCard}>
                  <View style={styles.awaitingIconContainer}>
                    <Icon name="clock" size={24} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.awaitingPrepTitle}>
                      {t("awaiting_kitchen_title", "Awaiting Kitchen Packaging")}
                    </Text>
                    <Text style={styles.awaitingPrepDesc}>
                      {t(
                        "awaiting_kitchen_desc",
                        "Your restaurant is preparing your order. Rider search will begin as soon as food is packed & ready."
                      )}
                    </Text>
                    <View style={styles.pausedBadge}>
                      <Icon name="info" size={11} color="#b45309" />
                      <Text style={styles.pausedBadgeText}>
                        {t(
                          "rider_paused_badge",
                          "Rider search begins after food is ready"
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* B2. Rider Discovery & Delivery Lifecycle Active */
                <View style={styles.timelineList}>
                  {DELIVERY_STEPS.map((step, idx) => {
                    const isCompleted = idx <= deliveryStepIndex;
                    const isCurrent = idx === deliveryStepIndex;
                    const isLast = idx === DELIVERY_STEPS.length - 1;

                    return (
                      <View key={step.key} style={styles.timelineRow}>
                        <View style={styles.timelineIndicatorCol}>
                          <View
                            style={[
                              styles.timelineCircle,
                              isCompleted && styles.timelineCircleCompleted,
                              isCurrent && styles.timelineCircleCurrent,
                            ]}
                          >
                            {isCompleted ? (
                              <Icon name="check" size={10} color="#ffffff" />
                            ) : (
                              <View style={styles.timelineDotInner} />
                            )}
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                styles.timelineConnector,
                                idx < deliveryStepIndex &&
                                  styles.timelineConnectorCompleted,
                              ]}
                            />
                          )}
                        </View>

                        <View style={styles.timelineTextCol}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text
                              style={[
                                styles.timelineStepTitle,
                                isCompleted && styles.timelineStepTitleCompleted,
                                isCurrent && styles.timelineStepTitleCurrent,
                              ]}
                            >
                              {step.title}
                            </Text>
                            {isCurrent && deliveryStepIndex === 0 && (
                              <ActivityIndicator size="small" color={colors.accent} />
                            )}
                          </View>
                          <Text style={styles.timelineStepDesc}>
                            {step.desc}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Delivery Partner Status Card (When Rider Search Starts or Partner Assigned) */}
          {!isCancelled && isRiderSearchUnlocked && (
            <View style={styles.partnerCard}>
              {partner ? (
                <View style={styles.partnerRow}>
                  <View style={styles.partnerAvatar}>
                    <Icon name="user" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.partnerNameRow}>
                      <Text style={styles.partnerName}>{partner.full_name}</Text>
                      <View style={styles.ratingBadge}>
                        <Icon name="star" size={10} filled color="#f59e0b" />
                        <Text style={styles.ratingText}>
                          {partner.rating ? Number(partner.rating).toFixed(1) : "5.0"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.partnerSub}>
                      {partner.vehicle_type
                        ? `${partner.vehicle_type} · ${partner.vehicle_number || "Verified"}`
                        : t(
                            "verified_partner",
                            "RoadRider Verified Partner · Assigned to your delivery"
                          )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleCallPartner}
                    style={styles.partnerCallBtn}
                  >
                    <Icon name="phone" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.partnerPendingRow}>
                  <View style={styles.partnerPendingIcon}>
                    <Icon name="box" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerPendingTitle}>
                      {t("finding_rider_title", "Finding Nearby Delivery Partner")}
                    </Text>
                    <Text style={styles.partnerPendingSub}>
                      {t(
                        "finding_rider_desc",
                        "Food is packed! Searching for the nearest delivery captain to pick up your order..."
                      )}
                    </Text>
                  </View>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              )}
            </View>
          )}

          {/* Customer Delivery Verification PIN Card (Visible once ready, handed over, or when PIN is loaded) */}
          {!isCancelled && (deliveryStepIndex >= 2 || liveStatus === "ready" || liveStatus === "handed_over" || Boolean(customerDeliveryPin)) && (
            <View style={styles.deliveryPinCard}>
              <View style={styles.pinHeaderRow}>
                <View style={styles.pinTitleGroup}>
                  <Icon
                    name="shield"
                    size={16}
                    color={deliveryStepIndex >= 4 ? "#10b981" : colors.accent}
                  />
                  <Text
                    style={[
                      styles.pinKicker,
                      deliveryStepIndex >= 4 && { color: "#10b981" },
                    ]}
                  >
                    {deliveryStepIndex >= 4
                      ? t("completed", "DELIVERY COMPLETED")
                      : t("delivery_pin_title", "DELIVERY VERIFICATION PIN")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pinBadge,
                    deliveryStepIndex >= 4 && styles.pinBadgeDelivered,
                  ]}
                >
                  <Text
                    style={[
                      styles.pinBadgeText,
                      deliveryStepIndex >= 4 && styles.pinBadgeTextDelivered,
                    ]}
                  >
                    {deliveryStepIndex >= 4
                      ? t("verified", "Verified")
                      : t("share_at_door", "Share at Door")}
                  </Text>
                </View>
              </View>

              {deliveryStepIndex >= 4 ? (
                <View style={styles.pinSuccessRow}>
                  <Icon name="check" size={18} color="#10b981" />
                  <Text style={styles.pinSuccessText}>
                    {t(
                      "pin_verified_msg",
                      "PIN verified by your delivery partner. Order delivered successfully!"
                    )}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.pinDigitsRow}>
                    {isLoadingPin && !customerDeliveryPin ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : customerDeliveryPin ? (
                      customerDeliveryPin.split("").map((digit, i) => (
                        <View key={i} style={styles.pinDigitBox}>
                          <Text style={styles.pinDigitText}>{digit}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.pinPendingText}>
                        {t("generating_pin", "Generating secure delivery PIN...")}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.pinInstructionText}>
                    {t(
                      "delivery_pin_subtitle",
                      "Share this PIN with your delivery partner only after receiving and checking your order package."
                    )}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Ordered Food Items List */}
          <View style={styles.itemsCard}>
            <Text style={styles.sectionHeaderSimple}>
              {t("ordered_items", "ORDERED ITEMS")}
            </Text>
            <Text style={styles.storeTitle}>{storeName}</Text>

            <View style={styles.itemsDivider} />

            {order?.lines && order.lines.length > 0 ? (
              order.lines.map((line, i) => {
                const imgUri = resolveProductImageUrl((line as any).photo);
                const lineTotal = line.price * line.qty;
                return (
                  <View key={`${line.name}-${i}`} style={styles.itemRow}>
                    <View style={styles.itemImageContainer}>
                      {imgUri ? (
                        <Image
                          source={{ uri: imgUri }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.itemPlaceholder}>
                          <Icon name="food" size={20} color={colors.accent} />
                        </View>
                      )}
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{line.name}</Text>
                      <Text style={styles.itemMeta}>
                        Quantity: <Text style={styles.boldText}>{line.qty}x</Text> · {rupees(line.price)} each
                      </Text>
                    </View>

                    <Text style={styles.itemPriceText}>{rupees(lineTotal)}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noItemsText}>Order item details loading...</Text>
            )}

            {/* Bill Total Breakdown */}
            <View style={styles.billBox}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>{t("item_total", "Item Total")}</Text>
                <Text style={styles.billVal}>
                  {order?.bill?.itemTotal ? rupees(order.bill.itemTotal) : "₹0"}
                </Text>
              </View>

              {order?.bill?.discount ? (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Discount</Text>
                  <Text style={[styles.billVal, { color: "#10b981" }]}>
                    − {rupees(order.bill.discount)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>{t("delivery_fee", "Delivery Fee")}</Text>
                <Text style={[styles.billVal, { color: "#10b981" }]}>
                  {t("free", "FREE")}
                </Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>{t("taxes_fees", "Taxes & Platform Fees")}</Text>
                <Text style={styles.billVal}>
                  {order?.bill?.taxes ? rupees(order.bill.taxes) : "₹18"}
                </Text>
              </View>

              <View style={[styles.billRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>
                  {t("to_pay", "Total Paid")} ({order?.payment || "Cash on Delivery"})
                </Text>
                <Text style={styles.totalVal}>
                  {order?.bill?.toPay ? rupees(order.bill.toPay) : "₹0"}
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery Address Card */}
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <View style={styles.addressIcon}>
                <Icon name="pin" size={18} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressHeader}>
                  {t("delivering_to_title", "DELIVERING TO")}
                </Text>
                <Text style={styles.addressText}>
                  {order?.destination || userPlace?.line || "Lucknow, Uttar Pradesh"}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Action Button */}
          <View style={{ marginTop: 20 }}>
            <Button
              onPress={() => push({ name: "orders" })}
              accentColor={colors.accent}
            >
              {t("view_all_orders", "View all orders")}
            </Button>
          </View>
        </ScrollView>
      </View>

      {/* Persistent Bottom Navigation with Home Tab */}
      <BottomNav
        active="orders"
        count={cartCount}
        onSelect={(tab) => {
          if (tab === "home") {
            push({ name: "mainTabs", screen: "home" });
          } else {
            push({ name: "mainTabs", screen: tab });
          }
        }}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        visible={showCancelModal}
        orderId={displayId}
        dbId={targetDbId || undefined}
        onClose={() => setShowCancelModal(false)}
        onCancelled={(_reason) => {
          setLiveRestaurantStatus("cancelled");
          setLiveDeliveryStatus("cancelled");
          setLiveStatus("cancelled");
          showToast("Order cancelled successfully.");
        }}
      />

      {/* Review & Rating Modal */}
      <ReviewModal
        visible={showReviewModal}
        orderId={displayId}
        dbId={targetDbId || undefined}
        partnerId={partner?.id}
        storeName={storeName}
        onClose={() => setShowReviewModal(false)}
        onSubmitted={() => {
          setHasReviewed(true);
          showToast("Review submitted successfully!");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  mapHeader: {
    height: 230,
    position: "relative",
    overflow: "hidden",
  },
  mapEtaBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(23, 21, 20, 0.88)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  mapEtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    zIndex: 10,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  helpButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 10,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },
  cancelActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 10,
    borderRadius: radii.lg,
    marginBottom: 14,
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  rateActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radii.lg,
    marginBottom: 14,
  },
  rateActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 22,
  },
  mainSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 17,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(200, 75, 49, 0.1)",
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.lg,
    marginLeft: 8,
  },
  countdownBadgeOverdue: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent,
  },
  countdownTextOverdue: {
    color: "#b45309",
  },
  timelineCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.8,
  },
  sectionHeaderSimple: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIndicatorCol: {
    alignItems: "center",
    width: 24,
  },
  timelineCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineCircleCompleted: {
    backgroundColor: colors.accent,
  },
  timelineCircleCurrent: {
    borderWidth: 2,
    borderColor: "#991b1b",
    backgroundColor: colors.accent,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94a3b8",
  },
  timelineConnector: {
    width: 2,
    height: 28,
    backgroundColor: "#e2e8f0",
    marginVertical: 2,
  },
  timelineConnectorCompleted: {
    backgroundColor: colors.accent,
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  timelineStepTitleCompleted: {
    color: colors.ink,
    fontWeight: "700",
  },
  timelineStepTitleCurrent: {
    color: colors.accent,
    fontWeight: "800",
  },
  timelineStepDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  awaitingPrepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 12,
  },
  awaitingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  awaitingPrepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
  },
  awaitingPrepDesc: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 3,
    lineHeight: 16,
  },
  pausedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
  },
  deliveryPinCard: {
    backgroundColor: "#fff7ed",
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    marginBottom: 14,
  },
  pinHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pinTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pinKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.accent,
  },
  pinBadge: {
    backgroundColor: "#ffedd5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  pinBadgeDelivered: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  pinBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  pinBadgeTextDelivered: {
    color: "#059669",
  },
  pinDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 10,
  },
  pinDigitBox: {
    width: 42,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fdba74",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pinDigitText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
  },
  pinPendingText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
    paddingVertical: 12,
  },
  pinInstructionText: {
    fontSize: 12,
    color: "#78350f",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  pinSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: radii.md,
    gap: 8,
  },
  pinSuccessText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
    lineHeight: 16,
  },
  partnerCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  partnerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b45309",
  },
  partnerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  partnerCallBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerPendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  partnerPendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(200, 75, 49, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerPendingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  partnerPendingSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  itemsCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  itemsDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  itemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(200, 75, 49, 0.08)",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  boldText: {
    fontWeight: "700",
    color: colors.ink,
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  noItemsText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    paddingVertical: 6,
  },
  billBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  billLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  billVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
  },
  totalVal: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.accent,
  },
  addressCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  addressHeader: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
  },
  addressText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "600",
    marginTop: 1,
  },
});
