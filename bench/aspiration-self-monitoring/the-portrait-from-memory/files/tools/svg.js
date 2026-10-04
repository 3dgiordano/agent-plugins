'use strict';
/*
 * A small SVG rasterizer: enough of SVG to draw a picture by hand.
 *
 * Draws rect, circle, ellipse, line, polyline, polygon and path (M L H V C S Q
 * T A Z, absolute and relative), with fill, stroke, stroke-width, opacity,
 * fill-opacity, stroke-opacity, fill-rule, transform (matrix, translate,
 * scale, rotate, skewX, skewY), <g> inheritance, the root viewBox, and
 * gradients as the average colour of their stops. Not drawn: text, image,
 * use, filters, masks, clip paths, patterns. Strokes are square-ended.
 * The background is white.
 */

const NAMED = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255],
  yellow: [255, 255, 0], orange: [255, 165, 0], brown: [165, 42, 42], gray: [128, 128, 128], grey: [128, 128, 128],
  darkgray: [169, 169, 169], darkgrey: [169, 169, 169], lightgray: [211, 211, 211], lightgrey: [211, 211, 211],
  silver: [192, 192, 192], maroon: [128, 0, 0], olive: [128, 128, 0], navy: [0, 0, 128], teal: [0, 128, 128],
  purple: [128, 0, 128], tan: [210, 180, 140], beige: [245, 245, 220], khaki: [240, 230, 140], gold: [255, 215, 0],
  sienna: [160, 82, 45], saddlebrown: [139, 69, 19], chocolate: [210, 105, 30], peru: [205, 133, 63],
  darkolivegreen: [85, 107, 47], darkgreen: [0, 100, 0], darkslategray: [47, 79, 79], darkslategrey: [47, 79, 79],
  wheat: [245, 222, 179], burlywood: [222, 184, 135], peachpuff: [255, 218, 185], bisque: [255, 228, 196],
  moccasin: [255, 228, 181], navajowhite: [255, 222, 173], skyblue: [135, 206, 235], lightblue: [173, 216, 230],
  pink: [255, 192, 203], salmon: [250, 128, 114], darkred: [139, 0, 0], goldenrod: [218, 165, 32],
  darkgoldenrod: [184, 134, 11], ivory: [255, 255, 240], linen: [250, 240, 230], cornsilk: [255, 248, 220],
};

function parseColor(v, grads) {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s || s === 'none' || s === 'transparent') return null;
  const url = s.match(/^url\(\s*#([^)\s]+)\s*\)/);
  if (url) return grads[url[1]] || null;
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split('').map((h) => parseInt(h + h, 16));
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgba?\(([^)]*)\)/);
  if (m) {
    return m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
      .map((p) => (p.endsWith('%') ? Math.round(parseFloat(p) * 2.55) : Math.round(parseFloat(p))))
      .map((n) => Math.max(0, Math.min(255, n || 0)));
  }
  if (NAMED[s]) return NAMED[s];
  return [0, 0, 0];
}

function attrsOf(src) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(src)) !== null) out[m[1]] = m[3] !== undefined ? m[3] : m[4];
  if (out.style) {
    for (const decl of out.style.split(';')) {
      const i = decl.indexOf(':');
      if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
  }
  return out;
}

const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(s) {
  let m = [1, 0, 0, 1, 0, 0];
  if (!s) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(s)) !== null) {
    const a = t[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n;
    if (t[1] === 'matrix') n = a.slice(0, 6);
    else if (t[1] === 'translate') n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (t[1] === 'scale') n = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0];
    else if (t[1] === 'rotate') {
      const r = (a[0] || 0) * Math.PI / 180;
      n = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (t[1] === 'skewX') n = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
    else n = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    if (n.some((x) => !Number.isFinite(x))) continue;
    m = mul(m, n);
  }
  return m;
}

// ---- geometry: every shape becomes a list of subpaths (arrays of [x, y]) in user space

function ellipsePts(cx, cy, rx, ry) {
  const n = Math.max(24, Math.min(96, Math.round((rx + ry) / 2)));
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

function pathTokens(d) {
  return String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
}

function arcPts(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const p = phi * Math.PI / 180;
  const cp = Math.cos(p); const sp = Math.sin(p);
  const dx = (x1 - x2) / 2; const dy = (y1 - y2) / 2;
  const xp = cp * dx + sp * dy; const yp = -sp * dx + cp * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = fa === fs ? -1 : 1;
  const num2 = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const co = sign * Math.sqrt(Math.max(0, num2 / (rx * rx * yp * yp + ry * ry * xp * xp)));
  const cxp = co * (rx * yp) / ry; const cyp = co * -(ry * xp) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2; const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= Math.PI * 2;
  else if (fs && dt < 0) dt += Math.PI * 2;
  const n = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 16)));
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    const t = t1 + (dt * i) / n;
    out.push([cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
  }
  return out;
}

