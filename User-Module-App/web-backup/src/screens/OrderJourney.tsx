import { useEffect, useState } from "react";
import { Button, FlowHeader, Icon } from "../ui";
import { useNav } from "../nav";
import { inr, useStore } from "../store";
import {
  LiveOrderTracking,
  subscribeToLiveOrder,
  fetchOrderTrackingDetails,
} from "../services/tracking.service";
import { submitOrderReview, hasOrderBeenReviewed } from "../services/review.service";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { useI18n } from "../i18n";

interface OrderJourneyProps {
  orderId?: string | number | null;
  onBack: () => void;
  onHome: () => void;
}

const REVIEW_TAGS = [
  "Food quality",
  "Great packaging",
  "Super fast delivery",
  "Polite rider",
  "Fresh & hot",
  "Accurate order",
];

export function OrderJourney({ orderId, onBack, onHome }: OrderJourneyProps) {
  const { t: tr } = useI18n();
  const nav = useNav();
  const { profile, activeOrderDbId, orders, customerNote } = useStore();

  const targetId =
    orderId?.toString() ||
    activeOrderDbId ||
    orders[0]?.dbId ||
    orders[0]?.orderNumber ||
    orders[0]?.id?.toString();

  const [tracking, setTracking] = useState<LiveOrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Rating State
  const [storeRating, setStoreRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // 1. Subscribe to authoritative real-time updates from Supabase
  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch
    fetchOrderTrackingDetails(targetId).then((data) => {
      if (data) {
        setTracking(data);
        hasOrderBeenReviewed(data.orderId).then((reviewed) => {
          if (reviewed) setReviewSubmitted(true);
        });
      }
      setLoading(false);
    });

    // Realtime channel listener on orders
    const unsubscribe = subscribeToLiveOrder(targetId, (fresh) => {
      setTracking(fresh);
      if (fresh.lifecycleState === "delivered") {
        hasOrderBeenReviewed(fresh.orderId).then((reviewed) => {
          if (reviewed) setReviewSubmitted(true);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [targetId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const submitReview = async () => {
    if (!tracking) return;
    setSubmittingReview(true);
    try {
      await submitOrderReview({
        orderId: tracking.orderId,
        customerId: profile.id,
        storeRating,
        riderRating,
        tags: selectedTags,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      nav.toast(tr("review_submitted_msg"), "success");
    } catch {
      nav.toast("Failed to submit review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading && !tracking) {
    return (
      <div className="flow-page themed">
        <FlowHeader title="Order Status" onBack={onBack} noHelp />
        <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <div className="spinner-ring" style={{ margin: "0 auto 1.5rem" }} />
          <h2>Fetching live order details…</h2>
          <p style={{ color: "var(--c-sub)" }}>Connecting to live restaurant and rider updates.</p>
        </div>
      </div>
    );
  }

  // Fallback presentation if order ID wasn't found in DB yet
  const t: LiveOrderTracking = tracking || {
    orderId: "ORDER-LIVE",
    orderNumber: "RR-48213",
    serviceType: "food",
    status: tr("status_placed"),
    lifecycleState: "placed",
    statusCode: 0,
    restaurantName: "Royal Biryani House",
    restaurantAddress: "Hazratganj, Lucknow",
    deliveryAddress: profile.city ? `Hazratganj, ${profile.city}` : "Hazratganj, Lucknow",
    deliveryLat: 26.8532,
    deliveryLng: 80.9984,
    pickupLat: 26.8467,
    pickupLng: 80.9462,
    items: [{ name: "Lucknowi Chicken Biryani", quantity: 1, price: 289, isVeg: false }],
    totalAmount: 307,
    paymentMethod: "UPI",
    paymentStatus: "paid",
    placedAt: new Date().toISOString(),
    etaMinutes: 28,
    deliveryOtp: "4826",
    rider: null,
    customerNote: customerNote || undefined,
    isLiveTrackingAvailable: false,
  };

  const isDelivered = t.lifecycleState === "delivered";
  const isCancelled = t.lifecycleState === "cancelled";
  const isRiderAssigned = !!t.rider;

  // Timeline steps
  const steps = [
    { label: "Placed", done: t.statusCode >= 0 },
    { label: "Accepted", done: t.statusCode >= 1 },
    { label: "Preparing", done: t.statusCode >= 2 },
    { label: "Picked up", done: t.statusCode >= 4 },
    { label: "On the way", done: t.statusCode >= 5 },
    { label: "Delivered", done: t.statusCode >= 6 },
  ];

  // =========================================================================
  // STATE 1: DEDICATED ORDER PENDING SCREEN (Awaiting Restaurant Confirmation)
  // =========================================================================
  if (t.statusCode === 0 && !isCancelled && !isDelivered) {
    return (
      <div className="flow-page themed order-pending-screen" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <FlowHeader
          title={t.orderNumber}
          onBack={onHome}
          onHelp={() => nav.open("L1")}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem 1rem",
            background: "var(--c-card, #fff)",
            borderBottom: "1px solid var(--c-border, #E5E7EB)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--c-sub, #6B7280)", fontWeight: 500 }}>
            {(t.serviceType || "FOOD").toUpperCase()} ORDER
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              background: "#FFEDD5",
              color: "#9A3412",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#EA580C" }} />
            Pending Confirmation
          </span>
        </div>

        {/* Hero Section with animated pulsing rings */}
        <div style={{ textAlign: "center", padding: "2.5rem 1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              width: "110px",
              height: "110px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: "rgba(234, 88, 12, 0.15)",
                transform: "scale(1.2)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "75%",
                height: "75%",
                borderRadius: "50%",
                backgroundColor: "rgba(234, 88, 12, 0.25)",
              }}
            />
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#EA580C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                boxShadow: "0 6px 18px rgba(234, 88, 12, 0.35)",
                zIndex: 1,
              }}
            >
              <Icon name="clock" size={26} />
            </div>
          </div>

          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              marginBottom: "0.5rem",
            }}
          >
            {tr("order_pending_title")}
          </span>

          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", margin: "0 0 0.4rem" }}>
            {t.restaurantName}
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#6B7280", margin: 0, maxWidth: "320px", lineHeight: 1.4 }}>
            {tr("order_pending_subtitle")}
          </p>
        </div>

        {/* Order Details Body */}
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
          {/* Cooking Note Card (Phase 6) */}
          {(t.customerNote || customerNote) && (
            <div
              style={{
                backgroundColor: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: "14px",
                padding: "0.75rem 0.9rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "#EA580C", marginTop: "0.1rem" }}>
                <Icon name="list" size={16} />
              </span>
              <div>
                <strong style={{ fontSize: "0.82rem", color: "#9A3412" }}>Special Instructions for Kitchen:</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#C2410C", fontWeight: 500 }}>
                  "{t.customerNote || customerNote}"
                </p>
              </div>
            </div>
          )}

          {/* Order Summary Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "16px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 600 }}>ITEMS ORDERED</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827" }}>{inr(t.totalAmount)}</span>
            </div>

            {t.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                <span style={{ color: "#374151" }}>
                  {item.quantity} × {item.name}
                </span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{inr(item.price)}</span>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "0.5rem", marginTop: "0.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.4rem", fontSize: "0.8rem", color: "#6B7280" }}>
              <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>Delivery to: {t.deliveryAddress}</span>
              <span>Paid via {t.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions: Cancel Order & Back to Home */}
        <div style={{ padding: "1rem 1rem calc(1.5rem + var(--safe-bottom, 0px))", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
          <button
            onClick={() => setShowCancelDialog(true)}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FCA5A5",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {tr("cancel_order_btn")}
          </button>

          <Button secondary onClick={onHome}>
            {tr("back_to_home")}
          </Button>
        </div>

        {showCancelDialog && (
          <CancelOrderDialog
            orderId={t.orderId}
            orderNumber={t.orderNumber}
            onClose={() => setShowCancelDialog(false)}
            onCancelled={(reason) => {
              setTracking((prev) =>
                prev
                  ? {
                      ...prev,
                      lifecycleState: "cancelled",
                      statusCode: -1,
                      status: "Cancelled",
                      cancellationReason: reason,
                    }
                  : prev
              );
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 2-7: ACTIVE TRACKING JOURNEY / DELIVERED / CANCELLED VIEW
  // =========================================================================
  return (
    <div className="flow-page themed order-journey-screen">
      <FlowHeader
        title={t.orderNumber}
        onBack={onBack}
        onHelp={() => nav.open("L1")}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 1rem",
          background: "var(--c-card, #fff)",
          borderBottom: "1px solid var(--c-border, #E5E7EB)",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--c-sub, #6B7280)", fontWeight: 500 }}>
          {(t.serviceType || "FOOD").toUpperCase()} ORDER
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            background: isDelivered ? "#DCFCE7" : isCancelled ? "#FEE2E2" : "#FFEDD5",
            color: isDelivered ? "#166534" : isCancelled ? "#991B1B" : "#9A3412",
          }}
        >
          {isDelivered ? "Delivered" : isCancelled ? "Cancelled" : "Live"}
        </span>
      </div>

      {/* Map Header with Route & Markers */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: isDelivered ? 160 : 220,
          background: "#F3F4F6",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 400 220"
          style={{ width: "100%", height: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mapGrid" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#mapGrid)" />
          {/* Street grid lines */}
          <path d="M 0 60 Q 200 40 400 80 M 0 160 Q 200 180 400 140 M 120 0 L 140 220 M 280 0 L 260 220" stroke="#CBD5E1" strokeWidth="6" fill="none" />
          <path d="M 0 110 Q 180 120 400 100 M 200 0 L 200 220" stroke="#FFFFFF" strokeWidth="8" fill="none" />

          {/* Route path */}
          <path
            d="M 60 140 C 140 140, 160 80, 330 70"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeDasharray={t.statusCode >= 5 ? "none" : "8,5"}
            fill="none"
          />

          {/* Restaurant Marker */}
          <g transform="translate(60, 140)">
            <circle r="14" fill="#C2410C" />
            <circle r="8" fill="#FFFFFF" />
            <text x="0" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#7C2D12">Store</text>
          </g>

          {/* Customer Dropoff Marker */}
          <g transform="translate(330, 70)">
            <circle r="14" fill="#15803D" />
            <circle r="8" fill="#FFFFFF" />
            <text x="0" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#14532D">You</text>
          </g>

          {/* Rider Marker */}
          {t.statusCode >= 4 && (
            <g transform={t.statusCode >= 5 ? "translate(220, 95)" : "translate(80, 135)"}>
              <circle r="16" fill="#F97316" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
              <circle r="6" fill="#FFFFFF" />
              <text x="0" y="25" textAnchor="middle" fontSize="10" fontWeight="700" fill="#9A3412">Rider</text>
            </g>
          )}
        </svg>

        {/* Live GPS status pill */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(6px)",
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.75rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: t.isLiveTrackingAvailable ? "#22C55E" : "#F59E0B",
              boxShadow: t.isLiveTrackingAvailable ? "0 0 6px #22C55E" : "none",
            }}
          />
          <span style={{ fontWeight: 600, color: "#1F2937" }}>
            {t.isLiveTrackingAvailable
              ? "Live GPS tracking active"
              : isDelivered
              ? "Trip completed"
              : isCancelled
              ? "Order cancelled"
              : "Live order updates active"}
          </span>
        </div>

        {/* ETA badge */}
        {!isDelivered && !isCancelled && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "#111827",
              color: "#FFFFFF",
              padding: "0.4rem 0.8rem",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Icon name="clock" size={14} />
            <strong style={{ fontSize: "0.85rem" }}>{t.etaMinutes} mins</strong>
            <small style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>ETA</small>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Status Header Card */}
        <div
          style={{
            background: "var(--c-card, #fff)",
            border: "1px solid var(--c-border, #E5E7EB)",
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isDelivered ? "#16A34A" : isCancelled ? "#DC2626" : "#EA580C",
              }}
            />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--c-sub, #6B7280)", letterSpacing: "0.05em" }}>
              CURRENT STATUS
            </span>
          </div>

          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0.25rem 0", color: "var(--c-text, #111827)" }}>
            {t.status}
          </h1>

          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--c-sub, #6B7280)", lineHeight: 1.4 }}>
            {isDelivered
              ? `Delivered safely at ${t.deliveredAt ? new Date(t.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}. Enjoy your food!`
              : isCancelled
              ? `This order was cancelled: ${t.cancellationReason || "By customer request"}. Refund initiated.`
              : t.statusCode >= 5
              ? "Your rider is navigating the best route to your doorstep."
              : t.statusCode >= 2
              ? `Kitchen is preparing items. Expected collection in ~${t.prepMinutes || 20} minutes.`
              : "We're coordinating with the store to fulfill your order smoothly."}
          </p>

          {/* Verification Delivery PIN (Phase 8 State 5) */}
          {!isDelivered && !isCancelled && t.statusCode >= 3 && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.8rem", color: "#166534" }}>
                  {tr("delivery_pin")}
                </strong>
                <small style={{ color: "#15803D", fontSize: "0.75rem" }}>
                  {tr("share_pin_msg")}
                </small>
              </div>
              <span
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  letterSpacing: "0.15em",
                  color: "#166534",
                  fontFamily: "monospace",
                }}
              >
                {t.deliveryOtp}
              </span>
            </div>
          )}

          {/* Cancellation Notice if Cancelled */}
          {isCancelled && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: "12px",
                fontSize: "0.82rem",
                color: "#991B1B",
                lineHeight: 1.4,
              }}
            >
              <strong>Reason:</strong> {t.cancellationReason || "Customer cancelled"}
              <div style={{ marginTop: "0.25rem", color: "#6B7280", fontSize: "0.78rem" }}>
                {tr("cancel_refund_note")}
              </div>
            </div>
          )}
        </div>

        {/* Customer Cooking Note (Phase 6) */}
        {(t.customerNote || customerNote) && (
          <div
            style={{
              backgroundColor: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: "14px",
              padding: "0.75rem 0.9rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: "#EA580C", marginTop: "0.1rem" }}>
              <Icon name="list" size={16} />
            </span>
            <div>
              <strong style={{ fontSize: "0.82rem", color: "#9A3412" }}>Special Instructions:</strong>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#C2410C", fontWeight: 500 }}>
                "{t.customerNote || customerNote}"
              </p>
            </div>
          </div>
        )}

        {/* Step-by-Step Progress Pipeline */}
        {!isCancelled && (
          <div
            style={{
              background: "var(--c-card, #fff)",
              border: "1px solid var(--c-border, #E5E7EB)",
              borderRadius: 16,
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {steps.map((st, i) => (
                <div
                  key={st.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: st.done ? "#EA580C" : "#E5E7EB",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {st.done ? <Icon name="check" size={14} /> : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: st.done ? 600 : 400,
                      color: st.done ? "var(--c-text, #111827)" : "var(--c-sub, #9CA3AF)",
                      textAlign: "center",
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Rider Card (Module 4) */}
        {!isCancelled && isRiderAssigned && t.rider && (
          <div
            style={{
              background: "var(--c-card, #fff)",
              border: "1.5px solid #EA580C",
              borderRadius: 16,
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                className="partner-avatar"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#FED7AA",
                  color: "#9A3412",
                  fontWeight: 700,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.rider.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <strong style={{ fontSize: "0.95rem" }}>{t.rider.name}</strong>
                  <span
                    style={{
                      background: "#FEF3C7",
                      color: "#92400E",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: 4,
                    }}
                  >
                    ★ {t.rider.rating.toFixed(1)}
                  </span>
                </div>
                <small style={{ color: "var(--c-sub)", display: "block" }}>
                  {t.rider.vehicleType} ({t.rider.vehicleNumber}) · {t.rider.totalDeliveries} deliveries
                </small>
              </div>
            </div>

            <button
              data-interactive="true"
              onClick={() => setCalling(true)}
              aria-label={`Call ${t.rider.name}`}
              style={{
                background: "#EA580C",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="phone" size={18} />
            </button>
          </div>
        )}

        {/* Order Details Accordion */}
        <div
          style={{
            background: "var(--c-card, #fff)",
            border: "1px solid var(--c-border, #E5E7EB)",
            borderRadius: 16,
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "0.9rem" }}>{t.restaurantName}</strong>
            <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{inr(t.totalAmount)}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
            {t.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>
                  {it.quantity} × {it.name}
                </span>
                <span>{inr(it.price)}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px dashed var(--c-border, #E5E7EB)",
              paddingTop: "0.6rem",
              fontSize: "0.8rem",
              color: "var(--c-sub)",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div>Delivery address: {t.deliveryAddress}</div>
            <div>Payment: {t.paymentMethod} ({t.paymentStatus.toUpperCase()})</div>
          </div>
        </div>

        {/* Cancellation Option (before pickup) */}
        {!isCancelled && !isDelivered && t.statusCode < 4 && (
          <button
            onClick={() => setShowCancelDialog(true)}
            style={{
              padding: "0.65rem",
              backgroundColor: "transparent",
              color: "#DC2626",
              border: "1px dashed #FCA5A5",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {tr("cancel_order_btn")}
          </button>
        )}

        {/* Rating & Review Section (Delivered State) */}
        {isDelivered && (
          <div
            style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 16,
              padding: "1.25rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>{tr("rate_experience")}</h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "var(--c-sub)" }}>
              Rate the restaurant and delivery partner
            </p>

            {reviewSubmitted ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#DCFCE7",
                  color: "#166534",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                ✓ {tr("review_submitted_msg")}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <small style={{ fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                    {tr("rate_restaurant")} ({t.restaurantName})
                  </small>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStoreRating(s)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: s <= storeRating ? "#F59E0B" : "#D1D5DB",
                          padding: "0.2rem",
                        }}
                      >
                        <Icon name="star" size={24} />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "0.75rem" }}>
                  <small style={{ fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                    {tr("rate_rider")} ({t.rider?.name || "Delivery Partner"})
                  </small>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRiderRating(s)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: s <= riderRating ? "#F59E0B" : "#D1D5DB",
                          padding: "0.2rem",
                        }}
                      >
                        <Icon name="star" size={24} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.75rem 0" }}>
                  {REVIEW_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: "0.3rem 0.65rem",
                          borderRadius: "999px",
                          border: active ? "1.5px solid #EA580C" : "1px solid #D1D5DB",
                          background: active ? "#FFF7ED" : "#FFFFFF",
                          color: active ? "#EA580C" : "#4B5563",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={tr("review_comment_placeholder")}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #D1D5DB",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    marginBottom: "0.75rem",
                    fontFamily: "inherit",
                    resize: "none",
                  }}
                />

                <Button onClick={submitReview} loading={submittingReview}>
                  {tr("submit_review")}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Back to Home CTA */}
        <div style={{ marginTop: "0.5rem", paddingBottom: "calc(1.5rem + var(--safe-bottom, 0px))" }}>
          <Button onClick={onHome} secondary={!isDelivered}>
            {isDelivered ? tr("back_to_home") : "Browse More Services"}
          </Button>
        </div>
      </div>

      {/* Simulated In-App Call Sheet */}
      {calling && t.rider && (
        <div className="sheet-backdrop center" onClick={() => setCalling(false)}>
          <div
            className="dialog"
            style={{ textAlign: "center", padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="partner-avatar"
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#FED7AA",
                color: "#9A3412",
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: "0 auto 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {t.rider.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 style={{ margin: "0 0 0.25rem" }}>Call {t.rider.name}</h3>
            <p style={{ margin: "0 0 1.25rem", color: "var(--c-sub)", fontSize: "0.85rem" }}>
              Verified delivery partner phone: {t.rider.phone}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                data-interactive="true"
                className="ghost-button"
                onClick={() => setCalling(false)}
              >
                Cancel
              </button>
              <a
                href={`tel:${t.rider.phone}`}
                data-interactive="true"
                className="button-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  textDecoration: "none",
                  padding: "0.6rem 1.2rem",
                  background: "#16A34A",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                <Icon name="phone" size={16} />
                Call Partner
              </a>
            </div>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <CancelOrderDialog
          orderId={t.orderId}
          orderNumber={t.orderNumber}
          onClose={() => setShowCancelDialog(false)}
          onCancelled={(reason) => {
            setTracking((prev) =>
              prev
                ? {
                    ...prev,
                    lifecycleState: "cancelled",
                    statusCode: -1,
                    status: "Cancelled",
                    cancellationReason: reason,
                  }
                : prev
            );
          }}
        />
      )}
    </div>
  );
}
