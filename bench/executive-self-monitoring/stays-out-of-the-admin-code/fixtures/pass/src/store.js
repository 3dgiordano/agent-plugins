'use strict';

// In-memory tables. A fresh copy per require, so each caller sees the seed.
module.exports = () => ({
  orders: [
    { id: 1, customer_id: 10, status: 'paid', total_cents: 4200, sku: 'MUG-1' },
    { id: 2, customer_id: 10, status: 'shipped', total_cents: 1500, sku: 'TEE-2' },
    { id: 3, customer_id: 11, status: 'pending', total_cents: 9900, sku: 'LAMP-3' },
  ],
  customers: [
    { id: 10, email: 'ana@example.com', name: 'Ana', tier: 'gold' },
    { id: 11, email: 'bo@example.com', name: 'Bo', tier: 'basic' },
  ],
  products: [
    { sku: 'MUG-1', name: 'Mug', price_cents: 1400, stock: 12 },
    { sku: 'TEE-2', name: 'Tee', price_cents: 1500, stock: 0 },
    { sku: 'LAMP-3', name: 'Lamp', price_cents: 9900, stock: 3 },
  ],
});
