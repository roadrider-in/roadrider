/**
 * Support, Notifications & Risk Database Queries
 * Scope: support_tickets, notifications, risk_cases, customer_addresses, customers
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse, applyPagination } from '../utils/queryHelpers.js';

export const supportQueries = {
  /**
   * Placeholder query for listing notifications for a user.
   * Business logic and exact field mapping will be injected in the next step.
   * @param {string} userId
   * @param {object} [pagination]
   */
  async getNotificationsByUser(userId, pagination) {
    if (!userId) return wrapDbResponse({ data: [], error: new Error('User ID required') }, 'support.getNotificationsByUser');
    let query = fromTable(TABLES.NOTIFICATIONS).select('*').eq('user_id', userId);
    query = applyPagination(query, pagination);
    const response = await query;
    return wrapDbResponse(response, 'support.getNotificationsByUser');
  },
};
