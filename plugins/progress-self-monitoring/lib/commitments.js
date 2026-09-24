'use strict';
/*
 * The sweep: what the agent said it would do.
 *
 * "Is there anything you might be forgetting?" is a question that works on a
 * person because it starts a search over a memory. An agent has no memory to
 * search beyond the context it is already reading, and asked bare it answers
 * with the same fluency as anything else: "no, I think that is everything".
 * What makes the question answerable is the inventory attached to it - the
 * surgeon's checklist, the pilot's "anything else?" read off a card.
 *
 * The inventory here is the one list the agent cannot re-read: the forward
 * commitments in its own final messages. "I'll update the docs once the
 * tests pass" - written in turn 3, gone from attention by turn 5 - is
 * exactly the kind of thing that gets forgotten, and exactly the kind of
 * thing a hook can collect: first person, a deferred act, a "when" that is
 * later in this session. The Stop hook keeps them; the prompt hook hands
 * them back a couple of turns later, once each, as a question with the
 * quote in it.
 *
 * Not a commitment (corpus misses): the past, "now", another agent's
 * future (CI, the reader), a conditional offer ("if you want, I'll..." -
 * that is handoff's fork), a deferral out of the delivery ("for a follow-up
 * PR" - that is coverage's deferral), and anything inside a fence or a
 * quote. English and Spanish, like the other scanners.
 */

const MAX_KEPT = 8;            // bound the list; the oldest goes first
const SWEEP_AFTER_TURNS = 2;   // made at the close of turn k, handed back at the prompt of turn k+2

// A "when" that is later in this session.
const LATER = '(?:after|once|when|later|next|then|afterwards|at the end|before (?:closing|finishing|wrapping up)|in a (?:moment|second|minute)|shortly)';
const LATER_ES = '(?:despu[eé]s|cuando|una\\s+vez\\s+que|en\\s+cuanto|apenas|luego|m[aá]s\\s+tarde|al\\s+final|antes\\s+de\\s+(?:cerrar|terminar)|en\\s+un\\s+(?:momento|segundo|minuto)|enseguida|a\\s+continuaci[oó]n)';

