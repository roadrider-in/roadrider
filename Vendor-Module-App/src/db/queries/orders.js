/**
 * Orders & Fulfillment Database Queries
 * Scope: orders, order_items, courier_jobs
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from "../client.js"
import { TABLES } from "../tables.js"
import {
  wrapDbResponse,
  applyPagination,
  applySorting,
} from "../utils/queryHelpers.js"

export const orderQueries = {
  /**
   * Placeholder query for listing orders for a store.
   * Business logic and exact field mapping will be injected in the next step.
   * @param {string} storeId
   * @param {object} [options]
   */
  async getOrdersByStore(storeId, options = {}) {
    if (!storeId)
      return wrapDbResponse(
        { data: [], error: new Error("Store ID required") },
        "orders.getOrdersByStore",
      )
    let query = fromTable(TABLES.ORDERS).select("*").eq("store_id", storeId)
    query = applySorting(
      query,
      options.sort || { column: "created_at", ascending: false },
    )
    query = applyPagination(query, options.pagination)
    const response = await query
    return wrapDbResponse(response, "orders.getOrdersByStore")
  },

  /**
   * Placeholder query for getting order details with items.
   * @param {string} orderId
   */
  async getOrderById(orderId) {
    if (!orderId)
      return wrapDbResponse(
        { data: null, error: new Error("Order ID required") },
        "orders.getOrderById",
      )
    const response = await fromTable(TABLES.ORDERS)
      .select("*")
      .eq("id", orderId)
      .maybeSingle()
    return wrapDbResponse(response, "orders.getOrderById")
  },
}
