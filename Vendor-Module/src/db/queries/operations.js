/**
 * Operations & Logistics Database Queries
 * Scope: cities, zones, rides, vehicles, ride_vehicle_types,
 *        availability_slots, slot_bookings, partners, partner_services, partner_addresses, package_types
 *
 * Prepared for future data-to-table mapping.
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse } from '../utils/queryHelpers.js';

export const operationQueries = {
  /**
   * Fetches active cities supported by the platform.
   */
  async getActiveCities() {
    const response = await fromTable(TABLES.CITIES).select('*');
    return wrapDbResponse(response, 'operations.getActiveCities');
  },

  /**
   * Fetches service zones for a given city.
   * @param {string} cityId
   */
  async getZonesByCity(cityId) {
    if (!cityId) return wrapDbResponse({ data: [], error: new Error('City ID required') }, 'operations.getZonesByCity');
    const response = await fromTable(TABLES.ZONES).select('*').eq('city_id', cityId);
    return wrapDbResponse(response, 'operations.getZonesByCity');
  },
};