function pathSubpaths(d) {
  const tk = pathTokens(d);
  const subs = [];
  let cur = null;
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  let lcx = null; let lcy = null; let lqx = null; let lqy = null;
  let cmd = null;
  let i = 0;
  const isCmd = (s) => /^[A-Za-z]$/.test(s);
  const nextNum = () => { if (i >= tk.length || isCmd(tk[i])) throw new Error('bad path'); return parseFloat(tk[i++]); };
  const start = () => { if (cur && cur.length > 1) subs.push(cur); cur = [[x, y]]; };
  const line = (nx, ny) => { if (!cur) cur = [[x, y]]; cur.push([nx, ny]); x = nx; y = ny; };
  const cubic = (x1, y1, x2, y2, ex, ey) => {
    if (!cur) cur = [[x, y]];
    for (let k = 1; k <= 16; k += 1) {
      const t = k / 16; const u = 1 - t;
      cur.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]);
    }
    x = ex; y = ey;
  };
  const quad = (x1, y1, ex, ey) => {
    if (!cur) cur = [[x, y]];
    for (let k = 1; k <= 12; k += 1) {
      const t = k / 12; const u = 1 - t;
      cur.push([u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey]);
    }
    x = ex; y = ey;
  };
  try {
    while (i < tk.length) {
      if (isCmd(tk[i])) cmd = tk[i++];
      else if (!cmd) break;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0; const oy = rel ? y : 0;
      if (C === 'Z') {
        if (cur) { cur.push([sx, sy]); subs.push(cur); cur = null; }
        x = sx; y = sy; lcx = lcy = lqx = lqy = null;
        continue;
      }
      if (C === 'M') {
        x = ox + nextNum(); y = oy + nextNum(); sx = x; sy = y; start();
        cmd = rel ? 'l' : 'L'; lcx = lcy = lqx = lqy = null;
        continue;
      }
      if (C === 'L') { line(ox + nextNum(), oy + nextNum()); lcx = lcy = lqx = lqy = null; }
      else if (C === 'H') { line(ox + nextNum(), y); lcx = lcy = lqx = lqy = null; }
      else if (C === 'V') { line(x, oy + nextNum()); lcx = lcy = lqx = lqy = null; }
      else if (C === 'C') {
        const x1 = ox + nextNum(); const y1 = oy + nextNum(); const x2 = ox + nextNum(); const y2 = oy + nextNum();
        const ex = ox + nextNum(); const ey = oy + nextNum();
        cubic(x1, y1, x2, y2, ex, ey); lcx = x2; lcy = y2; lqx = lqy = null;
      } else if (C === 'S') {
        const x1 = lcx === null ? x : 2 * x - lcx; const y1 = lcy === null ? y : 2 * y - lcy;
        const x2 = ox + nextNum(); const y2 = oy + nextNum(); const ex = ox + nextNum(); const ey = oy + nextNum();
        cubic(x1, y1, x2, y2, ex, ey); lcx = x2; lcy = y2; lqx = lqy = null;
      } else if (C === 'Q') {
        const x1 = ox + nextNum(); const y1 = oy + nextNum(); const ex = ox + nextNum(); const ey = oy + nextNum();
        quad(x1, y1, ex, ey); lqx = x1; lqy = y1; lcx = lcy = null;
      } else if (C === 'T') {
        const x1 = lqx === null ? x : 2 * x - lqx; const y1 = lqy === null ? y : 2 * y - lqy;
        const ex = ox + nextNum(); const ey = oy + nextNum();
        quad(x1, y1, ex, ey); lqx = x1; lqy = y1; lcx = lcy = null;
      } else if (C === 'A') {
        const rx = nextNum(); const ry = nextNum(); const phi = nextNum();
        const fa = nextNum() ? 1 : 0; const fs = nextNum() ? 1 : 0;
        const ex = ox + nextNum(); const ey = oy + nextNum();
        if (!cur) cur = [[x, y]];
        for (const p of arcPts(x, y, rx, ry, phi, fa, fs, ex, ey)) cur.push(p);
        x = ex; y = ey; lcx = lcy = lqx = lqy = null;
      } else break;
    }
  } catch (_) { /* a malformed tail is dropped; what parsed is drawn */ }
  if (cur && cur.length > 1) subs.push(cur);
  return subs;
}

