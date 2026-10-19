/**
 * RoadRider Database Layer
 * Central entry point for database operations, client, and table registry.
 */

// Client and connection management
export {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient,
  checkSupabaseConnection,
} from '../lib/supabase.js';

export {
  dbClient,
  isDatabaseReady,
  fromTable,
} from './client.js';

// Table registry
export {
  TABLES,
  ALL_TABLE_NAMES,
  isKnownTable,
} from './tables.js';

// Query modules
export {
  queries,
  authQueries,
  vendorQueries,
  catalogQueries,
  orderQueries,
  financeQueries,
  operationQueries,
  marketingQueries,
  supportQueries,
} from './queries/index.js';

// Query utilities
export {
  formatDatabaseError,
  wrapDbResponse,
  applyPagination,
  applySorting,
} from './utils/queryHelpers.js';
