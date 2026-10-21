// Local only: photos-original/ → src/assets/photos/<name>-<w>.<format>.
// sharp drops all metadata (EXIF, GPS, XMP) unless asked to keep it; check.mjs
// verifies that. Writes photos.json with sizes and a placeholder color.
// `npm run photos -- hero` redoes only the named entries and keeps the rest of photos.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { parse } from 'yaml';
import { fsPath } from './lib/content.mjs';

const DIR = fsPath('src/assets/photos/');
const config = parse(readFileSync(`${DIR}photos.yaml`, 'utf8'));
const only = process.argv.slice(2);
for (const name of only) if (!config[name]) throw new Error(`photos: no entry "${name}" in photos.yaml`);
const prev = only.length && existsSync(`${DIR}photos.json`) ? JSON.parse(readFileSync(`${DIR}photos.json`, 'utf8')) : {};
const manifest = {};

for (const [name, p] of Object.entries(config)) {
  if (only.length && !only.includes(name)) {
    if (prev[name]) manifest[name] = prev[name];
    continue;
  }
  const src = sharp(fsPath(`photos-original/${p.src}`)).rotate();
  const { width: W, height: H } = await src.metadata();


  // Largest crop of the requested aspect (scaled by `zoom`), centred on the focal point.
  let cw = W, ch = Math.round(W / p.aspect);
  if (ch > H) [ch, cw] = [H, Math.round(H * p.aspect)];
  const zoom = p.zoom ?? 1;
  [cw, ch] = [Math.round(cw * zoom), Math.round(ch * zoom)];
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  const left = clamp((p.focus[0] / 100) * W - cw / 2, W - cw);
  const top = clamp((p.focus[1] / 100) * H - ch / 2, H - ch);
  const crop = await src.extract({ left, top, width: cw, height: ch }).toColourspace('srgb').toBuffer();

  const { dominant } = await sharp(crop).stats();
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('');

  const encode = {
    webp: (img) => img.webp({ quality: p.quality?.webp ?? 78, effort: 6 }),
    avif: (img) => img.avif({ quality: p.quality?.avif ?? 52, effort: 6 }),
    jpg: (img) => img.jpeg({ quality: 80, mozjpeg: true }),
  };
  for (const w of p.widths) {
    const img = sharp(crop).resize(w);
    for (const f of p.formats ?? ['avif', 'webp']) await encode[f](img.clone()).toFile(`${DIR}${name}-${w}.${f}`);
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
