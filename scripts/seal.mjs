// Local only: remix the 墨文攝影 seal (photos-original/seal-reference.webp) into a
// two-character 墨文 name seal. Keeps the right column, mirrors the seal's right
// edge to form a new left edge, and fills the stray 攝影 stroke tips.
// Output: src/assets/seal/seal.png (master, metadata stripped).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fsPath } from './lib/content.mjs';

const SRC = fsPath('photos-original/seal-reference.webp');
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => (y * W + x) * 4;

// Pixels reachable from the image border through transparency are outside the seal;
// every other transparent pixel is a character cut-out.
const outside = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1]);
for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H || outside[y * W + x] || data[px(x, y) + 3] >= 128) continue;
  outside[y * W + x] = 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
// Alpha of the seal body ignoring cut-outs; keeps the rough, anti-aliased rim.
const body = (x, y) => (outside[y * W + x] ? data[px(x, y) + 3] : 255);

// Column geometry, measured from the reference: 墨文 spans x≈410–680, the
// seal's right edge is x=W-1. Centre the new seal on the column.
const CENTER = 545;
const X0 = 2 * CENTER - (W - 1);    // new left edge in source coordinates
const FILL_UNTIL = 385;             // 攝影 stroke tips reach up to here
const NW = W - X0;

const out = Buffer.alloc(NW * H * 4);
for (let y = 0; y < H; y++) {
  for (let nx = 0; nx < NW; nx++) {
    const sx = X0 + nx;
    const o = (y * NW + nx) * 4;
    // The texture lives in the alpha channel (field alpha ≈ 160–224), so a
    // filled cut-out borrows both colour and alpha from a field pixel.
    let a, from = sx;
    if (sx >= CENTER) {
      a = data[px(sx, y) + 3];
    } else {
      const mx = 2 * CENTER - sx;
      let inner = data[px(sx, y) + 3];
      if (sx < FILL_UNTIL && !outside[y * W + sx] && inner < 128) {
        from = mx; // mirrored position, unless that is a cut-out too
        while (from < W - 1 && data[px(from, y) + 3] < 128) from--;
        inner = data[px(from, y) + 3];
      }
      a = Math.min(body(mx, y), inner);
    }
    data.copy(out, o, px(from, y), px(from, y) + 3);
    out[o + 3] = a;
  }
}

// Outline mask (seal body with cut-outs filled), for backing the seal with
// paper colour so the characters read light on a dark ground. (The app icon
// used it before it became the MZ monogram.)
// The seal is convex, but 文's strokes break through its border, so take the
// convex hull of the solid field (alpha ≥ 200, just inside the rough rim).
const pts = [];
for (let y = 0; y < H; y++) {
  let l = -1, r = -1;
  for (let x = 0; x < NW; x++) if (out[(y * NW + x) * 4 + 3] >= 200) { if (l < 0) l = x; r = x; }
  if (l >= 0) pts.push([l, y], [r, y]);
}
pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const half = (list) => {
  const h = [];
  for (const p of list) {
    while (h.length >= 2 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop();
    h.push(p);
  }
  return h.slice(0, -1);
};
const hull = [...half(pts), ...half([...pts].reverse())];

const mask = Buffer.alloc(NW * H * 4);
for (let y = 0; y < H; y++) {
  // Horizontal extent of the hull on this row.
  let l = Infinity, r = -Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i], [x2, y2] = hull[(i + 1) % hull.length];
    if ((y < Math.min(y1, y2)) || (y > Math.max(y1, y2))) continue;
    const x = y1 === y2 ? null : x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
    for (const v of x === null ? [x1, x2] : [x]) { l = Math.min(l, v); r = Math.max(r, v); }
  }
  for (let x = 0; x < NW; x++) {
    const o = (y * NW + x) * 4;
    mask.fill(255, o, o + 3);
    mask[o + 3] = x >= l && x <= r ? 255 : 0;
  }
}

// Trim both with the same box so they stay registered.
mkdirSync(fsPath('src/assets/seal/'), { recursive: true });
const { info: box } = await sharp(mask, { raw: { width: NW, height: H, channels: 4 } }).trim().toBuffer({ resolveWithObject: true });
const region = { left: -box.trimOffsetLeft, top: -box.trimOffsetTop, width: box.width, height: box.height };
await sharp(out, { raw: { width: NW, height: H, channels: 4 } }).extract(region).png().toFile(fsPath('src/assets/seal/seal.png'));
await sharp(mask, { raw: { width: NW, height: H, channels: 4 } }).extract(region).png().toFile(fsPath('src/assets/seal/seal-mask.png'));
console.log(`seal: ${box.width}×${box.height} from x=${X0}`);
