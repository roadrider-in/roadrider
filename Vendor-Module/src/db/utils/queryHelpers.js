/**
 * Database Query Helper Utilities
 * Provides standardized error formatting, response normalization, and query builders.
 */

/**
 * Normalizes Supabase PostgREST errors into a consistent application error object.
 * @param {any} error
 * @param {string} [context]
 * @returns {{ message: string; code?: string; details?: string; hint?: string }}
 */
export function formatDatabaseError(error, context = '') {
  if (!error) return null;

  const prefix = context ? `[Database Error: ${context}] ` : '[Database Error] ';
  const message = error.message || 'An unexpected database error occurred.';
  const code = error.code || 'UNKNOWN_ERROR';
  const details = error.details || '';
  const hint = error.hint || '';

  console.error(`${prefix}${message}`, { code, details, hint });

  return {
    message: `${prefix}${message}`,
    code,
    details,
    hint,
  };
}

/**
 * Standardizes a database operation response.
 * @template T
 * @param {{ data: T | null; error: any; count?: number | null }} supabaseResponse
 * @param {string} [context]
 * @returns {{ data: T | null; error: ReturnType<typeof formatDatabaseError>; count: number | null }}
 */
export function wrapDbResponse({ data = null, error = null, count = null }, context = '') {
  return {
    data,
    error: error ? formatDatabaseError(error, context) : null,
    count: count !== undefined ? count : null,
  };
}

/**
 * Safely applies pagination range to a Supabase query builder.
 * @param {any} queryBuilder
 * @param {{ page?: number; pageSize?: number; from?: number; to?: number }} [options]
 * @returns {any}
 */
export function applyPagination(queryBuilder, options = {}) {
  const { page, pageSize = 20, from, to } = options;

  if (typeof from === 'number' && typeof to === 'number') {
    return queryBuilder.range(from, to);
  }

  if (typeof page === 'number' && page >= 1) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    return queryBuilder.range(start, end);
  }

  return queryBuilder;
}

/**
 * Safely applies sorting to a Supabase query builder.
 * @param {any} queryBuilder
 * @param {{ column: string; ascending?: boolean }} [sort]
 * @returns {any}
 */
export function applySorting(queryBuilder, sort) {
  if (!sort || !sort.column) return queryBuilder;
  return queryBuilder.order(sort.column, { ascending: sort.ascending !== false });
}
