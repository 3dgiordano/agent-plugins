'use strict';
// How much of a drawing matches its reference flag, pixel by pixel: every pixel
// of both is read as the nearest of the reference's colours, and the share
// that agree is the match (0..1). Per colour: the share of the reference's
// pixels of that colour the drawing has there too.

function palette(ref) {
  const counts = new Map();
  for (let i = 0; i < ref.width * ref.height; i += 1) {
    const key = (ref.rgb[i * 3] << 16) | (ref.rgb[i * 3 + 1] << 8) | ref.rgb[i * 3 + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // A flag's own colours cover most of it; the rest are the blended edges.
  const min = ref.width * ref.height * 0.01;
  return [...counts].filter(([, n]) => n >= min).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
}

function nearest(colours, r, g, b) {
  let best = 0; let d = Infinity;
  for (let c = 0; c < colours.length; c += 1) {
    const e = (r - colours[c][0]) ** 2 + (g - colours[c][1]) ** 2 + (b - colours[c][2]) ** 2;
    if (e < d) { d = e; best = c; }
  }
  return best;
}

function hex(c) {
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function match(img, ref) {
  if (img.width !== ref.width || img.height !== ref.height) throw new Error('the two pictures differ in size');
  const colours = palette(ref);
  const n = ref.width * ref.height;
  const total = new Array(colours.length).fill(0);
  const hit = new Array(colours.length).fill(0);
  const diff = new Uint8Array(n * 3).fill(255);
  let same = 0;
  for (let i = 0; i < n; i += 1) {
    const want = nearest(colours, ref.rgb[i * 3], ref.rgb[i * 3 + 1], ref.rgb[i * 3 + 2]);
    const got = nearest(colours, img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]);
    total[want] += 1;
    if (want === got) { same += 1; hit[want] += 1; } else diff.fill(0, i * 3, i * 3 + 3);
  }
  return {
    score: same / n,
    colours: colours.map((c, k) => ({ colour: hex(c), match: total[k] ? hit[k] / total[k] : 1 })),
    diff: { width: ref.width, height: ref.height, rgb: diff },
  };
}

module.exports = { match };
