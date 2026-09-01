# 3D Model Specification — Lattice Lane Showcase

Brief for the 3D artist. Models are displayed live in a browser on a retail kiosk,
not rendered offline, so these constraints are functional rather than stylistic.

## Deliverable

One **`.glb`** per product (binary glTF 2.0). Not `.fbx`, `.obj`, `.blend` or `.max`.

File names must match exactly — the app loads them by name:

| File | Product |
|---|---|
| `game-box.glb` | Rubber Wood Game Box — Tic Tac Toe and Brainvita |
| `slim-tictactoe.glb` | Slim Tic Tac Toe |
| `puzzle-3pc.glb` | 3 Piece Puzzle |
| `infinity-square.glb` | Infinity Lamp — Square Glass |
| `infinity-rectangle.glb` | Infinity Lamp — Rectangle Glass |
| `photo-frame.glb` | Magnetic Photo Frame 4×4 |
| `desktask.glb` | DeskTask Organiser |
| `perpetual-calendar-{walnut,natural,black}.glb` | Perpetual Calendar (finish baked in, one file each) |

## Non-negotiables

These break the app if missed.

**1. Real-world scale, in metres.** A 17.2 cm wide box is `0.172` units. Apply all
transforms before export (scale must be 1,1,1). AR placement depends on this.

**2. Y-up, −Z forward.** glTF standard. Blender exports Z-up by default — tick
**+Y Up** in the exporter.

**3. Origin at the base centre.** The model should sit *on* `y = 0`, centred in X
and Z, so the contact shadow lands correctly. Not centred on the bounding box.

**4. Wood material must have "wood" in its name.** The kiosk recolours it live for
the Walnut / Natural / Black finishes. `wood`, `Wood_Oak`, `WOOD_MAIN` all work;
`Material.001` does not. Secondary or darker wood parts: put `woodAlt` in the name.

**5. No cameras and no lights in the file.** The viewer supplies its own studio
lighting. Baked-in lights double up and blow out the render.

## Finishes — preferred approach

Every product ships in **Walnut, Natural and Black**. Two acceptable ways:

- **Best: `KHR_materials_variants`.** One GLB carrying three material variants named
  exactly `Walnut`, `Natural`, `Black`. The app switches variants natively — the
  artist controls exactly how each finish looks. Blender exports this via the
  glTF Material Variants add-on.
- **Fallback: a single neutral wood material.** Grain detail in the texture, base
  colour close to a light natural timber. The app tints it per finish. Do **not**
  bake a dark walnut tone into the base colour texture — it cannot be tinted back.

## Explode animation

The kiosk has a "Show what's inside" reveal that takes the product apart. Author one
animation clip named exactly **`Explode`**:

| Time | State |
|---|---|
| `0.0s` | Fully assembled (rest pose) |
| `1.3s` | Fully separated — parts moved outward along sensible axes |
| `2.7s` | Still separated (hold — the app pauses here) |
| `4.0s` | Back to the exact rest pose |

The first and last keyframes must be **identical**, or the model drifts after
repeated plays. Translation only is fine; rotation is welcome where it reads better
(a lid hinging open, the burr puzzle bars sliding apart along their own axes).

If a product has no meaningful interior, skip the clip — the app hides the button.

## Budget

- **Triangles:** 50k–150k per model. This runs in a browser, not a render farm.
- **Textures:** whatever resolution the bake needs — don't downscale to hit a file
  size. baseColor + normal + ORM (occlusion/roughness/metallic packed into R/G/B).
- **No subdivision surfaces, no unapplied modifiers.**

## What makes these read as premium

The products are handcrafted timber. The details that sell that:

- **Chamfered or slightly rounded edges** on every wooden part. Perfectly sharp
  90° edges read as CAD, not craft. This matters more than polygon count.
- **Real grain direction** following the timber, continuing across joins.
- **Slight roughness variation** — hand-oiled wood is not uniformly matte.
- Brass and metal parts genuinely metallic (metallic = 1), with low roughness.
- Acrylic and glass as transmissive or blended, not opaque grey.

## Where to put them

**If you have a single self-contained `.glb`** — drop it into `public/models/` named
`<slug>.glb`, then set the `model` field in `data/products/<slug>.json` to
`/models/<slug>.glb`. Nothing else changes.

**If the delivery is a `.gltf` with a `.bin` and loose textures** (common, and fine)
— it cannot be served as-is: every texture path inside the JSON is relative, so
renaming or splitting the files silently breaks the model. Put the delivery in its
own folder, one per product, exactly as received:

```
public/models/_orig/<slug>/     <- .gltf + .bin + every texture
```

then:

```
npm run pack            # every populated folder
npm run pack <slug>     # just one
npm run pack:watch      # leave running: repacks the moment files land
```

With `npm run pack:watch` running next to the server, replacing a model is a
drag-and-drop into its folder and a normal browser reload — no commands, no hard
refresh.

That packs each into `public/models/<slug>.glb`, embedding the textures, dropping
unused images and dead animation clips, and rescaling to real-world metres using
the `W <n> cm` in that product's own **Dimensions** spec. It also applies the wood
material naming (rule 4 above) during the pack, since a fresh Blender export
always arrives without it — the patterns live in `WOOD` at the top of
`tools/pack.js`, add a line there for each new model. Your delivered files are
never modified.

Read what it prints. It warns when a model has no `/wood/i` material, and when a
product's `model` field still points at the old `.gltf`.

The eight `.gltf` files currently in `public/models/` are placeholders generated by
`npm run models` from `tools/products.js`. Don't hand-edit them — the next run
overwrites them. A packed `.glb` replaces one for good.

## Checking before you accept delivery

Open each file at <https://modelviewer.dev/editor/> and confirm:

- it appears at a sensible size and sits on the ground plane
- the material list contains a name with "wood" in it
- the animation dropdown lists `Explode`, and it returns to rest when it finishes
- variants (if supplied) list `Walnut`, `Natural`, `Black`

## Engraving surface (required)

The kiosk lets a customer type a name and watch it laser-engraved onto the product.
That needs a real surface to paint onto.

Include, on the face where engraving would physically go (usually the front edge or
a plaque area):

- **A separate flat quad**, sitting ~0.2 mm proud of the surface so it never z-fights.
- **Its own material named `engrave`** — nothing else may use that material.
- **Proper UVs on that quad**: the full `0..1` square, unrotated, unmirrored. The
  name is painted as a texture, so a flipped or partial UV shows the text mirrored
  or cropped.
- Material set to **alpha blend, base colour alpha 0** so it is invisible until used.
- Roughly **6:1 aspect** (wide and short) — it holds a line of text.

The app finds it by material name, swaps in a generated texture, and opens the alpha.
If a product has no sensible engraving area, leave the quad out — the app hides the
name field for that product automatically.
