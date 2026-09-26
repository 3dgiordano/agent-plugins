# Brand assets

| File | Use |
|------|-----|
| `logo.svg` | The collection mascot: a thinking bot whose face is ringed by the three checkpoints. README, avatar, anywhere there is room for a character. |
| `social-preview.svg` / `.png` | 1280×640 card for GitHub's social preview (Settings → Social preview) and link unfurls. Regenerate the PNG from the SVG after editing (`msedge --headless=new --window-size=1280,640 --screenshot=... social-preview.svg` or any SVG rasterizer). |
| `plugins/<name>/assets/logo.svg` | Each plugin's mark — an open loop (the agent's cycle, with the gap where the nudge enters) around the plugin's glyph — referenced from its Cursor manifest. |

The glyphs: executive — a dot (the goal); epistemic — a check (verified);
persistence — a retry arrow; termination — a halmos ∎, the end-of-proof mark
(a stop that has been justified); coverage — a three-line ledger with the
longest line, the hard part, in green; handoff — an arrow reaching a receiving
bar, the turn handed to its reader; progress — a page with its corner folded
down, the place the next session opens to; integrity — a plumb line, a result
that is true rather than only level-looking.

Palette: ink `#1F2933` · executive `#E8A33D` · epistemic `#3B82F6` · persistence `#E4573D` · termination `#7C3AED` · coverage `#16A34A` · handoff `#0891B2` · progress `#D97706` · integrity `#DB2777` · plate `#F4F6F9` (`#E2E8F0` on dark).

The ring's three gaps are the first three questions; the top gap is where a fourth
plugin would not go — the mascot stays as it is, and a new plugin gets its own
loop mark like the others. The social preview lists every plugin's question with
its mark; a new plugin adds a row there, and the PNG is regenerated.
