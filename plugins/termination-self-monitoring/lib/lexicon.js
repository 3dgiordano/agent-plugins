'use strict';
/*
 * Scans an assistant message for state-shaped reasons to stop, defer, narrow
 * or soften -- the persona artifacts a model inherits from its training data
 * (fatigue, a clock, a context budget it does not manage, confidence as a
 * feeling, difficulty as a mood, a run of apologies) -- and for the
 * [TERMINATION CHECK] block the skill asks for when one of them is used.
 *
 * The scan is deliberately narrow and first-person anchored: "I'm running out
 * of context" is a hit, "the user asked to continue tomorrow" is not. Fenced
 * code, inline code and quoted lines are stripped first, so a message that
 * documents or quotes these phrases is not judged for using them.
 *
 * A hit is a signal, not a verdict: the hook only asks the agent to replace
 * the phrase with a checkable reason, or to continue.
 */

const CATEGORIES = [
  {
    kind: 'budget', // fatigue, clock, context budget - limits the agent does not manage
    re: [
      /\b(?:I(?:'m| am)|we(?:'re| are))\s+(?:running|about to run|going to run)\s+(?:out of|low on)\s+(?:context|tokens?|time|budget|space|room)\b/i,
      /\b(?:my|the)\s+context\s+(?:window|budget|limit)\s+(?:is|was|will be)\s+(?:nearly |almost |getting |quite |very )?(?:full|exhausted|limited|tight|running out|used up)\b/i,
      // duration of the *exchange* (session, conversation, day), not the size of the *work* -
      // "this is a large task" is scoping, and a legitimate thing to say before starting
      /\b(?:this|it)\s+(?:has been|is)\s+(?:a\s+)?(?:long|lengthy|extended)\s+(?:session|conversation|day)\b/i,
      /\b(?:end of|late in|deep into)\s+(?:a\s+)?(?:long\s+)?(?:session|day|conversation)\b/i,
      /\bI(?:'ve| have)\s+been\s+(?:at|on|working on)\s+this\s+(?:for\s+)?(?:a while|a long time|too long|hours)\b/i,
      /\b(?:let(?:'s| us)|we can|we could|I(?:'ll| will|'d| would)(?: suggest)?)\s+(?:pick|take)\s+(?:this|it|that)\s+up\s+(?:later|tomorrow|next time|in (?:a|another|the next) (?:new |fresh )?(?:session|conversation|turn))\b/i,
      /\b(?:let(?:'s| us)|we\s+(?:can|could|should)|I(?:'ll| will|'d| would| can| could)(?:\s+(?:suggest|recommend|propose))?)\s+(?:we\s+|you\s+)?(?:continue|resume|revisit|finish|do|handle)\s+(?:this|it|that|the rest)?\s*(?:later|tomorrow|in (?:a|another) (?:new|fresh|separate|future) (?:session|conversation|context))\b/i,
      /\b(?:let(?:'s| us)|we\s+(?:can|could|should)|I(?:'ll| will|'d| would| can| could)(?:\s+(?:suggest|recommend|propose))?)\s+(?:we\s+|you\s+)?(?:start|continue|resume)\s+(?:this\s+|it\s+)?(?:in|with|from)\s+a\s+(?:new|fresh|clean)\s+(?:session|context|conversation)\b/i,
      /\b(?:due to|given|because of|under)\s+(?:the\s+)?(?:time|context|length|token)\s+(?:constraints?|limits?|pressure|budget)\b/i,

      // Deferring the WORK to a later session. First-person anchored, and the
      // destination must be a session-shaped thing: "I'll defer the rest to a
      // follow-up session" is the artifact, "Deferring the docs to the owner"
      // is a real disposition and must not match.
      /\b(?:I(?:'ll| will|'d| would|'m going to| am going to)|we(?:'ll| will))\s+(?:defer|postpone|leave|save|push)\s+(?:[^.!?]{0,40}?\s+)?(?:to|for|until)\s+(?:a\s+|the\s+)?(?:follow[- ]?up|later|another|future|separate|next|new|fresh)\s+(?:session|turn|conversation|pass|round|time|PR|change)\b/i,

      // Approaching a limit the agent does not manage. The pattern above it
      // needs a copula ("the context window IS full"); this one catches the
      // far commoner progressive form.
      /\b(?:I(?:'m| am)|we(?:'re| are))\s+(?:approaching|nearing|close to|hitting|running up against|bumping\s+(?:up\s+)?against)\s+(?:the\s+|my\s+|our\s+)?(?:context|token|time|budget)\s+(?:limit|window|budget|cap|ceiling)\b/i,

      // The budget offered as the reason for narrowing the delivery.
      // "to save context FOR THE READER" is a writing choice, not a stop, so
      // the narrowing has to be about the agent's own budget.
      /\b(?:to|in order to)\s+(?:conserve|save|preserve|stay\s+within|avoid\s+(?:using|burning))\s+(?:the\s+|my\s+)?(?:context|tokens?|budget)\b(?!\s+for\s+(?:the\s+reader|the\s+user|you\b|clarity|readability))/i,
      // Deliberately NOT "budget": "I've used most of the budget you allocated"
      // is a project budget the owner set, which is a checkable reason.
      /\bI(?:'ve| have)\s+(?:used|consumed|burned|spent|gone\s+through)\s+(?:up\s+)?(?:a\s+lot\s+of|much|most\s+of|quite\s+a\s+bit\s+of|a\s+good\s+deal\s+of|significant)\s+(?:the\s+|my\s+)?(?:context|tokens?)\b/i,
      /\b(?:given|considering|because\s+of|due\s+to)\s+how\s+(?:much|long)\s+(?:context|time|tokens?)\s+(?:this|it|that|we|I)\s+(?:has|have|'ve)?\s*(?:used|taken|consumed|spent)\b/i,

      // A clock the agent does not have. Scoped to this|it so that "the build
      // is taking too long" - an observation about a process - stays out.
      /\b(?:this|it)\s+(?:is|has been|'s)\s+(?:been\s+)?taking\s+(?:too\s+long|far\s+too\s+long|longer\s+than\s+(?:expected|I\s+expected|it\s+should))\b/i,
    ],
  },
  {
    kind: 'confidence', // confidence as a feeling, not as a measured status
    re: [
      /\bI(?:'m| am)\s+not\s+(?:entirely|fully|completely|quite|totally|100%|really|very)?\s*(?:confident|sure|certain)\s+enough\b/i,
      /\bI\s+(?:don't|do not|didn't|did not)\s+feel\s+(?:confident|comfortable|sure|certain|safe)\b/i,
      /\bI(?:'m| am)\s+(?:hesitant|reluctant|uncomfortable|uneasy|nervous|worried|afraid)\s+(?:to|about)\b/i,
      // about the *code* ("rather not touch the scheduler"), not about an *attempt* -
      // "I'd rather not try the same flag again" is the switch decision persistence asks for
      /\bI(?:'d| would)\s+(?:rather|prefer)\s+not\s+(?:to\s+)?(?:risk|touch|change|modify)\b/i,
      /\b(?:without|lacking)\s+(?:more|enough|sufficient)\s+confidence\b/i,
    ],
  },
  {
    kind: 'complexity', // difficulty offered as the reason, with no checkable content
    re: [
      /\b(?:given|due to|because of|considering)\s+(?:the|its|their|this)\s+(?:sheer\s+)?(?:complexity|scale|size|scope|difficulty)\b/i,
      /\b(?:this|that|it)\s+(?:is|would be|seems|looks|feels)\s+(?:too|quite|very|rather|pretty)\s+(?:complex|complicated|large|big|involved|risky|ambitious|hard|difficult)\s+(?:to|for)\s+(?:do|tackle|handle|address|attempt|take on|cover|finish)\s+(?:now|here|in this|in one|right now|at this point|in a single)\b/i,
      /\b(?:beyond|outside|out of)\s+(?:the\s+)?scope\s+(?:of|for)\s+(?:this|the current|a single|one)\s+(?:turn|response|session|pass|message|conversation)\b/i,
    ],
  },
];

// Apologies and self-criticism: one is a sentence, a run is a mood.
const APOLOGY_RE = /\b(?:I\s+apologi[sz]e|my\s+apologies|(?:I(?:'m| am)\s+)?(?:so\s+|very\s+|really\s+|terribly\s+)?sorry|my\s+(?:mistake|bad|error)|I\s+should\s+have|I\s+was\s+wrong|I\s+messed\s+up|I\s+failed\s+to)\b/gi;
const APOLOGY_RUN = 3;

// The block the skill asks for. Same conventions as the epistemic closure
// block: marker alone on its line, one field per line, template placeholders
// count as empty.
/*
 * The marker owns its line, but an agent writing markdown decorates it -
 * `**[X]**`, `## [X]`, a trailing colon. Those are the same block, and
 * refusing them meant a correctly closed turn read as no block at all:
 * a retrospective for a ledger that was written, and under a strict gate,
 * a blocked stop. Backticks stay out of the allowed set, so an inline-code
 * mention is still documentation rather than a closure.
 */
const BLOCK_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[TERMINATION CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$(?:\n[ \t]*(?=\n))?([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[TERMINATION CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$|(?![\s\S]))/gm;
const REASONS = ['gate-not-run', 'owner-choice', 'budget-spent', 'limit-observed', 'none'];

// Emphasis around the field name, with the colon inside it or outside - see
// the note in handoff's lib/handoff.js. `- **Reason:** none` parsed as a field
// that was present and empty, which reads as a block with nothing in it.
const EM = '(?:\\*\\*|__|\\*|_)?';
const unemphasise = (s) => s.replace(/^(\*\*|__|\*|_)([\s\S]*)\1$/, '$2').trim();

function field(block, name) {
  const re = new RegExp('^[ \t]*[-*]?[ \t]*' + EM + name + EM + '[ \t]*:' + EM + '[ \t]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = unemphasise(m[1].trim());
  if (!v || /^<.*>$/.test(v) || /^(n\/a|tbd|-|\?)$/i.test(v)) return '';
  return v;
}

// Remove what must not be judged: fenced code, inline code, quoted lines.
function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n');
}

/*
 * scan(text) -> {
 *   hits:       [{kind, phrase}]   state-shaped reasons found in the prose
 *   apologies:  n                  apology / self-criticism phrases counted
 *   blocks:     n                  [TERMINATION CHECK] blocks found
 *   violations: [string]           what the skill asks for and did not get
 * }
 */
/*
 * What BLOCK_RE must not read: a fenced example of the block. Showing the
 * format is what documentation and an instruction that teaches it both do, and
 * counting that as a declared block produced violations about a template - a
 * blocked stop, under a strict gate, for explaining the format.
 *
 * Fenced content is blanked character by character with the newlines kept, so
 * the line-anchored pattern below still sees lines and the markers on them are
 * gone. prose() above already does this for the phrase-level scan; this is the
 * same rule applied to the block scan.
 */
function unfenced(text) {
  return text.replace(/```[\s\S]*?```/g, (f) => f.replace(/[^\n]/g, ' '));
}

function scan(text) {
  const out = { hits: [], apologies: 0, blocks: 0, violations: [] };
  if (typeof text !== 'string' || !text) return out;
  const body = prose(text);

  for (const cat of CATEGORIES) {
    for (const re of cat.re) {
      const m = body.match(re);
      if (m) { out.hits.push({ kind: cat.kind, phrase: m[0].replace(/\s+/g, ' ').slice(0, 80) }); break; }
    }
  }
  out.apologies = (body.match(APOLOGY_RE) || []).length;

  let m;
  while ((m = BLOCK_RE.exec(unfenced(text))) !== null) {
    out.blocks += 1;
    const b = m[1];
    // A full stop after the value is punctuation, not a qualifier: `Reason: none.`
    // is `none`. Measured on Codex, where a correct block scored as malformed for it.
    const reason = (field(b, 'Reason') || '').toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-').slice(0, 80);
    // exact, or the reason followed by a qualifier ("gate-not-run (npm test)", "limit-observed: ENOSPC"); `none` takes none
    // A qualifier may follow the token after any punctuation, comma included:
    // measured on the executive scanner, where the missing comma scored two
    // correct blocks of three as malformed. Same defect, fixed before it bites.
    const known = REASONS.find((r) => reason === r || (r !== 'none' && reason.startsWith(r) && /^[-—–,;:([]/.test(reason.slice(r.length))));
    const evidence = field(b, 'Evidence');
    const decision = (field(b, 'Decision') || '').toLowerCase().replace(/\.$/, '').slice(0, 80);
    if (!known) out.violations.push(`Reason must be one of ${REASONS.join(' | ')}, got "${reason || '(empty)'}"`);
    else if (known !== 'none' && !evidence) out.violations.push(`Reason is ${known} but Evidence is empty - what was observed, and by which tool/command?`);
    else if (known === 'none' && decision && !/^continue/.test(decision)) out.violations.push(`Reason is none but Decision is "${decision}" - with no checkable reason, the decision is continue`);
    if (!decision) out.violations.push('no Decision (continue | stop | ask owner)');
  }

  if (out.hits.length && !out.blocks) {
    out.violations.unshift('a state-shaped reason (' + out.hits.map((h) => `${h.kind}: "${h.phrase}"`).join('; ') +
      ') with no [TERMINATION CHECK] block - name the checkable reason or continue');
  }
  if (out.apologies >= APOLOGY_RUN) {
    out.violations.push(`${out.apologies} apology / self-criticism phrases in one message - one sentence each: what was wrong, the correct reading, the check that would have caught it; then continue`);
  }
  return out;
}

module.exports = { scan, REASONS, APOLOGY_RUN };
