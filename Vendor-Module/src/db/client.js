import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabase.js';
import { TABLES, isKnownTable } from './tables.js';
import { wrapDbResponse, formatDatabaseError } from './utils/queryHelpers.js';

/**
 * Re-export of the core Supabase client for database operations.
 */
export const dbClient = supabase;

/**
 * Checks whether the database client is properly initialized and configured.
 * @returns {boolean}
 */
export const isDatabaseReady = () => isSupabaseConfigured;

/**
 * Safe table accessor that validates the table name against the 47 registered tables.
 * @param {string} tableName - Must be a valid table name from TABLES
 * @returns {any} Supabase query builder for the table
 */
export function fromTable(tableName) {
  if (!isKnownTable(tableName)) {
    console.warn(`[Supabase Database] Warning: Table "${tableName}" is not in the registered 47 tables list.`);
  }
  return dbClient.from(tableName);
}

/**
 * Re-export connection health check utility.
 */
export { checkSupabaseConnection };
