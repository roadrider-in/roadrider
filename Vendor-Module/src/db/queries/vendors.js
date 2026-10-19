/**
 * Vendor & Store Database Queries
 * Scope: vendors, stores, store_addresses, store_operating_hours,
 *        delivery_settings, kyc_documents, tax_information, bank_accounts, store_photos
 */
import { fromTable } from '../client.js';
import { TABLES } from '../tables.js';
import { wrapDbResponse } from '../utils/queryHelpers.js';

export const vendorQueries = {
  /**
   * Fetches vendor profile by the authenticated user's ID.
   * @param {string} userId
   */
  async getVendorByUserId(userId) {
    if (!userId) return wrapDbResponse({ data: null, error: new Error('User ID required') }, 'vendors.getVendorByUserId');
    const response = await fromTable(TABLES.VENDORS).select('*').eq('user_id', userId).maybeSingle();
    return wrapDbResponse(response, 'vendors.getVendorByUserId');
  },

  /**
   * Fetches all stores belonging to a specific vendor.
   * @param {string} vendorId
   */
  async getStoresByVendorId(vendorId) {
    if (!vendorId) return wrapDbResponse({ data: [], error: new Error('Vendor ID required') }, 'vendors.getStoresByVendorId');
    const response = await fromTable(TABLES.STORES).select('*').eq('vendor_id', vendorId).order('created_at', { ascending: true });
    return wrapDbResponse(response, 'vendors.getStoresByVendorId');
  },

  /**
   * Fetches the primary store matching business type.
   * @param {string} vendorId
   * @param {'restaurant' | 'grocery'} [businessType]
   */
  async getPrimaryStore(vendorId, businessType) {
    if (!vendorId) return wrapDbResponse({ data: null, error: new Error('Vendor ID required') }, 'vendors.getPrimaryStore');
    let query = fromTable(TABLES.STORES).select('*').eq('vendor_id', vendorId);
    if (businessType) {
      query = query.eq('business_type', businessType);
    }
    const response = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
    return wrapDbResponse(response, 'vendors.getPrimaryStore');
  },

  /**
   * Fetches store address by store ID.
   * @param {string} storeId
   */
  async getStoreAddress(storeId) {
    if (!storeId) return wrapDbResponse({ data: null, error: new Error('Store ID required') }, 'vendors.getStoreAddress');
    const response = await fromTable(TABLES.STORE_ADDRESSES).select('*').eq('store_id', storeId).maybeSingle();
    return wrapDbResponse(response, 'vendors.getStoreAddress');
  },

  /**
   * Fetches weekly operating hours for a store.
   * @param {string} storeId
   */
  async getOperatingHours(storeId) {
    if (!storeId) return wrapDbResponse({ data: [], error: new Error('Store ID required') }, 'vendors.getOperatingHours');
    const response = await fromTable(TABLES.STORE_OPERATING_HOURS).select('*').eq('store_id', storeId);
    return wrapDbResponse(response, 'vendors.getOperatingHours');
  },

  /**
   * Fetches delivery and fulfillment settings for a store.
   * @param {string} storeId
   */
  async getDeliverySettings(storeId) {
    if (!storeId) return wrapDbResponse({ data: null, error: new Error('Store ID required') }, 'vendors.getDeliverySettings');
    const response = await fromTable(TABLES.DELIVERY_SETTINGS).select('*').eq('store_id', storeId).maybeSingle();
    return wrapDbResponse(response, 'vendors.getDeliverySettings');
  },

  /**
   * Fetches tax information (PAN, GSTIN) for a vendor.
   * Note: RLS ensures only the authenticated vendor can view their own tax info.
   * @param {string} vendorId
   */
  async getTaxInformation(vendorId) {
    if (!vendorId) return wrapDbResponse({ data: null, error: new Error('Vendor ID required') }, 'vendors.getTaxInformation');
    const response = await fromTable(TABLES.TAX_INFORMATION).select('*').eq('vendor_id', vendorId).maybeSingle();
    return wrapDbResponse(response, 'vendors.getTaxInformation');
  },

  /**
   * Fetches settlement bank account details for a vendor.
   * Note: RLS ensures only the authenticated vendor can view their bank info.
   * @param {string} vendorId
   */
  async getBankAccount(vendorId) {
    if (!vendorId) return wrapDbResponse({ data: null, error: new Error('Vendor ID required') }, 'vendors.getBankAccount');
    const response = await fromTable(TABLES.BANK_ACCOUNTS).select('*').eq('vendor_id', vendorId).maybeSingle();
    return wrapDbResponse(response, 'vendors.getBankAccount');
  },

  /**
   * Fetches KYC documents metadata for a vendor.
   * @param {string} vendorId
   */
  async getKycDocuments(vendorId) {
    if (!vendorId) return wrapDbResponse({ data: [], error: new Error('Vendor ID required') }, 'vendors.getKycDocuments');
    const response = await fromTable(TABLES.KYC_DOCUMENTS).select('*').eq('vendor_id', vendorId).order('created_at', { ascending: true });
    return wrapDbResponse(response, 'vendors.getKycDocuments');
  },

  /**
   * Fetches store photos for a store.
   * @param {string} storeId
   */
  async getStorePhotos(storeId) {
    if (!storeId) return wrapDbResponse({ data: [], error: new Error('Store ID required') }, 'vendors.getStorePhotos');
    const response = await fromTable(TABLES.STORE_PHOTOS).select('*').eq('store_id', storeId).order('display_order', { ascending: true });
    return wrapDbResponse(response, 'vendors.getStorePhotos');
  },
};
