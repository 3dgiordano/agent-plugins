'use strict';
/*
 * Did a shell output look like a failure?
 *
 * The naive test - the words "error" or "failed" anywhere - counts every green
 * suite as a failure: Jest writes "Tests: 5 passed, 0 failed", pytest writes
 * "0 failed", a grep for "error handling" prints the word. So the rules here
 * are line-based and each one names a real failure shape; a bare "error" or
 * "failed" is never enough.
 *
 * (Deliberately a per-plugin copy: each plugin installs on its own.)
 */

const FAIL_LINE_RES = [
  // "Exit code 1", "exited with status 2", "exited with 1". The bare number
  // needs the "with": a plain "exit 1" is what a shell script or a help text
  // prints, not what a failing run reports.
  /\bexit(?:ed)?\s+with\s+(?:(?:code|status)\s*[:=]?\s*)?[1-9]\d*\b|\bexit(?:ed)?\s+(?:code|status)\s*[:=]?\s*[1-9]\d*\b/i,
  /^\s*traceback \(most recent call last\)/i,                          // Python
  /\bfatal(?: error)?:/i,                                              // git, gcc, ld
  /\bpanic:/,                                                          // Go, Rust
  /\bsegmentation fault\b/i,
  /\b[1-9]\d*\s+(?:failed|failures?|errors?)\b/i,                      // "1 failed", "3 errors" - not "0 failed"
  /^\s*(?:npm\s+)?ERR!/,                                               // npm
  /^\s*make(?:\[\d+\])?:\s+\*\*\*/,                                    // "make: *** [all] Error 2"
  /^\s*(?:FAIL(?:ED|URE)?)\b/,                                         // pytest "FAILED test_x", Jest/Go "FAIL src/x"
  // "TypeError: x", "java.lang.NullPointerException: y", and the same with a
  // file:line[:col] prefix - "a.js:12: TypeError: x", "src/a.js:3:9: SyntaxError: y" -
  // which is the commonest JS/TS shape and the one the bare line-start rule missed.
  // Case-sensitive on purpose: ERROR_IN_FLIGHT is an identifier, not an error.
  /^\s*(?:[\w./\\~-]+:\d+(?::\d+)?\s*[-:]\s*)?[\w.$]*(?:Error|Exception)\b\s*[:(\[]/,
  /^\s*Exception\s+in\s+thread\b/,                                     // Java
  /^\s*ERROR\s+in\s+\.?[\w./\\-]*\.\w+/,                               // webpack: "ERROR in ./src/index.js"
  // Maven, Gradle, log4j. The lookahead keeps prose ABOUT the prefix out:
  // "[ERROR] is how log4j marks a line" is documentation, not a failure.
  /^\s*\[(?:ERROR|FATAL)\]\s+(?!(?:is|are|was|were|means|indicates|shows|denotes)\b)\S/,
  // Rust ("panic:" above is Go). Needs the location or the quoted message that
  // a real panic carries, so prose naming the phrase does not match.
  /\bpanicked\s+at\s+(?:['"]|[\w./\\-]+[:.]\d)/i,
  /^\s*error(?:\[[A-Z0-9]+\])?(?:\s+TS\d+)?:/i,                        // "error: x", "error TS2345:", "error[E0308]:"
  /\b(?:error|errors|ERROR)(?:\s+TS\d+)?:\s+\S/,                       // "gcc: error: expected ';'", "a.ts(3,5): error TS2345: x", "ERROR: build failed" (mid-line, but needs the colon)
  /\bAssertionError\b|\bassert(?:ion)? failed\b/i,
  /\bcommand not found\b|\bno such file or directory\b|\bpermission denied\b/i,
];

// What the host hands us: a string, or an object whose stdout/stderr carry the
// text. Stringifying the object would escape the newlines and defeat every
// line-anchored rule, so pull the text fields out first.
function outputText(o) {
  if (typeof o === 'string') return o;
  if (o && typeof o === 'object') {
    const parts = [];
    for (const k of ['stdout', 'stderr', 'output', 'result', 'content', 'text', 'error']) {
      if (typeof o[k] === 'string' && o[k]) parts.push(o[k]);
    }
    if (parts.length) return parts.join('\n');
    try { return JSON.stringify(o); } catch (_) { return ''; }
  }
  return '';
}

// The first line that matches a failure rule, or null.
function failureLine(text) {
  if (typeof text !== 'string' || !text) return null;
  for (const line of text.split(/\r?\n/)) {
    if (FAIL_LINE_RES.some((re) => re.test(line))) return line;
  }
  return null;
}

function looksFailed(text) {
  return failureLine(text) !== null;
}

// A stable-ish signature for an error: the failing line with numbers, hex ids
// and absolute paths blanked out, so retries that differ only in a line number
// or a temp path still count as "the same error".
function errorSignature(text) {
  const line = failureLine(text);
  if (!line) return null;
  return line.replace(/0x[0-9a-f]+/gi, '#').replace(/\d+/g, '#').replace(/([A-Za-z]:)?[\\/][^\s:'"]+/g, '<path>').trim().slice(0, 160);
}

module.exports = { outputText, failureLine, looksFailed, errorSignature };
