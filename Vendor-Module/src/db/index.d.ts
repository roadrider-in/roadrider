import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TableName } from '../types/database.types';

export { supabase, isSupabaseConfigured, getSupabaseClient, checkSupabaseConnection } from '../lib/supabase';
export { dbClient, isDatabaseReady, fromTable } from './client';
export { TABLES, ALL_TABLE_NAMES, isKnownTable } from './tables';
export { queries } from './queries/index';
export { formatDatabaseError, wrapDbResponse, applyPagination, applySorting } from './utils/queryHelpers';

export type { Database, TableName };
