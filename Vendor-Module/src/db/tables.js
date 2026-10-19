/**
 * RoadRider Supabase Database Tables Registry
 * Central registry of all 47 database tables in the Supabase schema.
 * Use these constants across queries and mutations to prevent typos.
 */
export const TABLES = Object.freeze({
  ADMIN_USERS: 'admin_users',
  AUDIT_LOGS: 'audit_logs',
  AVAILABILITY_SLOTS: 'availability_slots',
  BANK_ACCOUNTS: 'bank_accounts',
  CITIES: 'cities',
  COMMISSION_RULES: 'commission_rules',
  COUPON_USAGES: 'coupon_usages',
  COURIER_JOBS: 'courier_jobs',
  CUISINES: 'cuisines',
  CUSTOMER_ADDRESSES: 'customer_addresses',
  CUSTOMERS: 'customers',
  DELIVERY_SETTINGS: 'delivery_settings',
  KYC_DOCUMENTS: 'kyc_documents',
  NOTIFICATIONS: 'notifications',
  OFFERS: 'offers',
  ORDER_ITEMS: 'order_items',
  ORDERS: 'orders',
  PACKAGE_TYPES: 'package_types',
  PARTNER_ADDRESSES: 'partner_addresses',
  PARTNER_BANK_ACCOUNTS: 'partner_bank_accounts',
  PARTNER_SERVICES: 'partner_services',
  PARTNERS: 'partners',
  PAYOUTS: 'payouts',
  PRICING_RULES: 'pricing_rules',
  PRODUCT_CATEGORIES: 'product_categories',
  PRODUCTS: 'products',
  PROFILES: 'profiles',
  PROMOTIONS: 'promotions',
  REVIEWS: 'reviews',
  RIDE_VEHICLE_TYPES: 'ride_vehicle_types',
  RIDES: 'rides',
  RISK_CASES: 'risk_cases',
  SLOT_BOOKINGS: 'slot_bookings',
  SPONSORED_PLACEMENTS: 'sponsored_placements',
  STORE_ADDRESSES: 'store_addresses',
  STORE_CUISINES: 'store_cuisines',
  STORE_OPERATING_HOURS: 'store_operating_hours',
  STORE_PHOTOS: 'store_photos',
  STORES: 'stores',
  SUPPORT_TICKETS: 'support_tickets',
  SURGE_RULES: 'surge_rules',
  TAX_INFORMATION: 'tax_information',
  TRANSACTIONS: 'transactions',
  VEHICLES: 'vehicles',
  VENDORS: 'vendors',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  ZONES: 'zones',
});

/**
 * Array of all 47 table names for iteration, validation, and diagnostics.
 */
export const ALL_TABLE_NAMES = Object.freeze(Object.values(TABLES));

/**
 * Validates if a given string matches any of the 47 database tables.
 * @param {string} tableName
 * @returns {boolean}
 */
export const isKnownTable = (tableName) => ALL_TABLE_NAMES.includes(tableName);
