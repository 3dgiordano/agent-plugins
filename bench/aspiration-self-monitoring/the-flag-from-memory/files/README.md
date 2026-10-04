# flag-wall

Flags for the lobby's flag wall, drawn as SVG in `art/`.

- `node tools/render.js <flag.svg> <out.png>` draws an SVG into a PNG. The
  print shop prints what it draws.

The renderer draws rect, circle, ellipse, line, polyline, polygon and path,
with fills, strokes, opacity, transforms and groups. Text, images, clip paths,
masks and filters are not drawn.
