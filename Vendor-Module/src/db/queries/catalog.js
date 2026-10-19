/**
 * Catalog Database Queries
 * Scope: products, product_categories, cuisines, store_cuisines
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse, applyPagination } from '../utils/queryHelpers.js';

export const catalogQueries = {
  /**
   * Placeholder query for listing categories.
   * Business logic and exact field mapping will be injected in the next step.
   */
  async getCategories() {
    const response = await fromTable(TABLES.PRODUCT_CATEGORIES).select('*');
    return wrapDbResponse(response, 'catalog.getCategories');
  },

  /**
   * Placeholder query for listing products for a store.
   * @param {string} storeId
   * @param {object} [pagination]
   */
  async getProductsByStore(storeId, pagination) {
    if (!storeId) return wrapDbResponse({ data: [], error: new Error('Store ID required') }, 'catalog.getProductsByStore');
    let query = fromTable(TABLES.PRODUCTS).select('*').eq('store_id', storeId);
    query = applyPagination(query, pagination);
    const response = await query;
    return wrapDbResponse(response, 'catalog.getProductsByStore');
  },
};
