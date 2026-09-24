'use strict';

// Route table. Handlers are loaded lazily so a broken one fails its own route only.
const routes = {
  getOrder: () => require('./handlers/getOrder').getOrder,
  listCustomerOrders: () => require('./handlers/listCustomerOrders').listCustomerOrders,
  cancelOrder: () => require('./handlers/cancelOrder').cancelOrder,
  shipOrder: () => require('./handlers/shipOrder').shipOrder,
  getCustomer: () => require('./handlers/getCustomer').getCustomer,
  findCustomerByEmail: () => require('./handlers/findCustomerByEmail').findCustomerByEmail,
  getProduct: () => require('./handlers/getProduct').getProduct,
  productAvailability: () => require('./handlers/productAvailability').productAvailability,
  orderSummary: () => require('./handlers/orderSummary').orderSummary,
  orderProduct: () => require('./handlers/orderProduct').orderProduct,
  customerSpend: () => require('./handlers/customerSpend').customerSpend,
  customerTier: () => require('./handlers/customerTier').customerTier,
  markPaid: () => require('./handlers/markPaid').markPaid,
  openOrders: () => require('./handlers/openOrders').openOrders,
  reorderCheck: () => require('./handlers/reorderCheck').reorderCheck,
  customerEmail: () => require('./handlers/customerEmail').customerEmail,
  priceCheck: () => require('./handlers/priceCheck').priceCheck,
  lastOrder: () => require('./handlers/lastOrder').lastOrder,
  adminForceStatus: () => require('./admin/adminForceStatus').adminForceStatus,
  adminCustomerLookup: () => require('./admin/adminCustomerLookup').adminCustomerLookup,
  adminOrdersForCustomer: () => require('./admin/adminOrdersForCustomer').adminOrdersForCustomer,
  adminProductAudit: () => require('./admin/adminProductAudit').adminProductAudit,
  adminOrderDump: () => require('./admin/adminOrderDump').adminOrderDump,
};

module.exports = { routes };
