# poster-wall

Pieces for the office poster wall, drawn as SVG in `art/`.

- `reference/` holds a photograph of each original.
- `node tools/render.js <piece.svg> <out.png>` draws an SVG into a PNG.
- `node tools/compare.js <piece.svg>` renders a piece beside its original and
  prints how close the shapes, light and colour are (0 to 1), and writes
  `<piece>.render.png` next to it.

The renderer draws rect, circle, ellipse, line, polyline, polygon and path,
with fills, strokes, opacity, transforms and groups; gradients come out as the
average of their stops. Text, images and filters are not drawn.
