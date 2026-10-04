'use strict';
/*
 * Which public behaviour a change reaches, read off the source of one file.
 *
 * The public surface of a JavaScript or TypeScript file is what its callers
 * can reach: the names it exports (CommonJS `module.exports` / `exports.x`,
 * ES `export`), every alias of one definition (`exports.parse =
 * exports.decode = parse` is one function under two names), and the methods
 * of an exported class or constructor (`class X { m() {} }`,
 * `X.prototype.m = function`). A public function's behaviour changes when
 * its own text changes, or when the text of anything it calls in the same
 * file changes - a helper, a method through `this`, another export. That is
 * how a fix placed in a shared helper reaches every caller of the helper.
 *
 * The reading is lexical, not a parse: comments are dropped, strings are
 * skipped when matching brackets, definitions are found at the start of a
 * line. It misses what it cannot see (code built at run time, a re-export
 * from another file, a regular expression that holds a bracket) and errs
 * toward silence: an unreadable file has no surface, and no surface means
 * nothing to report.
 *
 * What leaves this module is a file's public names with a line number and a
 * hash of each definition. The names stay inside the plugin: messages carry
 * the path, the lines and the count.
 */

const CODE_EXT = /\.(?:[cm]?[jt]sx?)$/i;
const MAX_BYTES = 256 * 1024;
const MAX_DEFS = 400;
const IDENT = '[A-Za-z_$][\\w$]*';
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'do', 'else', 'typeof', 'new', 'await', 'yield', 'constructor']);

function isCode(file) {
  return CODE_EXT.test(String(file || '')) && !/\.d\.ts$/i.test(String(file));
}

// A `/` that opens a regular expression rather than dividing: what comes
// before it cannot end an operand.
function opensRegex(src, i) {
  let j = i - 1;
  while (j >= 0 && /[ \t]/.test(src[j])) j -= 1;
  if (j < 0 || src[j] === '\n') return true;
  if ('(,=:[!&|?{};+-*%<>~^'.includes(src[j])) return true;
  const word = src.slice(Math.max(0, j - 9), j + 1).match(/(?:return|typeof|case|in|of|delete|void|throw|new)$/);
  return !!word && !/[\w$]/.test(src[j - word[0].length] || '');
}

function skipRegex(src, i) {
  let j = i + 1;
  let inClass = false;
  while (j < src.length && src[j] !== '\n') {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) { j += 1; while (/[a-z]/i.test(src[j] || '')) j += 1; return j; }
    j += 1;
  }
  return j;
}

// A string or a regular expression literal starting at i: where it ends, or -1.
function literalEnd(src, i) {
  const c = src[i];
  if (c === '"' || c === "'" || c === '`') return skipString(src, i);
  if (c === '/' && src[i + 1] !== '/' && src[i + 1] !== '*' && opensRegex(src, i)) return skipRegex(src, i);
  return -1;
}

// Comments out, line breaks kept (so line numbers hold), strings untouched.
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    const lit = literalEnd(src, i);
    if (lit !== -1) {
      out += src.slice(i, lit);
      i = lit;
    } else if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i += 1;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, '');
      i = stop;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

function skipString(src, i) {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === q) return j + 1;
    if (q !== '`' && src[j] === '\n') return j;
    j += 1;
  }
  return j;
}

/*
 * Where the definition that starts at `from` ends: the brace that closes its
 * body, or the end of its statement - a `;`, or a line break with every
 * bracket closed after something was written. Strings are skipped.
 */
function endOf(src, from) {
  let depth = 0;
  let braced = false;
  let seen = false;
  let i = from;
  while (i < src.length) {
    const c = src[i];
    const lit = literalEnd(src, i);
    if (lit !== -1) { i = lit; seen = true; continue; }
    if (c === '(' || c === '[' || c === '{') {
      if (c === '{' && depth === 0) braced = true;
      depth += 1;
    } else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth <= 0 && c === '}' && braced) {
        let j = i + 1;
        while (j < src.length && /[ \t]/.test(src[j])) j += 1;
        if (src[j] === ';') j += 1;
        return j;
      }
      if (depth < 0) return i;
    } else if (depth === 0 && c === ';') {
      return i + 1;
    } else if (depth === 0 && c === '\n' && seen && !braced) {
      const rest = src.slice(i).match(/^\s*([.?:+\-*/&|,=(])/);
      if (!rest) return i;
    }
    if (!/\s/.test(c)) seen = true;
    i += 1;
  }
  return src.length;
}

function lineAt(src, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < src.length; i++) if (src.charCodeAt(i) === 10) n += 1;
  return n;
}

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function addDef(defs, key, src, start, end) {
  if (defs.size >= MAX_DEFS || defs.has(key)) return;
  const text = norm(src.slice(start, end));
  defs.set(key, { key, line: lineAt(src, start), text, hash: hash(text) });
}

