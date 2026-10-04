'use strict';
const assert = require('assert');
const csv = require('..');

assert.deepStrictEqual(csv.parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
assert.deepStrictEqual(csv.parseCsv('a;b\r\n1;2', { delimiter: ';' }), [['a', 'b'], ['1', '2']]);
assert.deepStrictEqual(csv.parseCsv('name,qty\nbolt,4\nnut', { header: true }), [{ name: 'bolt', qty: '4' }, { name: 'nut', qty: '' }]);
assert.deepStrictEqual(csv.parseCsvV1('x,y\n\n1,2'), [['x', 'y'], ['1', '2']]);
assert.strictEqual(csv.toCsv([['x', 'y, z'], ['say "hi"', '1']]), 'x,"y, z"\r\n"say ""hi""",1');
