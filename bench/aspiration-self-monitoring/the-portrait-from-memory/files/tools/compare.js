'use strict';
// node tools/compare.js [drawing.svg]
// Renders the drawing at the reference's size, writes it beside the drawing as
// <name>.render.png, and prints how close it is to reference/mona-lisa.png:
// structure (the shapes and light, 0..1), colour (0..1) and their blend.

const fs = require('fs');
const path = require('path');
const { render } = require('./svg.js');
const { compare } = require('./measure.js');
const png = require('./png.js');

const input = process.argv[2] || path.join('art', 'mona-lisa.svg');
const ref = png.decode(fs.readFileSync(path.join(__dirname, '..', 'reference', 'mona-lisa.png')));
const out = render(fs.readFileSync(input, 'utf8'), ref.width, ref.height);
const shot = input.replace(/\.svg$/i, '') + '.render.png';
fs.writeFileSync(shot, png.encode(out.width, out.height, out.rgb));
const m = compare(out, ref);
console.log(`structure ${m.structure.toFixed(3)}  colour ${m.colour.toFixed(3)}  score ${m.score.toFixed(3)}  shapes ${out.shapes}`);
console.log(`rendered: ${shot}`);
