'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const { LEDGER, MAX_OPEN_ITEMS, MAX_LINES, MAX_BYTES, ageText } = require('./ledger.js');

const SKILL = 'progress-self-monitoring';
const PROTOCOL = `Load the ${SKILL} skill if it is not already loaded ("Core Protocol").`;

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

// What a session opens on when the ledger has something in it. Counts, the
// path, and the Next line (see ledger.js nextLine); no other text of the file.
// "Carry each item into this session or close it" read, on Composer 2.5, as
// "leave each item as it is": the run opened the ledger, saw the block lifted
// and the owner's decision, and added only the field it was asked for. The
// sentence now says which items are work and which stay.
function status(ins) {
  const n = ins.open;
  return `[progress self-monitoring] \`${LEDGER}\` has ${n} open item${n === 1 ? '' : 's'}, updated ` +
    `${ageText(ins.ageMs)}. Re-open it before substantive work: it is the record of what the last ` +
    `session left blocked or returned.${ins.next ? ` Its Next line: "${ins.next}"` : ''} What Next names is work ` +
    'for this session, alongside the request: an item whose block has lifted, do it and remove it; one still ' +
    `blocked or returned stays as it is. Keep Updated and Next current.${bloat(ins)} ${PROTOCOL}`;
}

/*
 * The ledger is closed by removal, and a ledger nobody prunes grows into the
 * thing it was meant to replace: a history the next session reads around.
 * One clause, with the number, when a cap is crossed.
 */
function bloat(ins) {
  const b = ins.bloated || [];
  if (!b.length) return '';
  const what = [];
  if (b.includes('open')) what.push(`${ins.open} open items (more than ${MAX_OPEN_ITEMS} is a backlog, not residue)`);
  if (b.includes('lines')) what.push(`${ins.lines} lines (a ledger is a page: under ${MAX_LINES})`);
  if (b.includes('bytes')) what.push(`${Math.round(ins.bytes / 1024)} KB (the hook reads the first ${MAX_BYTES / 1024})`);
  return ` It has grown: ${what.join('; ')}. Closed items are removed, not marked - drop what is done, ` +
    'fold what is stale into one line with its reason, and leave Updated, Plan, ## Open and Next.';
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

/*
 * The sweep. The question a person asks themselves before closing - is there
 * anything I am forgetting? - with the only inventory the agent cannot re-read
 * attached to it: what it wrote it would do. Quoted, so the answer is about
 * that line and not about the feeling of having covered everything.
 */
function sweep(items, turn) {
  const lines = items.map((c) => {
    const ago = turn - c.turn;
    return `${ago} turn${ago === 1 ? '' : 's'} ago you wrote: "${c.text}"`;
  });
  return `[progress self-monitoring] ${lines.join('; ')}. What you said you would do is the one list you ` +
    `cannot re-read: for each, say done, or put it in \`${LEDGER}\` as blocked or returned with the reason, ` +
    `or drop it and say why. ${PROTOCOL}`;
}

module.exports = { LOAD, status, retrospective, spanning, sweep };
