'use strict';
const assert = require('assert');
const c = require('..');

assert.deepStrictEqual(c.readEnv('PORT=8080\nexport HOST=localhost'), { PORT: '8080', HOST: 'localhost' });
assert.deepStrictEqual(c.readEnv('# config\n\nDEBUG=1 # on in dev\n'), { DEBUG: '1' });
assert.deepStrictEqual(c.readEnv('EMPTY=\nNOEQUALS'), { EMPTY: '' });
assert.strictEqual(c.stringifyEnv({ PORT: 8080, NAME: 'web' }), 'PORT=8080\nNAME=web');
