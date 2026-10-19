import type { Service } from "../data/demo";

/**
 * Business rules for the demo build. These mirror the values shown in the approved design and are
 * centralised here so a real pricing service can replace them in one place.
 */
export const PRICING = {
  /** Design shows delivery as FREE on every order. */
  deliveryFee: 0,
  /** Design shows a flat ₹18 "Taxes & fees" line for delivery orders. */
  deliveryTaxesAndFees: 18,
  /** Ride and courier fares are shown as all-inclusive in the design. */
  faresIncludeTaxes: true,
} as const;

export type PromoRule = { code: string; label: string; percentOff: number; services: Service[]; oneTime: boolean };

/** Promotions that appear in the design ("FIRST ORDER · Flat 50% off · Use WELCOME50"). */
export const PROMOS: PromoRule[] = [
  { code: "WELCOME50", label: "Flat 50% off", percentOff: 50, services: ["food", "grocery"], oneTime: true },
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
  const rule = promo ? PROMOS.find((p) => p.code === promo && p.services.includes(service)) : undefined;
  const discount = rule ? Math.round((itemTotal * rule.percentOff) / 100) : 0;
  const delivery = isDeliveryService(service);
  const taxes = delivery ? (itemTotal > 0 ? PRICING.deliveryTaxesAndFees : 0) : null;
  const deliveryFee = delivery ? PRICING.deliveryFee : 0;
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

export function validatePromo(raw: string, service: Service, usedPromos: string[], itemTotal: number): PromoCheck {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code." };
  const rule = PROMOS.find((p) => p.code === code);
  if (!rule) return { ok: false, error: "This code isn't valid." };
  if (!rule.services.includes(service)) return { ok: false, error: `${code} can't be used on this order.` };
  if (rule.oneTime && usedPromos.includes(code)) return { ok: false, error: `${code} has already been used.` };
  if (itemTotal <= 0) return { ok: false, error: "Add items before applying a code." };
  return { ok: true, code };
}

export const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
