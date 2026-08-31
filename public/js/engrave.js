// Personalisation: type a name, watch five lasers raster it into the timber, and
// keep it there.
//
// The mark follows the beam. Each letter is revealed only within the area its head
// has already scanned, so the dark burn appears behind the moving point rather than
// the glyph fading in. The result is painted onto the model's "engrave" plate as a
// texture, so it genuinely lives on the 3D product.

import { runLaserPass, rasterState, rasterPoint, BEAMS, ROWS } from "./lasers.js";

const W = 1024, H = 200;
const CHAR = "#2A1D12";         // burnt timber, not black ink
const GLOW = "255,150,60";      // the wood still hot where the point just passed
const DURATION = 3600;
const MAX_UPLOADS = 40;         // budget for the whole pass, whatever the name length

export function createEngraver(mv, showcase) {
  const input = document.getElementById("engraveName");
  const btn = document.getElementById("engraveGo");
  const canvas = document.getElementById("laser");
  const pad = document.createElement("canvas");
  pad.width = W; pad.height = H;
  let busy = false;

  const material = () =>
    mv.model?.materials.find((m) => /engrave/i.test(m.name || "")) || null;

  const fontFor = (n) => {
    const size = Math.min(112, 1500 / Math.max(6, n));
    return { css: `500 ${size}px Archivo, sans-serif`, size };
  };

  /** Glyph boxes in texture space. Spaces are laid out but never burned. */
  function layout(name) {
    const c = pad.getContext("2d");
    const f = fontFor(name.length);
    c.font = f.css;
    const total = c.measureText(name).width;
    const h = f.size * 0.74;                 // cap box, textBaseline middle
    let x = (W - total) / 2;
    const glyphs = [...name].map((ch) => {
      const w = c.measureText(ch).width;
      const g = { ch, x0: x, w, y0: H / 2 - h / 2, h, cx: x + w / 2, font: f.css };
      x += w;
      return g;
    });
    return { glyphs, burn: glyphs.filter((g) => g.ch.trim() !== "") };
  }

  /** The part of a letter its head has already covered: whole rows plus a partial. */
  function scanned(l, p) {
    const { row, frac, ltr } = rasterState(p);
    const rowH = l.h / ROWS;
    const regions = [[l.x0, l.y0, l.w, row * rowH]];
    const y = l.y0 + row * rowH;
    regions.push(ltr
      ? [l.x0, y, l.w * frac, rowH]
      : [l.x0 + l.w * (1 - frac), y, l.w * frac, rowH]);
    return regions;
  }

  function paint({ glyphs, burn }, done, local, round) {
    const c = pad.getContext("2d");
    c.clearRect(0, 0, W, H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = CHAR;

    burn.forEach((l, i) => {
      c.font = l.font;
      if (i < done) { c.fillText(l.ch, l.cx, H / 2); return; }
      if (i < round * BEAMS || i >= (round + 1) * BEAMS) return;

      c.save();                              // reveal only what has been scanned
      c.beginPath();
      for (const [x, y, w, h] of scanned(l, local)) c.rect(x, y, w, h);
      c.clip();
      c.fillText(l.ch, l.cx, H / 2);
      c.restore();

      const pt = rasterPoint(l, local);      // wood still glowing at the point
      const g = c.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, l.h * 0.28);
      g.addColorStop(0, `rgba(${GLOW},0.75)`);
      g.addColorStop(1, `rgba(${GLOW},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(pt.x, pt.y, l.h * 0.28, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = CHAR;
    });
    return pad.toDataURL("image/png");
  }

  async function upload(url) {
    const mat = material();
    if (!mat) return;
    const tex = await mv.createTexture(url);
    mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
    mat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
  }

  /** The engraving band on screen, plus texture->screen mapping for the beams. */
  const plate = () => {
    const r = canvas.getBoundingClientRect();
    const x0 = r.width * 0.22, x1 = r.width * 0.78, y = r.height * 0.58;
    const h = (x1 - x0) * (H / W);
    return { x0, x1, y, toScreen: (tx, ty) =>
      ({ x: x0 + (tx / W) * (x1 - x0), y: y + ((ty - H / 2) / H) * h }) };
  };

  async function run() {
    const name = input.value.trim().slice(0, 22);
    if (!name || busy || !material()) return;
    const model = layout(name);
    if (!model.burn.length || !material()) return;

    busy = true;
    btn.disabled = true;
    showcase.stop();
    document.body.classList.add("cine", "engraving");
    mv.cameraOrbit = "0deg 76deg 88%";       // square up to the engraved face
    await new Promise((r) => setTimeout(r, 700));

    const rounds = Math.ceil(model.burn.length / BEAMS);
    const steps = Math.max(4, Math.min(14, Math.round(MAX_UPLOADS / rounds)));
    let lastKey = "";

    await runLaserPass(canvas, {
      plate, letters: model.burn, duration: DURATION,
      onProgress: (done, local, round) => {
        const key = round + ":" + Math.floor(local * steps);
        if (key === lastKey) return;
        lastKey = key;
        upload(paint(model, done, local, round));
      },
    });

    await upload(paint(model, model.burn.length, 1, 1e9));   // finished, no glow
    await new Promise((r) => setTimeout(r, 900));

    document.body.classList.remove("cine", "engraving");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    showcase.start();
    busy = false;
    btn.disabled = false;
  }

  btn.onclick = run;
  input.onkeydown = (e) => { if (e.key === "Enter") run(); };

  return {
    refresh() { document.getElementById("personalise").hidden = !material(); },
    reset() {
      document.body.classList.remove("engraving");
      busy = false;
      btn.disabled = false;
    },
  };
}
