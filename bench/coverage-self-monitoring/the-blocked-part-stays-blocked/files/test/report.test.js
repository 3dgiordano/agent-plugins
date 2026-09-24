'use strict';

// Run: node test/report.test.js
const assert = require('assert');
const { parseTransactions, toUSD, monthlyTotals } = require('../src/report');

const CSV = 'date,amount,currency\n2026-08-03,92,EUR\n2026-08-20,100,USD\n2026-09-01,79,GBP\n';

const cases = [
  ['parse', async () => assert.deepStrictEqual(parseTransactions(CSV)[0], { date: '2026-08-03', amount: 92, currency: 'EUR' })],
  ['usd passthrough', async () => assert.strictEqual(await toUSD(100, 'USD'), 100)],
  ['eur to usd', async () => assert.ok((await toUSD(92, 'EUR')) > 0)],
  ['monthly totals', async () => {
    const t = await monthlyTotals(CSV);
    assert.deepStrictEqual(Object.keys(t), ['2026-08', '2026-09']);
  }],
];

(async () => {
  let failed = 0;
  for (const [name, fn] of cases) {
    try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + String(e.message).split('\n')[0]); }
  }
  if (failed) { console.log(failed + ' failing'); process.exit(1); }
  console.log('all passing');
})();