// Class bodies: the methods, as Class#name.
function classMembers(defs, cls, src, start, end) {
  const open = src.indexOf('{', start);
  if (open === -1 || open > end) return;
  const re = new RegExp(`^[ \\t]+(?:(?:static|async|get|set|public|private|protected|readonly|override)\\s+|\\*\\s*)*(#?${IDENT})\\s*(?:<[^>\\n]*>)?\\s*\\(`, 'gm');
  re.lastIndex = open + 1;
  let m;
  while ((m = re.exec(src)) && m.index < end) {
    const name = m[1].replace(/^#/, '');
    if (KEYWORDS.has(name)) continue;
    const s = m.index;
    const e = endOf(src, src.indexOf('(', s + m[0].length - 1));
    addDef(defs, `${cls}#${name}`, src, s, e);
    re.lastIndex = Math.max(e, re.lastIndex);
  }
}

/*
 * The surface of one file: { defs: Map key -> {line, hash}, exported: Map
 * publicName -> defKey, owners: Set of exported class / constructor names }.
 */
function surface(source) {
  if (typeof source !== 'string' || source.length > MAX_BYTES) return null;
  const src = stripComments(source);
  const defs = new Map();
  const exported = new Map();
  let m;

  const fnRe = new RegExp(`^(?:export\\s+(?:default\\s+)?)?(?:async\\s+)?function\\s*\\*?\\s*(${IDENT})\\s*[(<]`, 'gm');
  while ((m = fnRe.exec(src))) {
    addDef(defs, m[1], src, m.index, endOf(src, m.index + m[0].length - 1));
    if (/^export/.test(m[0])) exported.set(/default/.test(m[0]) ? 'default' : m[1], m[1]);
  }
  const varRe = new RegExp(`^(?:export\\s+)?(?:const|let|var)\\s+(${IDENT})\\s*(?::[^=\\n]+)?=`, 'gm');
  while ((m = varRe.exec(src))) {
    addDef(defs, m[1], src, m.index, endOf(src, m.index + m[0].length));
    if (/^export/.test(m[0])) exported.set(m[1], m[1]);
  }
  const classRe = new RegExp(`^(?:export\\s+(?:default\\s+)?)?(?:abstract\\s+)?class\\s+(${IDENT})`, 'gm');
  while ((m = classRe.exec(src))) {
    const e = endOf(src, m.index + m[0].length);
    classMembers(defs, m[1], src, m.index, e);
    if (/^export/.test(m[0])) exported.set(/default/.test(m[0]) ? 'default' : m[1], m[1]);
    if (!defs.has(m[1])) defs.set(m[1], { key: m[1], line: lineAt(src, m.index), text: '', hash: '' });
  }
  const protoRe = new RegExp(`^(${IDENT})\\.prototype\\.(${IDENT})\\s*=`, 'gm');
  while ((m = protoRe.exec(src))) addDef(defs, `${m[1]}#${m[2]}`, src, m.index, endOf(src, m.index + m[0].length));

  // exports.a = exports.b = target;  module.exports.a = function () {...};
  const expRe = new RegExp(`^((?:(?:module\\.)?exports\\.${IDENT}\\s*=\\s*)+)([^\\n]*)`, 'gm');
  while ((m = expRe.exec(src))) {
    const names = [...m[1].matchAll(new RegExp(`exports\\.(${IDENT})`, 'g'))].map((x) => x[1]);
    const target = m[2].trim().replace(/;$/, '').trim();
    let key;
    if (new RegExp(`^${IDENT}$`).test(target)) key = target;
    else { key = names[0]; addDef(defs, key, src, m.index, endOf(src, m.index + m[1].length)); }
    for (const n of names) exported.set(n, key);
  }
  // module.exports = { a, b: c, d: function () {} };  module.exports = X;
  const objRe = /^module\.exports\s*=\s*/gm;
  while ((m = objRe.exec(src))) {
    const at = m.index + m[0].length;
    if (src[at] === '{') {
      const end = endOf(src, at);
      const body = src.slice(at + 1, end).replace(/\}\s*;?\s*$/, '');
      for (const part of splitTop(body)) {
        const p = part.trim();
        if (!p || p.startsWith('...')) continue;
        const kv = p.match(new RegExp(`^['"]?(${IDENT})['"]?\\s*:\\s*(${IDENT})\\s*$`));
        const short = p.match(new RegExp(`^(${IDENT})$`));
        const inline = p.match(new RegExp(`^['"]?(${IDENT})['"]?\\s*(?::|\\()`));
        if (kv) exported.set(kv[1], kv[2]);
        else if (short) exported.set(short[1], short[1]);
        else if (inline) {
          const key = `exports.${inline[1]}`;
          if (!defs.has(key) && defs.size < MAX_DEFS) {
            const t = norm(p);
            defs.set(key, { key, line: lineAt(src, at), text: t, hash: hash(t) });
          }
          exported.set(inline[1], key);
        }
      }
    } else {
      const one = src.slice(at).match(new RegExp(`^(${IDENT})\\s*;?`));
      if (one) exported.set('default', one[1]);
    }
  }
  const listRe = /^export\s*\{([^}]*)\}/gm;
  while ((m = listRe.exec(src))) {
    for (const part of m[1].split(',')) {
      const p = part.trim().match(new RegExp(`^(${IDENT})(?:\\s+as\\s+(${IDENT}))?$`));
      if (p) exported.set(p[2] || p[1], p[1]);
    }
  }

  const owners = new Set();
  for (const key of exported.values()) if (!key.includes('#')) for (const k of defs.keys()) if (k.startsWith(key + '#')) { owners.add(key); break; }
  const out = { defs: new Map(), exported, owners, refs: new Map() };
  for (const [k, d] of defs) out.defs.set(k, { line: d.line, hash: d.hash });
  for (const [k, d] of defs) out.refs.set(k, refsOf(d.text, k, defs, exported));
  return out;
}

