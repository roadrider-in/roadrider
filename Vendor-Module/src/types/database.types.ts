/**
 * RoadRider Database Types
 * Central TypeScript types for Supabase database integration.
 *
 * NOTE: As per project guidelines, this schema does NOT contain speculative column definitions.
 * When table-to-data mapping is supplied or generated via the Supabase CLI (`supabase gen types typescript`),
 * table interfaces can be specialized here.
 */

import type { TableName } from '../db/tables';

export type { TableName };

/**
 * Generic shape of a database table definition compatible with Supabase Client.
 */
export interface TableDefinition<
  Row extends Record<string, unknown> = Record<string, unknown>,
  Insert extends Record<string, unknown> = Partial<Row>,
  Update extends Record<string, unknown> = Partial<Row>
> {
  Row: Row;
  Insert: Insert;
  Update: Update;
}

/**
 * Base database schema mapping the 47 known Supabase tables.
 */
export interface Database {
  public: {
    Tables: {
      admin_users: TableDefinition;
      audit_logs: TableDefinition;
      availability_slots: TableDefinition;
      bank_accounts: TableDefinition;
      cities: TableDefinition;
      commission_rules: TableDefinition;
      coupon_usages: TableDefinition;
      courier_jobs: TableDefinition;
      cuisines: TableDefinition;
      customer_addresses: TableDefinition;
      customers: TableDefinition;
      delivery_settings: TableDefinition;
      kyc_documents: TableDefinition;
      notifications: TableDefinition;
      offers: TableDefinition;
      order_items: TableDefinition;
      orders: TableDefinition;
      package_types: TableDefinition;
      partner_addresses: TableDefinition;
      partner_bank_accounts: TableDefinition;
      partner_services: TableDefinition;
      partners: TableDefinition;
      payouts: TableDefinition;
      pricing_rules: TableDefinition;
      product_categories: TableDefinition;
      products: TableDefinition;
      profiles: TableDefinition;
      promotions: TableDefinition;
      reviews: TableDefinition;
      ride_vehicle_types: TableDefinition;
      rides: TableDefinition;
      risk_cases: TableDefinition;
      slot_bookings: TableDefinition;
      sponsored_placements: TableDefinition;
      store_addresses: TableDefinition;
      store_cuisines: TableDefinition;
      store_operating_hours: TableDefinition;
      store_photos: TableDefinition;
      stores: TableDefinition;
      support_tickets: TableDefinition;
      surge_rules: TableDefinition;
      tax_information: TableDefinition;
      transactions: TableDefinition;
      vehicles: TableDefinition;
      vendors: TableDefinition;
      wallet_transactions: TableDefinition;
      zones: TableDefinition;
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
  };
}

/**
 * Generic type for a row in a specified table.
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Generic type for an insert payload in a specified table.
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Generic type for an update payload in a specified table.
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Standard response shape for database operations.
 */
export interface DbResult<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
  count?: number | null;
}

/**
 * Pagination parameters for list queries.
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  from?: number;
  to?: number;
}

/**
 * Sorting parameters for list queries.
 */
export interface SortOptions {
  column: string;
  ascending?: boolean;
}
