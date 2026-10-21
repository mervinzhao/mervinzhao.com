// App icons: an "MZ" monogram in Hanken Grotesk over the coral rule from the
// section headings, on an ink tile. Maskable, so the mark stays inside the
// central 80% circle. Glyphs are outlined from the font, so no system fonts are needed.
import { readFileSync } from 'node:fs';
import * as hb from 'harfbuzzjs';
import sharp from 'sharp';
import { CACHE } from './fonts.mjs';

// Same weight as the hero name; tracked a little tighter at icon scale.
const WEIGHT = 600, TRACKING = -0.04;

// Glyph paths in font units (y up), plus their ink bounds.
function outline(text) {
  const face = new hb.Face(new hb.Blob(readFileSync(`${CACHE}HankenGrotesk[wght].ttf`)));
  const font = new hb.Font(face);
  font.setVariations([new hb.Variation('wght', WEIGHT)]);
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf);

  let x = 0, left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
  const paths = [];
  for (const g of buf.getGlyphInfosAndPositions()) {
    const e = font.glyphExtents(g.codepoint);
    left = Math.min(left, x + e.xBearing);
    right = Math.max(right, x + e.xBearing + e.width);
    top = Math.max(top, e.yBearing);
    bottom = Math.min(bottom, e.yBearing + e.height);
    paths.push(`<path transform="translate(${x} 0)" d="${font.glyphToPath(g.codepoint)}"/>`);
    x += g.xAdvance + TRACKING * face.upem;
  }
  return { paths: paths.join(''), left, top, width: right - left, height: top - bottom };
}

const MZ = outline('MZ');

// `scale` is the monogram's width as a fraction of the icon.
export async function icon(size, { tile, mark, rule, scale = 0.5 }) {
  const k = (size * scale) / MZ.width;
  const capH = MZ.height * k;
  const gap = capH * 0.26;
  const ruleW = size * scale * 0.42;
  // Whole pixels, so the rule stays crisp at favicon size.
  const ruleH = Math.max(Math.round(capH * 0.11), 2);
  const y0 = (size - (capH + gap + ruleH)) / 2;
  const ruleY = Math.round(y0 + capH + gap);
  const tx = (size - size * scale) / 2 - MZ.left * k;
  const ty = y0 + MZ.top * k;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${tile}"/>
<g fill="${mark}" transform="translate(${tx} ${ty}) scale(${k} ${-k})">${MZ.paths}</g>
<rect x="${Math.round((size - ruleW) / 2)}" y="${ruleY}" width="${Math.round(ruleW)}" height="${ruleH}" fill="${rule}"/>
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