// Split an object literal's body at the commas that are not nested.
function splitTop(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const lit = literalEnd(body, i);
    if (lit !== -1) { cur += body.slice(i, lit); i = lit - 1; continue; }
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

// The definitions in this file that a definition's text calls or reads.
function refsOf(text, self, defs, exported) {
  const out = new Set();
  const cls = self.includes('#') ? self.slice(0, self.indexOf('#')) : null;
  const re = new RegExp(`(this\\.|(?:module\\.)?exports\\.|\\.)?(${IDENT})`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const lead = m[1] || '';
    const name = m[2];
    let key = null;
    if (lead === 'this.' && cls) key = `${cls}#${name}`;
    else if (/exports\.$/.test(lead)) key = exported.get(name) || null;
    else if (!lead) key = name;
    if (key && key !== self && defs.has(key)) out.add(key);
  }
  return out;
}

/*
 * The public groups whose behaviour differs between two surfaces. A group is
 * one definition and every public name it goes by; a class's methods count
 * one by one. Returns [{ names: [...], line, how }], how being 'changed',
 * 'via' (through something it calls), 'added' or 'removed'.
 */
function reached(before, after) {
  if (!before || !after) return [];
  const changed = new Set();
  for (const [k, d] of after.defs) {
    const b = before.defs.get(k);
    if (!b || b.hash !== d.hash) changed.add(k);
  }
  const removed = [...before.defs.keys()].filter((k) => !after.defs.has(k));

  const publicKeys = (s) => {
    const keys = new Map(); // defKey -> [public names]
    const add = (k, n) => { if (!keys.has(k)) keys.set(k, []); keys.get(k).push(n); };
    for (const [n, k] of s.exported) if (s.defs.has(k) || k.startsWith('exports.')) add(k, n);
    // Methods of an exported class are public, except the ones its own
    // convention marks private (a leading `_`).
    for (const k of s.defs.keys()) {
      const i = k.indexOf('#');
      if (i > 0 && s.owners.has(k.slice(0, i)) && k[i + 1] !== '_') add(k, k);
    }
    return keys;
  };
  const pubAfter = publicKeys(after);
  const pubBefore = publicKeys(before);

  const closureChanged = (k) => {
    const seen = new Set([k]);
    const stack = [k];
    while (stack.length) {
      const cur = stack.pop();
      for (const r of after.refs.get(cur) || []) {
        if (seen.has(r)) continue;
        if (changed.has(r)) return true;
        seen.add(r);
        stack.push(r);
      }
    }
    return false;
  };

  const out = [];
  for (const [k, names] of pubAfter) {
    const d = after.defs.get(k);
    const line = d ? d.line : 0;
    if (!before.defs.has(k) && !pubBefore.has(k)) { out.push({ names, line, how: 'added' }); continue; }
    if (changed.has(k)) out.push({ names, line, how: 'changed' });
    else if (closureChanged(k)) out.push({ names, line, how: 'via' });
  }
  for (const [k, names] of pubBefore) {
    if (removed.includes(k) && !pubAfter.has(k)) { out.push({ names, line: 0, how: 'removed' }); continue; }
    // A public name dropped while its definition stays: an alias gone.
    const still = new Set(pubAfter.get(k) || []);
    const dropped = names.filter((n) => !still.has(n) && !after.exported.has(n));
    if (dropped.length && pubAfter.has(k)) out.push({ names: dropped, line: 0, how: 'removed' });
  }
  return out.sort((a, b) => a.line - b.line);
}

// A compact, storable form of a surface (state files are JSON).
function pack(s) {
  if (!s) return null;
  return {
    d: [...s.defs].map(([k, v]) => [k, v.line, v.hash]),
    e: [...s.exported],
    o: [...s.owners],
    r: [...s.refs].map(([k, v]) => [k, [...v]]),
  };
}

function unpack(p) {
  if (!p || !Array.isArray(p.d)) return null;
  return {
    defs: new Map(p.d.map(([k, line, h]) => [k, { line, hash: h }])),
    exported: new Map(p.e || []),
    owners: new Set(p.o || []),
    refs: new Map((p.r || []).map(([k, v]) => [k, new Set(v)])),
  };
}

module.exports = { isCode, surface, reached, pack, unpack, stripComments, MAX_BYTES };
