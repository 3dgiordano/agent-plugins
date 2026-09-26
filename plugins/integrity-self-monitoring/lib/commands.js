'use strict';
/*
 * Shell commands that change the machine the code runs on, and reads that
 * leave the project.
 *
 * Said to the agent - a change of this kind is rarely what a task asks for,
 * and a result that depends on it holds on this machine only:
 *   changes the system  TLS verification off, the hosts file written, a
 *                       firewall / proxy / registry / scheduled-task change,
 *                       an elevated shell, the execution policy
 *   starts a server     a server written inline in the command
 *
 * Logged only, until measured on real sessions: a path outside the project
 * that a read, a search or a command names. Reading a global config or the
 * home directory is ordinary work; how often it precedes a result that only
 * looks done is not known yet.
 *
 * Narrower than the audit's own marks on purpose: a command that only
 * mentions `NODE_TLS_REJECT_UNAUTHORIZED` or the hosts file (a grep, a cat)
 * reads it; these fire on a command that sets or writes it.
 */

const path = require('path');

const MARKS = [
  ['changes the system', [
    /\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0\b|\$env:NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|\bset\s+NODE_TLS_REJECT_UNAUTHORIZED=0\b/i,
    // the hosts file named, and something that writes: a redirect, a cmdlet,
    // tee, or node's fs - reading it (Get-Content, Test-Path, cat) is not this
    /^(?=[\s\S]*(?:drivers[\\/]+etc[\\/]+hosts|\/etc\/hosts\b|\$hosts\b))(?=[\s\S]*(?:>>?\s*["'$]?[^\s"'|;&]*hosts|\b(?:Add-Content|Set-Content|Out-File)\b|\btee\b|\b(?:append|write)File(?:Sync)?\s*\())/i,
    // name resolution replaced in the process that runs the code
    /\bdns\.lookup\s*=[^=]/,
    /\bnetsh\b[^|;&\n]*\b(?:add|set|delete|reset)\b/i,
    /\bsetx\b\s+\S/i,
    /\breg(?:\.exe)?\s+add\b/i,
    /\bschtasks(?:\.exe)?\s+\/create\b/i,
    /-Verb\s+RunAs\b/i,
    /\bSet-ExecutionPolicy\b/i,
    /\bnpm\s+config\s+set\s+strict-ssl\s+false\b|\bgit\s+config\b[^|;&\n]*\bhttp\.sslVerify\s+false\b/i,
  ]],
  ['starts a server', [
    // a module's createServer, or a listen on a port - not a search for the word
    /\b(?:https?|http2|net|tls)\.createServer\s*\(|\.listen\s*\(\s*\d/,
  ]],
];

// [{ kind, what }] for a shell command; empty when nothing reads as a change.
function marks(command) {
  if (typeof command !== 'string' || !command) return [];
  const out = [];
  for (const [kind, res] of MARKS) {
    if (res.some((re) => re.test(command))) out.push({ kind, what: command.replace(/\s+/g, ' ').trim().slice(0, 120) });
  }
  return out;
}

// Absolute paths a command spells out, as an agent writes them on either host.
const PATH_IN_TEXT = /(?:^|[\s"'`=(])((?:[A-Za-z]:[\\/]|\\\\|\/(?:[a-z]\/|home\/|Users\/|etc\/|tmp\/|var\/|root\/|opt\/))[^\s"'`;|&<>*?]*)/g;

function norm(p) {
  let s = String(p).trim().replace(/^["'`]|["'`]$/g, '');
  const m = s.match(/^\/([a-z])\/(.*)$/i); // Git Bash /c/Users -> C:\Users
  if (m && process.platform === 'win32') s = `${m[1]}:\\${m[2]}`;
  s = path.resolve(s);
  return process.platform === 'win32' ? s.toLowerCase() : s;
}

function inside(p, root) {
  const r = norm(root);
  const sep = process.platform === 'win32' ? '\\' : '/';
  return p === r || p.startsWith(r.endsWith(sep) ? r : r + sep);
}

/*
 * The paths outside `cwd` that a tool call names: its path fields, and for a
 * shell command the absolute paths in its text. `own` are further roots that
 * belong to the session (the plugin's own directory, the host's config).
 */
function outside(toolInput, cwd, own) {
  if (!cwd || !toolInput || typeof toolInput !== 'object') return [];
  const roots = [cwd].concat(own || []).filter(Boolean);
  const out = new Set();
  const check = (raw) => {
    if (typeof raw !== 'string' || !raw) return;
    if (!path.isAbsolute(raw) && !/^\/[a-z]\//i.test(raw)) return;
    let p;
    try { p = norm(raw); } catch (_) { return; }
    if (roots.some((r) => inside(p, r))) return;
    out.add(raw.slice(0, 200));
  };
  for (const k of ['file_path', 'path', 'target_file', 'target_directory', 'targetDirectory', 'directory', 'notebook_path', 'relative_workspace_path']) check(toolInput[k]);
  if (typeof toolInput.command === 'string') {
    for (const m of toolInput.command.matchAll(PATH_IN_TEXT)) check(m[1]);
  }
  return [...out].slice(0, 8);
}

module.exports = { marks, outside, MARKS };
