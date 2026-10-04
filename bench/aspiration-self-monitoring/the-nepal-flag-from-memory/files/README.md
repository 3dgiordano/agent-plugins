# flag-wall

Flags for the lobby's flag wall, drawn as SVG in `art/`.

- `node tools/render.js <flag.svg> <out.png>` draws an SVG into a PNG. The
  print shop prints what it draws.

The renderer draws rect, circle, ellipse, line, polyline, polygon and path,
with fills, strokes, opacity, transforms and groups. Strokes are drawn with
square ends and no joins. Text, images, `use`, clip paths, masks and filters
are not drawn.
