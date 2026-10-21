// Local only: photos-original/ → src/assets/photos/<name>-<w>.<format>.
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

  // fit: blur-extend — the whole photo, centred, on a blurred cover of itself.
  // For wide link previews of a square portrait without cropping the face.
  if (p.fit === 'blur-extend') {
    for (const w of p.widths) {
      const h = Math.round(w / p.aspect);
      const fg = await src.clone().resize({ height: h }).toColourspace('srgb').toBuffer();
      const fgw = (await sharp(fg).metadata()).width;
      // Stretch the outermost pixels sideways (sky, ridge, sweater stay at their
      // heights), then blur, so the extension reads as out-of-focus background.
      const side = Math.ceil((w - fgw) / 2);
      const strip = async (left) => sharp(await sharp(fg).extract({ left, top: 0, width: 6, height: h }).toBuffer())
        .resize(side, h, { fit: 'fill' }).toBuffer();
      const bg = await sharp(await sharp({ create: { width: w, height: h, channels: 3, background: '#000' } })
        .composite([{ input: await strip(0), left: 0, top: 0 }, { input: fg, left: side, top: 0 }, { input: await strip(fgw - 6), left: w - side, top: 0 }])
        .png().toBuffer()).blur(24).toBuffer();
      const feather = Buffer.from(`<svg width="${fgw}" height="${h}"><defs><linearGradient id="g"><stop offset="0" stop-opacity="0"/><stop offset=".12" stop-opacity="1"/><stop offset=".88" stop-opacity="1"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
      const soft = await sharp(fg).ensureAlpha().composite([{ input: feather, blend: 'dest-in' }]).png().toBuffer();
      await sharp(bg).composite([{ input: soft, gravity: 'center' }]).jpeg({ quality: 82, mozjpeg: true }).toFile(`${DIR}${name}-${w}.jpg`);
    }
    manifest[name] = { alt: p.alt, width: p.widths.at(-1), height: Math.round(p.widths.at(-1) / p.aspect), widths: p.widths };
    console.log(`${name}: blur-extend → ${p.widths.join('/')} px`);
    continue;
  }

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
    webp: (img) => img.webp({ quality: 78, effort: 6 }),
    avif: (img) => img.avif({ quality: 52, effort: 6 }),
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
