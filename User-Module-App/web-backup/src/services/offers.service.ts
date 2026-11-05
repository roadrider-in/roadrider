import { supabase, isSupabaseConfigured } from "./supabase";

export interface OfferItem {
  id: string;
  code: string;
  title: string;
  sub: string;
  service: "Food" | "Rides" | "Grocery" | "Courier" | "Rewards";
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
}

export const FALLBACK_OFFERS: OfferItem[] = [
  { id: "1", code: "WELCOME50", title: "Flat 50% off", sub: "First order, up to ₹100", service: "Food", discountType: "percentage", discountValue: 50, minOrderAmount: 199, maxDiscountAmount: 100 },
  { id: "2", code: "FREEDEL", title: "Free delivery", sub: "On food orders above ₹299", service: "Food", discountType: "flat", discountValue: 35, minOrderAmount: 299 },
  { id: "3", code: "RIDE20", title: "20% off rides", sub: "Up to ₹60 on your next Auto or Cab", service: "Rides", discountType: "percentage", discountValue: 20, minOrderAmount: 80, maxDiscountAmount: 60 },
  { id: "4", code: "FRESH30", title: "30% off fresh produce", sub: "Fruits and vegetables, up to ₹120", service: "Grocery", discountType: "percentage", discountValue: 30, minOrderAmount: 250, maxDiscountAmount: 120 },
  { id: "5", code: "SEND15", title: "₹15 off parcels", sub: "On any courier booking", service: "Courier", discountType: "flat", discountValue: 15, minOrderAmount: 70 },
];

/**
 * Fetches active offers from Supabase `offers` and `promotions`
 */
export async function fetchActiveOffers(): Promise<OfferItem[]> {
  if (!isSupabaseConfigured || !supabase) return FALLBACK_OFFERS;

  try {
    const { data: offersData } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true);

    const { data: promoData } = await supabase
      .from("promotions")
      .select("*")
      .eq("status", "Active");

    const mappedOffers: OfferItem[] = [];

    if (offersData && offersData.length > 0) {
      offersData.forEach((o) => {
        mappedOffers.push({
          id: o.id,
          code: o.code,
          title: o.description || `${o.discount_value}% off`,
          sub: `Min order ₹${o.min_order_amount || 0}`,
          service: "Food",
          discountType: o.discount_type || "percentage",
          discountValue: Number(o.discount_value) || 20,
          minOrderAmount: Number(o.min_order_amount) || 0,
          maxDiscountAmount: o.max_discount_amount ? Number(o.max_discount_amount) : undefined,
        });
      });
    }

    if (promoData && promoData.length > 0) {
      promoData.forEach((p) => {
        mappedOffers.push({
          id: p.id,
          code: p.code,
          title: p.title || p.description,
          sub: p.description || "",
          service: "Food",
          discountType: p.discount_type || "percentage",
          discountValue: Number(p.discount_value) || 20,
          minOrderAmount: 0,
          maxDiscountAmount: p.max_discount ? Number(p.max_discount) : undefined,
        });
      });
    }

    return mappedOffers.length > 0 ? mappedOffers : FALLBACK_OFFERS;
  } catch {
    return FALLBACK_OFFERS;
  }
}

/**
 * Validates a coupon code and calculates discount
 */
export function validateCouponCode(
  code: string,
  total: number,
  service: string,
  offers: OfferItem[]
): { ok: true; discount: number; note: string } | { ok: false; error: string } {
  const clean = code.trim().toUpperCase();
  const offer = offers.find((o) => o.code.toUpperCase() === clean);

  if (!offer) {
    return { ok: false, error: "Invalid coupon code." };
  }

  if (offer.service.toLowerCase() !== service.toLowerCase() && offer.service !== "Rewards") {
    return { ok: false, error: `${clean} is only valid on ${offer.service} orders.` };
  }

  if (total < offer.minOrderAmount) {
    return { ok: false, error: `Minimum order amount of ₹${offer.minOrderAmount} required for this coupon.` };
  }

  let discount = 0;
  if (offer.discountType === "flat") {
    discount = offer.discountValue;
  } else {
    discount = Math.round((total * offer.discountValue) / 100);
    if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
      discount = offer.maxDiscountAmount;
    }
  }

  return {
    ok: true,
    discount,
    note: `${offer.title} applied (-₹${discount})`,
  };
}
