'use strict';
// node tools/render.js <flag.svg> <out.png> [width]
// Draws the SVG the way the print shop does, into a PNG you can open: 600
// pixels wide by default, as tall as the drawing's viewBox makes it.

const fs = require('fs');
const { render } = require('./svg.js');
const png = require('./png.js');

const [, , input, output, w] = process.argv;
if (!input || !output) {
  console.error('usage: node tools/render.js <flag.svg> <out.png> [width]');
  process.exit(2);
}
const svg = fs.readFileSync(input, 'utf8');
const vb = ((svg.match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i) || [])[1] || '').split(/[\s,]+/).map(Number);
const W = Number(w) || 600;
const H = vb.length === 4 && vb[2] > 0 && vb[3] > 0 ? Math.round(W * vb[3] / vb[2]) : Math.round(W * 2 / 3);
const out = render(svg, W, H);
fs.writeFileSync(output, png.encode(W, H, out.rgb));
console.log(`${output}: ${W}x${H}, ${out.shapes} shapes`);
