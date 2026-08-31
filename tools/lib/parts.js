// Shorthand for describing a product as a list of placed primitives.

export const cm = (n) => n / 100;   // published dims are cm, glTF is metres

const box = (mat, pos, size, rot) => ({ shape: "box", mat, pos, size, rot });
const cyl = (mat, pos, size, rot) => ({ shape: "cyl", mat, pos, size, rot });
const ball = (mat, pos, d) => ({ shape: "sphere", mat, pos, size: [d, d, d] });
const ring = (mat, pos, d, rot) => ({ shape: "torus", mat, pos, size: [d, d, d], rot });

// 3x3 grid grooves centred on a face
function ttGrid(y, span, t) {
  const h = span / 6;
  return [
    box("groove", [0, y, -h], [span, t, t * 0.9]),
    box("groove", [0, y, h], [span, t, t * 0.9]),
    box("groove", [-h, y, 0], [t * 0.9, t, span]),
    box("groove", [h, y, 0], [t * 0.9, t, span]),
  ];
}

// The engraving surface: a UV-mapped quad sitting just proud of a face, so the
// kiosk can paint a customer name onto it.
const plate = (pos, size, rot) => ({ shape: "plane", mat: "engrave", pos, size: [size[0], size[1], 1], rot });

export { box, cyl, ball, ring, ttGrid, plate };
