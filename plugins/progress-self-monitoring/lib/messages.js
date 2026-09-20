'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const { LEDGER, ageText } = require('./ledger.js');

const SKILL = 'progress-self-monitoring';
const PROTOCOL = `(${SKILL} skill, "Core Protocol")`;

/*
 * The load message names the ledger's shape - the file, its sections, the two
 * open states - and points at the skill for the rules. Same reasoning as the
 * other five (see coverage's lib/messages.js): the agent will not fetch the
 * skill, so what the hooks later read off the disk has to be in the message.
 *
 * What this one does NOT ask for is a block in the reply. The ledger is the
 * block. A copy in the message would be written into the one place a session
 * boundary drops.
 */
const LOAD =
  `[progress self-monitoring] This session keeps what must outlive it in \`${LEDGER}\` - the ledger ` +
  'the next session re-opens: Updated, Plan, ## Open (blocked | returned, each with its reason), Next. ' +
  'When a turn leaves work blocked or returned that a later session must not lose, write or update it; ' +
  'when it has open items, re-open it before substantive work. ' +
  `Load the ${SKILL} skill if it is not already loaded for the rules. Not a blocker.`;

// What a session opens on when the ledger has something in it. Counts and the
// path only: the file's text never travels through a hook.
function status(ins) {
  const n = ins.open;
  return `[progress self-monitoring] \`${LEDGER}\` has ${n} open item${n === 1 ? '' : 's'}, updated ` +
    `${ageText(ins.ageMs)}. Re-open it before substantive work: it is the record of what the last ` +
    'session left blocked or returned. Carry each item into this session or close it, and keep ' +
    `Updated and Next current. ${PROTOCOL}`;
}

// Delivered on the prompt after a turn that edited files and left the ledger
// as it was. One line, once per ledger version.
function retrospective(p) {
  const files = `${p.edits} file edit${p.edits === 1 ? '' : 's'}`;
  const items = `${p.open} open item${p.open === 1 ? '' : 's'}`;
  return `[progress self-monitoring] Your previous turn made ${files} and left \`${LEDGER}\` untouched ` +
    `with ${items}. If that work moved an open item, close or update it now; if it left new residue, ` +
    `add it under ## Open with the reason; otherwise say the ledger is current. ${PROTOCOL}`;
}

/*
 * The owner said the work continues in a later session. Measured before this
 * existed: the load message alone had two of three runs describe the residue
 * in the reply and write nothing. The nudge names the file and the three
 * things it holds; the rest is the skill's.
 */
function spanning() {
  return '[progress self-monitoring] The request says this work continues in a later session. What this turn ' +
    `leaves blocked or returned - with the observed reason - and the next action go in \`${LEDGER}\` ` +
    `(## Open, Next, Updated) before you close: the reply is what that session will not have. ${PROTOCOL}`;
}

module.exports = { LOAD, status, retrospective, spanning };
