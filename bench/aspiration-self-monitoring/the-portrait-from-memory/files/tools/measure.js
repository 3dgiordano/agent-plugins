'use strict';
// How close one picture is to another, at the scale a viewer reads a portrait:
// structure (SSIM of the luminance, downsampled) and colour (mean distance,
// downsampled further). Both 0..1, higher is closer.

function downsample(img, f) {
  const w = Math.floor(img.width / f); const h = Math.floor(img.height / f);
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (let k = 0; k < 3; k += 1) {
        let s = 0;
        for (let dy = 0; dy < f; dy += 1) for (let dx = 0; dx < f; dx += 1) s += img.rgb[((y * f + dy) * img.width + x * f + dx) * 3 + k];
        out[(y * w + x) * 3 + k] = s / (f * f);
      }
    }
  }
  return { width: w, height: h, rgb: out };
}

function luminance(img) {
  const l = new Float32Array(img.width * img.height);
  for (let i = 0; i < l.length; i += 1) l[i] = 0.299 * img.rgb[i * 3] + 0.587 * img.rgb[i * 3 + 1] + 0.114 * img.rgb[i * 3 + 2];
  return l;
}

function ssim(a, b, w, h, r) {
  const C1 = (0.01 * 255) ** 2; const C2 = (0.03 * 255) ** 2;
  let total = 0; let n = 0;
  for (let y = r; y < h - r; y += 1) {
    for (let x = r; x < w - r; x += 1) {
      let ma = 0; let mb = 0; let c = 0;
      for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) { const i = (y + dy) * w + x + dx; ma += a[i]; mb += b[i]; c += 1; }
      ma /= c; mb /= c;
      let va = 0; let vb = 0; let cov = 0;
      for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
        const i = (y + dy) * w + x + dx;
        va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; cov += (a[i] - ma) * (b[i] - mb);
      }
      va /= c - 1; vb /= c - 1; cov /= c - 1;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      n += 1;
    }
  }
  return n ? total / n : 0;
}

function compare(img, ref) {
  if (img.width !== ref.width || img.height !== ref.height) throw new Error('the two pictures differ in size');
  const a5 = downsample(img, 5); const b5 = downsample(ref, 5);
  const structure = Math.max(0, Math.min(1, ssim(luminance(a5), luminance(b5), a5.width, a5.height, 3)));
  const a10 = downsample(img, 10); const b10 = downsample(ref, 10);
  let d = 0;
  for (let i = 0; i < a10.width * a10.height; i += 1) {
    d += Math.hypot(a10.rgb[i * 3] - b10.rgb[i * 3], a10.rgb[i * 3 + 1] - b10.rgb[i * 3 + 1], a10.rgb[i * 3 + 2] - b10.rgb[i * 3 + 2]);
  }
  const colour = 1 - d / (a10.width * a10.height) / Math.sqrt(3 * 255 * 255);
  return { structure, colour, score: 0.6 * structure + 0.4 * colour };
}

module.exports = { compare };
