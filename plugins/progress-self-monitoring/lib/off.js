'use strict';
/*
 * The off switch. With PROGRESSMON_OFF=1 (or true, yes, on) every hook of this plugin
 * returns on its first line: nothing else is loaded, nothing is read or
 * written, nothing is said - to the agent or to the user. Set it where the
 * host starts its hooks: for one project on Claude Code, the `env` block of
 * the project's .claude/settings.json; anywhere, the environment the host is
 * started from. Unset, the plugin works as installed. Uninstalling is the
 * host's own command (README, "Turn a plugin off").
 *
 * Only the variable's name differs between plugins (a test keeps the rest of
 * the copies identical).
 */

const VAR = 'PROGRESSMON_OFF';

function off(env) {
  return /^(?:1|true|yes|on)$/i.test(String((env || process.env)[VAR] || '').trim());
}

module.exports = { off, VAR };
