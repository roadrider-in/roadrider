import type { Service } from "../data/demo";

/**
 * Business rules for RoadRider pricing & promotional discounts.
 */
export const PRICING = {
  /** Design shows delivery as FREE on standard orders. */
  deliveryFee: 0,
  /** Design shows a flat ₹18 "Taxes & fees" line for delivery orders. */
  deliveryTaxesAndFees: 18,
  /** Ride and courier fares are shown as all-inclusive in the design. */
  faresIncludeTaxes: true,
} as const;

export type DiscountType = "percentage" | "flat" | "free_delivery";

export interface PromoRule {
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  label?: string; // backwards compatibility
  percentOff?: number; // backwards compatibility
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  services: Service[];
  oneTime: boolean;
  expiresAt?: string;
}

/** Promotions for RoadRider Food, Grocery, Rides and Courier */
export const PROMOS: PromoRule[] = [
  {
    code: "WELCOME50",
    title: "50% OFF on your first order",
    description: "Welcome offer: Get 50% discount up to ₹100 on your first order.",
    discountType: "percentage",
    discountValue: 50,
    percentOff: 50,
    label: "Flat 50% off",
    minOrderAmount: 149,
    maxDiscountAmount: 100,
    services: ["food", "grocery"],
    oneTime: true,
  },
  {
    code: "SAVE100",
    title: "₹100 OFF above ₹499",
    description: "Save big on family meals and bulk orders above ₹499.",
    discountType: "flat",
    discountValue: 100,
    percentOff: 20,
    label: "Flat ₹100 off",
    minOrderAmount: 499,
    services: ["food", "grocery"],
    oneTime: false,
  },
  {
    code: "FREEDELIVERY",
    title: "Free Delivery on Eligible Orders",
    description: "Enjoy zero delivery fee on all orders above ₹199.",
    discountType: "free_delivery",
    discountValue: 0,
    label: "Free Delivery",
    minOrderAmount: 199,
    services: ["food", "grocery", "courier"],
    oneTime: false,
  },
  {
    code: "WEEKEND50",
    title: "Flat ₹50 OFF Weekend Food Fest",
    description: "Special weekend dining discount on orders above ₹249.",
    discountType: "flat",
    discountValue: 50,
    label: "Flat ₹50 off",
    minOrderAmount: 249,
    services: ["food"],
    oneTime: false,
  },
  {
    code: "ALPHA50",
    title: "Flat ₹50 OFF at Kitchen Alpha",
    description: "Exclusive restaurant offer on orders above ₹249.",
    discountType: "flat",
    discountValue: 50,
    label: "Flat ₹50 off",
    minOrderAmount: 249,
    services: ["food"],
    oneTime: false,
  },
  {
    code: "SIGMA200",
    title: "Flat ₹200 OFF at Sigma Store",
    description: "Special restaurant offer on orders above ₹499.",
    discountType: "flat",
    discountValue: 200,
    label: "Flat ₹200 off",
    minOrderAmount: 499,
    services: ["food"],
    oneTime: false,
  },
  {
    code: "LOVE20",
    title: "20% OFF up to ₹100",
    description: "20% savings on delicious restaurant dishes above ₹199.",
    discountType: "percentage",
    discountValue: 20,
    percentOff: 20,
    label: "20% off",
    minOrderAmount: 199,
    maxDiscountAmount: 100,
    services: ["food", "grocery"],
    oneTime: false,
  },
];

export type Bill = {
  itemTotal: number;
  deliveryFee: number;
  taxes: number | null; // null = included in fare
  discount: number;
  promo: string | null;
  toPay: number;
};

export function isDeliveryService(service: Service) {
  return service === "food" || service === "grocery";
}

export function computeBill(service: Service, itemTotal: number, promo: string | null): Bill {
  const rule = promo
    ? PROMOS.find((p) => p.code === promo && p.services.includes(service))
    : undefined;

  let discount = 0;
  let deliveryFee = isDeliveryService(service) ? PRICING.deliveryFee : 0;

  if (rule && itemTotal >= (rule.minOrderAmount || 0)) {
    if (rule.discountType === "percentage") {
      const val = rule.discountValue || rule.percentOff || 0;
      const raw = Math.round((itemTotal * val) / 100);
      discount = rule.maxDiscountAmount ? Math.min(raw, rule.maxDiscountAmount) : raw;
    } else if (rule.discountType === "flat") {
      discount = Math.min(itemTotal, Math.round(rule.discountValue));
    } else if (rule.discountType === "free_delivery") {
      deliveryFee = 0;
      discount = PRICING.deliveryFee;
    }
  }

  const delivery = isDeliveryService(service);
  const taxes = delivery ? (itemTotal > 0 ? PRICING.deliveryTaxesAndFees : 0) : null;
  return {
    itemTotal,
    deliveryFee,
    taxes,
    discount,
    promo: rule ? rule.code : null,
    toPay: Math.max(0, itemTotal - discount + deliveryFee + (taxes ?? 0)),
  };
}

export type PromoCheck = { ok: true; code: string } | { ok: false; error: string };

export function validatePromo(
  raw: string,
  service: Service,
  usedPromos: string[],
  itemTotal: number
): PromoCheck {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Please enter a coupon code." };
  const rule = PROMOS.find((p) => p.code === code);
  if (!rule) return { ok: false, error: "This coupon code is not valid." };
  if (!rule.services.includes(service)) {
    return { ok: false, error: `${code} cannot be applied on ${service} orders.` };
  }
  if (rule.oneTime && usedPromos.includes(code)) {
    return { ok: false, error: `${code} has already been used on your account.` };
  }
  if (itemTotal <= 0) {
    return { ok: false, error: "Please add items to your cart before applying a coupon." };
  }
  if (rule.minOrderAmount && itemTotal < rule.minOrderAmount) {
    const diff = rule.minOrderAmount - itemTotal;
    return {
      ok: false,
      error: `Add ₹${diff} more to apply ${code}. (Min. order: ₹${rule.minOrderAmount})`,
    };
  }
  return { ok: true, code };
}

export const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
