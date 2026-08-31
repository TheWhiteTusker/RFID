// Unit primitives, emitted once each and instanced through node TRS so the
// generated files stay a few KB.

function unitBox() {
  const p = [], n = [], idx = [];
  const faces = [
    [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5],[1,0,0]],
    [[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5],[-1,0,0]],
    [[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[0,1,0]],
    [[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[0,-1,0]],
    [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[0,0,1]],
    [[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[0,0,-1]],
  ];
  for (const f of faces) {
    const b = p.length / 3;
    for (let i = 0; i < 4; i++) { p.push(...f[i]); n.push(...f[4]); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { p, n, idx };
}

function unitCyl(seg = 28) {
  const p = [], n = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    p.push(c * .5, -.5, s * .5, c * .5, .5, s * .5);
    n.push(c, 0, s, c, 0, s);
  }
  for (let i = 0; i < seg; i++) {
    const b = i * 2;
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  for (const [y, ny] of [[.5, 1], [-.5, -1]]) {
    const c0 = p.length / 3;
    p.push(0, y, 0); n.push(0, ny, 0);
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      p.push(Math.cos(a) * .5, y, Math.sin(a) * .5); n.push(0, ny, 0);
    }
    for (let i = 0; i < seg; i++) idx.push(c0, c0 + 1 + i, c0 + 2 + i);
  }
  return { p, n, idx };
}

function unitSphere(seg = 20, rings = 14) {
  const p = [], n = [], idx = [];
  for (let r = 0; r <= rings; r++) {
    const phi = r / rings * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const th = s / seg * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th) * .5,
            y = Math.cos(phi) * .5,
            z = Math.sin(phi) * Math.sin(th) * .5;
      p.push(x, y, z); n.push(x * 2, y * 2, z * 2);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { p, n, idx };
}

// A filled disc hides the discs behind it, so the light tunnel needs actual rings.
function unitTorus(tube = 0.055, seg = 34, sides = 10) {
  const p = [], n = [], idx = [];
  const R = 0.5 - tube;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= sides; j++) {
      const v = j / sides * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      p.push((R + tube * cv) * cu, tube * sv, (R + tube * cv) * su);
      n.push(cv * cu, sv, cv * su);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { p, n, idx };
}

// A flat quad with UVs — the only surface that carries a texture, used for the
// engraving plate. Faces +Z, spans -0.5..0.5 in X and Y.
function unitPlane() {
  return {
    p: [-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0],
    n: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 1, 1, 1, 1, 0, 0, 0],
    idx: [0, 1, 2, 0, 2, 3],
  };
}

const SHAPES = { box: unitBox(), cyl: unitCyl(), sphere: unitSphere(), torus: unitTorus(), plane: unitPlane() };

export { unitBox, unitCyl, unitSphere, unitTorus, unitPlane, SHAPES };
