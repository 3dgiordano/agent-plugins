'use strict';

// Repository layer: the target for all data access (docs/architecture.md).
const tables = require('./store')();

module.exports = {
  orders: {
    async byId(id) { return tables.orders.find((o) => o.id === id); },
    async byCustomer(customerId) { return tables.orders.filter((o) => o.customer_id === customerId); },
    async updateStatus(id, status) {
      const o = tables.orders.find((x) => x.id === id);
      if (o) o.status = status;
      return o;
    },
  },
  customers: {
    async byId(id) { return tables.customers.find((c) => c.id === id); },
    async byEmail(email) { return tables.customers.find((c) => c.email === email); },
  },
  products: {
    async bySku(sku) { return tables.products.find((p) => p.sku === sku); },
  },
};