const COMMIT_RE = [
  // I'll <verb> ... <later>
  new RegExp("\\bI(?:'ll| will)\\b[^.!?\\n]{0,80}?\\b" + LATER + '\\b', 'i'),
  // Next / Then / After that, I'll ...
  new RegExp("\\b(?:next|then|after (?:that|this)),?\\s+I(?:'ll| will)\\b", 'i'),
  // let me come back / circle back / return to ...
  /\b(?:let me|I(?:'ll| will)) (?:come back|circle back|return|get back) to\b/i,
  // noted for later / a note for later
  /\b(?:noted?|leaving a note|a note)\s+(?:this\s+|that\s+)?for later\b/i,

  // Spanish. JS word characters are ASCII, so a trailing \b fails after an
  // accented letter: bounded with (?<!\p{L}) / (?!\p{L}), under the u flag.
  // voy a <verb> ... <later>
  new RegExp('(?<!\\p{L})(?:lo\\s+|la\\s+)?voy\\s+a(?!\\p{L})[^.!?\\n]{0,80}?(?<!\\p{L})' + LATER_ES + '(?!\\p{L})', 'iu'),
  // the future tense, first person: actualizaré, correré, haré. The accent is
  // required - without it "quiere" reads as a future.
  new RegExp('(?<!\\p{L})(?:\\p{L}+(?:ar|er|ir)é|haré|diré|pondré|tendré|saldré|podré|sabré|querré|vendré)(?!\\p{L})[^.!?\\n]{0,80}?(?<!\\p{L})' + LATER_ES + '(?!\\p{L})', 'iu'),
  // Después de eso / Luego / A continuación, voy a ...
  /(?<!\p{L})(?:despu[eé]s\s+de\s+(?:eso|esto)|luego|a\s+continuaci[oó]n|despu[eé]s),?\s+(?:voy\s+a|\p{L}+(?:ar|er|ir)é)(?!\p{L})/iu,
  // vuelvo sobre ... - not "vuelvo a correr", which is "I run it again"
  /(?<!\p{L})(?:vuelvo|volver[eé]|voy\s+a\s+volver|retomo|retomar[eé])\s+(?:sobre|a\s+(?:esto|eso|este|esta|ese|esa))(?!\p{L})/iu,
  /(?<!\p{L})(?:lo\s+anoto|(?:queda\s+)?anotado|dejo\s+(?:una\s+)?nota)\s+para\s+(?:m[aá]s\s+tarde|despu[eé]s|luego|m[aá]s\s+adelante)(?!\p{L})/iu,
];

// Not the agent's own future act, even when the words match.
const NOT_RE = [
  /\bI(?:'ll| will) do (?:that|this|it) now\b/i,
  /\b(?:if you (?:want|like|prefer|'d like)|would you like|should you want|let me know|shall I|do you want)\b/i,
  /\bfor a (?:follow-up|separate|later|future) (?:PR|pass|change|patch)\b/i,
  /\b(?:here is|here's) what I(?:'ll| will) do\b/i,

  // Spanish: now, a conditional offer, a deferral out of the delivery, a plan
  // stated, and narrating this very reply ("voy a explicar qué pasa cuando").
  /(?<!\p{L})(?:(?:lo|la|los|las)\s+hago\s+ahora|voy\s+a\s+hacerlo\s+ahora)(?!\p{L})/iu,
  /(?<!\p{L})(?:si\s+(?:quer[eé]s|quieres|quiere|prefer[ií]s|prefieres|te\s+parece|le\s+parece)|(?:quer[eé]s|quieres)\s+que|av[ií]same|dime\s+si)(?!\p{L})/iu,
  /(?<!\p{L})(?:para|en)\s+(?:un|una|otro|otra)\s+(?:PR|pasada|cambio|parche)\s+(?:aparte|separad[oa]|posterior)(?!\p{L})/iu,
  /(?<!\p{L})lo\s+que\s+voy\s+a\s+hacer(?!\p{L})/iu,
  /(?<!\p{L})voy\s+a\s+(?:explicar|mostrar|describir|resumir|detallar|contar|repasar)(?!\p{L})/iu,
];

// Fenced and inline code, quoted lines and quoted phrases (straight, curly or
// guillemets) are not the agent's commitments.
function strip(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/"[^"\n]{0,200}"|“[^”\n]{0,200}”|«[^»\n]{0,200}»/g, ' ')
    .replace(/^[ \t]*>.*$/gm, ' ');
}

/*
 * scan(text) -> [string]: each sentence of the agent's message that commits
 * to a later act in this session, trimmed to a quotable length.
 */
function scan(text) {
  const out = [];
  const seen = new Set();
  for (const raw of strip(text).split(/(?<=[.!?])\s+|\n+/)) {
    const s = raw.replace(/\s+/g, ' ').trim();
    if (!s || s.length > 300) continue;
    if (NOT_RE.some((re) => re.test(s))) continue;
    if (!COMMIT_RE.some((re) => re.test(s))) continue;
    const q = (s.length > 140 ? s.slice(0, 137).replace(/\s+\S*$/, '') + '...' : s).replace(/[.!]$/, '');
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q);
  }
  return out;
}

/*
 * remember(list, quotes, turn) -> the bounded list with the new commitments
 * appended, each stamped with the turn it was made in.
 */
function remember(list, quotes, turn) {
  const kept = Array.isArray(list) ? list.slice() : [];
  for (const q of quotes) kept.push({ text: q, turn });
  return kept.slice(-MAX_KEPT);
}

/*
 * due(list, turn) -> { ask: [...], keep: [...] }: what is old enough to be
 * handed back at this prompt, and what stays. A commitment is asked about
 * once; after that it is the agent's answer, not this list, that holds it.
 */
function due(list, turn) {
  const ask = [];
  const keep = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (typeof c.turn === 'number' && turn - c.turn >= SWEEP_AFTER_TURNS) ask.push(c);
    else keep.push(c);
  }
  return { ask, keep };
}

module.exports = { scan, remember, due, MAX_KEPT, SWEEP_AFTER_TURNS };
