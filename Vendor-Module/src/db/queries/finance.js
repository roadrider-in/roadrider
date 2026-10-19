/**
 * Finance, Payouts & Transactions Database Queries
 * Scope: payouts, transactions, wallet_transactions, partner_bank_accounts
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse, applyPagination } from '../utils/queryHelpers.js';

export const financeQueries = {
  /**
   * Placeholder query for listing payouts for a vendor.
   * Business logic and exact field mapping will be injected in the next step.
   * @param {string} vendorId
   * @param {object} [pagination]
   */
  async getPayoutsByVendor(vendorId, pagination) {
    if (!vendorId) return wrapDbResponse({ data: [], error: new Error('Vendor ID required') }, 'finance.getPayoutsByVendor');
    let query = fromTable(TABLES.PAYOUTS).select('*').eq('vendor_id', vendorId);
    query = applyPagination(query, pagination);
    const response = await query;
    return wrapDbResponse(response, 'finance.getPayoutsByVendor');
  },
};
