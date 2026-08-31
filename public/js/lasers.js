// Five laser heads, working in parallel, each marking its own letter.
//
// Beam 0 takes letters 0, 5, 10…, beam 1 takes 1, 6, 11…, so a name is cut in
// rounds of five rather than swept. Within its letter each head raster-scans —
// across, step down, back across — which is how a real engraver actually cuts,
// and it means the burn mark appears exactly where the point has been.
//
// What keeps it from looking cheap:
//   - each beam is a tapered cone, wide and dim at the emitter, narrow and hot at
//     the timber. That taper reads as depth; a line of even width reads as a graphic.
//   - warm amber, the colour of hot wood, never neon
//   - drawn additively, so light only ever adds
//   - constant tracking speed, no flicker, no pulsing

export const BEAMS = 5;
export const ROWS = 9;          // raster lines per letter

const CORE = "255,244,214";
const HOT = "255,168,64";
const SMOKE = "38,32,26";

// Emitter positions as fractions of the stage, fanned across the front so no two
// letters are ever cut from the same direction.
const ORIGINS = [
  [0.04, 0.20], [0.25, 0.01], [0.50, -0.07], [0.75, 0.01], [0.96, 0.20],
];

/** Serpentine raster position, 0..1 through one letter. */
export function rasterState(p) {
  const t = Math.min(0.9999, Math.max(0, p));
  const row = Math.floor(t * ROWS);
  return { row, frac: t * ROWS - row, ltr: row % 2 === 0 };
}

/** Contact point in texture space for letter l at progress p. */
export function rasterPoint(l, p) {
  const { row, frac, ltr } = rasterState(p);
  return {
    x: ltr ? l.x0 + l.w * frac : l.x0 + l.w * (1 - frac),
    y: l.y0 + (row + 0.5) * (l.h / ROWS),
  };
}

export function runLaserPass(canvas, { plate, letters, duration, onProgress }) {
  const ctx = canvas.getContext("2d");
  const puffs = [];
  const start = performance.now();
  const rounds = Math.max(1, Math.ceil(letters.length / BEAMS));

  return new Promise((resolve) => {
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const rect = plate();
      const origins = ORIGINS.map(([u, v]) => [u * canvas.width, v * canvas.height]);

      const pos = t * rounds;
      const round = Math.min(rounds - 1, Math.floor(pos));
      const local = Math.min(1, pos - round);      // constant rate: a head tracks
      const done = Math.min(letters.length, round * BEAMS);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // the letters this round's beams are cutting, and where on each the point is
      const active = [];
      for (let k = 0; k < BEAMS; k++) {
        const i = round * BEAMS + k;
        if (i >= letters.length) continue;
        const pt = rasterPoint(letters[i], local);
        active.push({ k, ...rect.toScreen(pt.x, pt.y) });
      }

      if (t < 1 && Math.random() < 0.7) {
        for (const a of active)
          puffs.push({ x: a.x, y: a.y, r: 1.6 + Math.random() * 2, a: 0.13,
                       vy: 0.3 + Math.random() * 0.4 });
      }
      drawSmoke(ctx, puffs);

      ctx.globalCompositeOperation = "lighter";
      if (t < 1) {
        for (const a of active) drawCone(ctx, origins[a.k], [a.x, a.y]);
        for (const o of origins) drawEmitter(ctx, o);
        for (const a of active) drawContact(ctx, a.x, a.y);
      }
      ctx.globalCompositeOperation = "source-over";

      onProgress(done, local, round);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

/** A beam as a narrow cone: wide and faint at the emitter, tight and hot at the cut. */
function drawCone(ctx, [ox, oy], [px, py]) {
  const dx = px - ox, dy = py - oy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;      // unit normal, for the taper
  const wide = 3.4, tight = 0.7;

  const g = ctx.createLinearGradient(ox, oy, px, py);
  g.addColorStop(0, `rgba(${HOT},0.05)`);
  g.addColorStop(0.6, `rgba(${HOT},0.09)`);
  g.addColorStop(1, `rgba(${CORE},0.40)`);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ox + nx * wide, oy + ny * wide);
  ctx.lineTo(px + nx * tight, py + ny * tight);
  ctx.lineTo(px - nx * tight, py - ny * tight);
  ctx.lineTo(ox - nx * wide, oy - ny * wide);
  ctx.closePath();
  ctx.fill();
}

/** A lens glow at each head, so the five sources read as hardware. */
function drawEmitter(ctx, [x, y]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
  g.addColorStop(0, `rgba(${CORE},0.66)`);
  g.addColorStop(0.3, `rgba(${HOT},0.28)`);
  g.addColorStop(1, `rgba(${HOT},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
}

/** Where a beam meets the timber: a hard core inside a tight warm bloom. */
function drawContact(ctx, x, y) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
  g.addColorStop(0, `rgba(${CORE},0.9)`);
  g.addColorStop(0.16, `rgba(${HOT},0.45)`);
  g.addColorStop(1, `rgba(${HOT},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(${CORE},0.92)`;
  ctx.beginPath();
  ctx.arc(x, y, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx, puffs) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.y -= p.vy;
    p.r += 0.4;
    p.a *= 0.97;
    if (p.a < 0.004) { puffs.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(${SMOKE},${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
