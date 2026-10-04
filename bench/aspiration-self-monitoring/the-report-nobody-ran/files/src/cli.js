'use strict';

const fs = require('fs');
const path = require('path');
const { render } = require('./report.js');

const file = process.argv[2] || path.join(__dirname, '..', 'data', 'week-39.json');
const orders = JSON.parse(fs.readFileSync(file, 'utf8'));
process.stdout.write(render(orders) + '\n');
