/**
 * Auth & Profile Database Queries
 * Scope: profiles, admin_users, audit_logs
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse } from '../utils/queryHelpers.js';

export const authQueries = {
  /**
   * Placeholder query for fetching user profile by auth ID.
   * Business logic and exact field mapping will be injected in the next step.
   * @param {string} userId
   */
  async getProfileById(userId) {
    if (!userId) return wrapDbResponse({ data: null, error: new Error('User ID required') }, 'auth.getProfileById');
    const response = await fromTable(TABLES.PROFILES).select('*').eq('id', userId).maybeSingle();
    return wrapDbResponse(response, 'auth.getProfileById');
  },
};
