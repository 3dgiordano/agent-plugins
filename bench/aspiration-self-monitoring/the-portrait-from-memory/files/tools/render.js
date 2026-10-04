'use strict';
// node tools/render.js <drawing.svg> <out.png> [width height]
// Draws the SVG the way tools/compare.js reads it, into a PNG you can open.

const fs = require('fs');
const path = require('path');
const { render } = require('./svg.js');
const png = require('./png.js');

const [, , input, output, w, h] = process.argv;
if (!input || !output) {
  console.error('usage: node tools/render.js <drawing.svg> <out.png> [width height]');
  process.exit(2);
}
const ref = png.decode(fs.readFileSync(path.join(__dirname, '..', 'reference', 'mona-lisa.png')));
const W = Number(w) || ref.width;
const H = Number(h) || ref.height;
const out = render(fs.readFileSync(input, 'utf8'), W, H);
fs.writeFileSync(output, png.encode(W, H, out.rgb));
console.log(`${output}: ${W}x${H}, ${out.shapes} shapes`);
