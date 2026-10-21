// Local only: photos-original/ → src/assets/photos/<name>-<w>.{avif,webp}.
// sharp drops all metadata (EXIF, GPS, XMP) unless asked to keep it; check.mjs
// verifies that. Writes photos.json with sizes and a placeholder color.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { parse } from 'yaml';
import { fsPath } from './lib/content.mjs';

const DIR = fsPath('src/assets/photos/');
const config = parse(readFileSync(`${DIR}photos.yaml`, 'utf8'));
const manifest = {};

for (const [name, p] of Object.entries(config)) {
  const src = sharp(fsPath(`photos-original/${p.src}`)).rotate();
  const { width: W, height: H } = await src.metadata();

  // Largest crop of the requested aspect, centered on the focal point.
  let cw = W, ch = Math.round(W / p.aspect);
  if (ch > H) [ch, cw] = [H, Math.round(H * p.aspect)];
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  const left = clamp((p.focus[0] / 100) * W - cw / 2, W - cw);
  const top = clamp((p.focus[1] / 100) * H - ch / 2, H - ch);
  const crop = await src.extract({ left, top, width: cw, height: ch }).toColourspace('srgb').toBuffer();

  const { dominant } = await sharp(crop).stats();
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('');

  for (const w of p.widths) {
    const img = sharp(crop).resize(w);
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(`${DIR}${name}-${w}.webp`);
    await img.clone().avif({ quality: 52, effort: 6 }).toFile(`${DIR}${name}-${w}.avif`);
  }
  manifest[name] = {
    alt: p.alt,
    width: p.widths.at(-1),
    height: Math.round(p.widths.at(-1) / p.aspect),
    widths: p.widths,
    color: hex,
  };
  console.log(`${name}: crop ${cw}×${ch} at ${left},${top} → ${p.widths.join('/')} px, placeholder ${hex}`);
}

writeFileSync(`${DIR}photos.json`, JSON.stringify(manifest, null, 2) + '\n');
