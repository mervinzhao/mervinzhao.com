// App icons: the 墨文 seal on a dark tile. Maskable, so the seal stays inside
// the central 80% circle (a tall w:h ≈ 0.45 shape fits at ~70% of the height).
import sharp from 'sharp';
import { fsPath } from './content.mjs';

const SEAL = fsPath('src/assets/seal/seal.png');
const MASK = fsPath('src/assets/seal/seal-mask.png');

// Seal backed with paper colour, so the cut-out characters read light.
async function stampedSeal(height, paper) {
  const mask = await sharp(MASK).resize({ height }).toBuffer();
  const seal = await sharp(SEAL).resize({ height }).toBuffer();
  const { width } = await sharp(mask).metadata();
  const backing = await sharp({ create: { width, height, channels: 4, background: paper } })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png().toBuffer();
  return sharp(backing).composite([{ input: seal }]).png().toBuffer();
}

export async function icon(size, { tile, paper, scale = 0.7 }) {
  const seal = await stampedSeal(Math.round(size * scale), paper);
  return sharp({ create: { width: size, height: size, channels: 4, background: tile } })
    .composite([{ input: seal, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
