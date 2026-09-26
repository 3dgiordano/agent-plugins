'use strict';
/*
 * Directories that belong to the session and are not "outside the project":
 * the plugin's own install and the hosts' config under the home directory.
 */
const os = require('os');
const path = require('path');

function ownRoots() {
  const home = os.homedir();
  return [process.env.CLAUDE_PLUGIN_ROOT, path.join(home, '.claude'), path.join(home, '.cursor'), path.join(home, '.codex'), path.resolve(__dirname, '..')].filter(Boolean);
}

module.exports = { ownRoots };