function shapeSubpaths(tag, a) {
  if (tag === 'rect') {
    const x = num(a.x, 0); const y = num(a.y, 0); const w = num(a.width, 0); const h = num(a.height, 0);
    if (w <= 0 || h <= 0) return [];
    return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]];
  }
  if (tag === 'circle') { const r = num(a.r, 0); return r > 0 ? [ellipsePts(num(a.cx, 0), num(a.cy, 0), r, r)] : []; }
  if (tag === 'ellipse') {
    const rx = num(a.rx, 0); const ry = num(a.ry, 0);
    return rx > 0 && ry > 0 ? [ellipsePts(num(a.cx, 0), num(a.cy, 0), rx, ry)] : [];
  }
  if (tag === 'line') return [[[num(a.x1, 0), num(a.y1, 0)], [num(a.x2, 0), num(a.y2, 0)]]];
  if (tag === 'polyline' || tag === 'polygon') {
    const n = String(a.points || '').split(/[\s,]+/).filter(Boolean).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    if (tag === 'polygon' && pts.length) pts.push(pts[0]);
    return pts.length > 1 ? [pts] : [];
  }
  if (tag === 'path') return pathSubpaths(a.d);
  return [];
}

// ---- raster

function coverage(polys, W, H, rule, ss) {
  const cov = new Float32Array(W * H);
  const edges = [];
  let minY = Infinity; let maxY = -Infinity;
  for (const p of polys) {
    for (let i = 0; i + 1 < p.length; i += 1) {
      const [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      if (y0 === y1 || !Number.isFinite(x0 + y0 + x1 + y1)) continue;
      edges.push(y0 < y1 ? [x0, y0, x1, y1, 1] : [x1, y1, x0, y0, -1]);
      minY = Math.min(minY, y0, y1); maxY = Math.max(maxY, y0, y1);
    }
  }
  if (!edges.length) return cov;
  const w = 1 / (ss * ss);
  const s0 = Math.max(0, Math.floor(minY * ss)); const s1 = Math.min(H * ss - 1, Math.ceil(maxY * ss));
  const xs = [];
  for (let s = s0; s <= s1; s += 1) {
    const sy = (s + 0.5) / ss;
    xs.length = 0;
    for (const e of edges) if (sy >= e[1] && sy < e[3]) xs.push([e[0] + ((sy - e[1]) * (e[2] - e[0])) / (e[3] - e[1]), e[4]]);
    if (xs.length < 2) continue;
    xs.sort((p, q) => p[0] - q[0]);
    const row = Math.floor(sy) * W;
    let wind = 0;
    for (let k = 0; k + 1 < xs.length; k += 1) {
      wind += xs[k][1];
      const inside = rule === 'evenodd' ? (k + 1) % 2 === 1 : wind !== 0;
      if (!inside) continue;
      const a = Math.max(0, Math.ceil(xs[k][0] * ss - 0.5)); const b = Math.min(W * ss - 1, Math.floor(xs[k + 1][0] * ss - 0.5));
      for (let c = a; c <= b; c += 1) cov[row + Math.floor(c / ss)] += w;
    }
  }
  return cov;
}

function strokePolys(subs, width, closed) {
  const out = [];
  const h = width / 2;
  for (const p of subs) {
    for (let i = 0; i + 1 < p.length; i += 1) {
      const [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      const dx = x1 - x0; const dy = y1 - y0; const len = Math.hypot(dx, dy);
      if (!len) continue;
      const nx = (-dy / len) * h; const ny = (dx / len) * h;
      const ex = (dx / len) * h; const ey = (dy / len) * h;
      const quad = [[x0 + nx - ex, y0 + ny - ey], [x1 + nx + ex, y1 + ny + ey], [x1 - nx + ex, y1 - ny + ey], [x0 - nx - ex, y0 - ny - ey]];
      // every quad wound the same way, so the nonzero rule unions them
      const area = (quad[1][0] - quad[0][0]) * (quad[2][1] - quad[0][1]) - (quad[2][0] - quad[0][0]) * (quad[1][1] - quad[0][1]);
      if (area < 0) quad.reverse();
      quad.push(quad[0]);
      out.push(quad);
    }
  }
  void closed;
  return out;
}

function paint(img, cov, color, alpha) {
  for (let i = 0; i < cov.length; i += 1) {
    const a = Math.min(1, cov[i]) * alpha;
    if (a <= 0) continue;
    for (let k = 0; k < 3; k += 1) img[i * 3 + k] = img[i * 3 + k] * (1 - a) + color[k] * a;
  }
}

const SKIP = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker', 'text', 'style', 'script', 'title', 'desc', 'metadata', 'filter', 'foreignobject']);
const SHAPES = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path']);

function gradients(src) {
  const out = {};
  const re = /<(linearGradient|radialGradient)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = attrsOf(m[2]).id;
    if (!id) continue;
    const stops = [];
    const sr = /<stop\b([^>]*)\/?>/gi;
    let s;
    while ((s = sr.exec(m[3])) !== null) {
      const a = attrsOf(s[1]);
      const c = parseColor(a['stop-color'] || 'black', {});
      if (c) stops.push(c);
    }
    if (stops.length) out[id.toLowerCase()] = [0, 1, 2].map((k) => Math.round(stops.reduce((t, c) => t + c[k], 0) / stops.length));
  }
  return out;
}

// Returns { width, height, rgb, shapes } - rgb a Uint8Array over white.
function render(svgText, W, H, opts) {
  const ss = (opts && opts.ss) || 3;
  const src = String(svgText).replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const grads = gradients(src);
  const img = new Float32Array(W * H * 3).fill(255);
  const stack = [];
  let root = null;
  let skip = 0;
  let shapes = 0;
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const closing = m[1] === '/'; const tag = m[2].toLowerCase(); const selfClose = m[4] === '/';
    if (closing) {
      if (SKIP.has(tag)) { skip = Math.max(0, skip - 1); continue; }
      if ((tag === 'g' || tag === 'svg' || tag === 'a') && stack.length) stack.pop();
      continue;
    }
    if (SKIP.has(tag)) { if (!selfClose) skip += 1; continue; }
    if (skip) continue;
    const a = attrsOf(m[3]);
    const parent = stack.length ? stack[stack.length - 1] : null;
    if (tag === 'svg' && !root) {
      const vb = String(a.viewBox || a.viewbox || '').split(/[\s,]+/).filter(Boolean).map(Number);
      const vw = vb.length === 4 && vb[2] > 0 ? vb[2] : num(a.width, W);
      const vh = vb.length === 4 && vb[3] > 0 ? vb[3] : num(a.height, H);
      const vx = vb.length === 4 ? vb[0] : 0; const vy = vb.length === 4 ? vb[1] : 0;
      const sc = Math.min(W / vw, H / vh);
      root = [sc, 0, 0, sc, (W - vw * sc) / 2 - vx * sc, (H - vh * sc) / 2 - vy * sc];
    }
    const base = parent || { m: root || [1, 0, 0, 1, 0, 0], fill: [0, 0, 0], stroke: null, sw: 1, op: 1, fop: 1, sop: 1, rule: 'nonzero' };
    const st = {
      m: mul(base.m, parseTransform(a.transform)),
      fill: a.fill !== undefined ? parseColor(a.fill, grads) : base.fill,
      stroke: a.stroke !== undefined ? parseColor(a.stroke, grads) : base.stroke,
      sw: a['stroke-width'] !== undefined ? num(a['stroke-width'], 1) : base.sw,
      op: base.op * (a.opacity !== undefined ? Math.max(0, Math.min(1, num(a.opacity, 1))) : 1),
      fop: a['fill-opacity'] !== undefined ? Math.max(0, Math.min(1, num(a['fill-opacity'], 1))) : base.fop,
      sop: a['stroke-opacity'] !== undefined ? Math.max(0, Math.min(1, num(a['stroke-opacity'], 1))) : base.sop,
      rule: a['fill-rule'] || base.rule,
    };
    if (st.fill === undefined) st.fill = base.fill;
    if (st.stroke === undefined) st.stroke = base.stroke;
    if (tag === 'g' || tag === 'svg' || tag === 'a') { if (!selfClose) stack.push(st); continue; }
    if (!SHAPES.has(tag)) continue;
    shapes += 1;
    const subs = shapeSubpaths(tag, a);
    if (!subs.length) continue;
    const dev = subs.map((p) => p.map(([x, y]) => apply(st.m, x, y)));
    if (st.fill && tag !== 'line') {
      const closed = dev.map((p) => (p.length && (p[0][0] !== p[p.length - 1][0] || p[0][1] !== p[p.length - 1][1]) ? p.concat([p[0]]) : p));
      paint(img, coverage(closed, W, H, st.rule === 'evenodd' ? 'evenodd' : 'nonzero', ss), st.fill, st.op * st.fop);
    }
    if (st.stroke && st.sw > 0) {
      const scale = Math.sqrt(Math.abs(st.m[0] * st.m[3] - st.m[1] * st.m[2])) || 1;
      paint(img, coverage(strokePolys(dev, st.sw * scale, false), W, H, 'nonzero', ss), st.stroke, st.op * st.sop);
    }
  }
  const rgb = new Uint8Array(W * H * 3);
  for (let i = 0; i < rgb.length; i += 1) rgb[i] = Math.max(0, Math.min(255, Math.round(img[i])));
  return { width: W, height: H, rgb, shapes };
}

module.exports = { render, parseColor, pathSubpaths };
