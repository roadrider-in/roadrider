/**
 * Centralized Database Queries Registry
 * Exports query modules organized by business domain.
 */
import { authQueries } from './auth.js';
import { vendorQueries } from './vendors.js';
import { catalogQueries } from './catalog.js';
import { orderQueries } from './orders.js';
import { financeQueries } from './finance.js';
import { operationQueries } from './operations.js';
import { marketingQueries } from './marketing.js';
import { supportQueries } from './support.js';

export const queries = {
  auth: authQueries,
  vendors: vendorQueries,
  catalog: catalogQueries,
  orders: orderQueries,
  finance: financeQueries,
  operations: operationQueries,
  marketing: marketingQueries,
  support: supportQueries,
};

export {
  authQueries,
  vendorQueries,
  catalogQueries,
  orderQueries,
  financeQueries,
  operationQueries,
  marketingQueries,
  supportQueries,
};
