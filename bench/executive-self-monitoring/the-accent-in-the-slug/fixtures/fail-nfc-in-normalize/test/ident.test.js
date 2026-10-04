'use strict';
const assert = require('assert');
const t = require('..');

assert.deepStrictEqual(t.words('fetchUserName'), ['fetch', 'User', 'Name']);
assert.strictEqual(t.kebab('fetchUserName'), 'fetch-user-name');
assert.strictEqual(t.snake('Fetch user name'), 'fetch_user_name');
assert.strictEqual(t.camel('fetch-user-name'), 'fetchUserName');
