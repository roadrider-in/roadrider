/**
 * Marketing, Promotions & Rules Database Queries
 * Scope: offers, promotions, coupon_usages, sponsored_placements, reviews,
 *        commission_rules, pricing_rules, surge_rules
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from "../client.js"
import { TABLES } from "../tables.js"
import { wrapDbResponse } from "../utils/queryHelpers.js"

export const marketingQueries = {
  /**
   * Placeholder query for listing active promotions for a store.
   * Business logic and exact field mapping will be injected in the next step.
   * @param {string} storeId
   */
  async getPromotionsByStore(storeId) {
    if (!storeId)
      return wrapDbResponse(
        { data: [], error: new Error("Store ID required") },
        "marketing.getPromotionsByStore",
      )
    const response = await fromTable(TABLES.PROMOTIONS)
      .select("*")
      .eq("store_id", storeId)
    return wrapDbResponse(response, "marketing.getPromotionsByStore")
  },
}
