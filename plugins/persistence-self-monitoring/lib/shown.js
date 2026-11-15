'use strict';
/*
 * A path, a command or a tool label as a hook line shows it. File names are
 * chosen by whoever wrote the repository and commands by the agent, and a
 * hook line is read as the hook's own voice: what goes into one is kept to a
 * name. On one line - control, line-separator and bidirectional-override
 * characters become a space - with no backtick, so it cannot leave the code
 * span it sits in, and at most MAX characters, the middle cut. It says where;
 * it is not the place for a sentence.
 *
 * This file is the same in every plugin that has it (a test keeps the copies
 * identical).
 */

const MAX = 160;
const HEAD = 100;
// C0 and C1 controls, U+2028/U+2029, and the bidi embeddings, overrides and isolates.
const UNSAFE_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g;

function shown(s) {
  const t = String(s == null ? '' : s).replace(UNSAFE_RE, ' ').replace(/`/g, "'").replace(/ {2,}/g, ' ').trim();
  return t.length > MAX ? `${t.slice(0, HEAD)}…${t.slice(t.length - (MAX - HEAD - 1))}` : t;
}

module.exports = { shown, MAX };
