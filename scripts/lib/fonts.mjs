// Font pipeline: fetch pinned OFL sources from google/fonts into .cache/fonts/,
// then subset them to the characters the site actually uses.
// The full TTFs also serve as Typst's font path (Typst subsets on embed).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { fsPath } from './content.mjs';

const REV = '47d54ca1ebb14fd864695f1d39dc734f39017c33';
const raw = (p) => `https://raw.githubusercontent.com/google/fonts/${REV}/ofl/${p}`;

export const CACHE = fsPath('.cache/fonts/');

// `chars`: 'latin' keeps a fixed Latin range (stable across content edits);
// 'content' keeps only the non-ASCII characters found in the content.
export const FONTS = [
  { id: 'hanken', family: 'Hanken Grotesk', file: 'HankenGrotesk[wght].ttf', dir: 'hankengrotesk', weight: '100 900', style: 'normal', chars: 'latin',
    sha256: '813b3f8fa0965405669a89b38e51bbefd95eef6b8e20d1cb2d8c10cce062662f' },
  { id: 'hanken-italic', family: 'Hanken Grotesk', file: 'HankenGrotesk-Italic[wght].ttf', dir: 'hankengrotesk', weight: '100 900', style: 'italic', chars: 'latin',
    sha256: 'ae5731726ff75301a3cb63f2e98d1babc77d55ab09fb8e229ca75f5bd46fbe32' },
  { id: 'shippori', family: 'Shippori Mincho', file: 'ShipporiMincho-Medium.ttf', dir: 'shipporimincho', weight: '500', style: 'normal', chars: 'content',
    sha256: '700e505afc4cded2338eba29478a041e04c1c2ea5114fbb3e0b04e76c302c5d8' },
  { id: 'notosc', family: 'Noto Sans SC', file: 'NotoSansSC[wght].ttf', dir: 'notosanssc', weight: '100 900', style: 'normal', chars: 'content',
    sha256: 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da' },
  { id: 'zenkaku', family: 'Zen Kaku Gothic New', file: 'ZenKakuGothicNew-Medium.ttf', dir: 'zenkakugothicnew', weight: '500', style: 'normal', chars: 'content',
    sha256: '651a3f7280b7f36262601ee76d8388a8dc4372dcc67aff025a608939a562b525' },
];

const LICENSES = ['hankengrotesk', 'shipporimincho', 'notosanssc', 'zenkakugothicnew'];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function download(url, dest, expected) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (expected && sha256(buf) !== expected) throw new Error(`checksum mismatch for ${url}`);
  writeFileSync(dest, buf);
  return buf;
}

export async function ensureFonts() {
  mkdirSync(CACHE, { recursive: true });
  for (const f of FONTS) {
    const dest = CACHE + f.file;
    if (existsSync(dest)) {
      if (f.sha256 && sha256(readFileSync(dest)) !== f.sha256) throw new Error(`cached ${f.file} fails checksum; delete .cache/fonts/`);
      continue;
    }
    console.log(`fonts: fetching ${f.file}`);
    const buf = await download(raw(`${f.dir}/${f.file}`), dest, f.sha256);
    if (!f.sha256) console.warn(`fonts: pin sha256 for ${f.file}: ${sha256(buf)}`);
  }
  for (const dir of LICENSES) {
    const dest = `${CACHE}OFL-${dir}.txt`;
    if (!existsSync(dest)) await download(raw(`${dir}/OFL.txt`), dest);
  }
}

// Basic Latin, Latin-1, Latin Extended-A, general punctuation, super/subscripts,
// currency, letterlike symbols, arrows, a few math signs.
const LATIN_RANGES = [[0x20, 0x7e], [0xa0, 0x17f], [0x2010, 0x2044], [0x2070, 0x209f], [0x20ac, 0x20ac], [0x2116, 0x2122], [0x2190, 0x2193], [0x2212, 0x2212]];
const LATIN = LATIN_RANGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join('');

// Writes <outDir>/<id>.woff2 and license files; returns @font-face CSS.
// `text`: every string the pages render (content plus template literals).
export async function subsetFonts(text, outDir, urlPrefix) {
  mkdirSync(outDir, { recursive: true });
  const nonAscii = [...new Set([...text].filter((c) => c.codePointAt(0) > 0x7e))].join('');
  let css = '';
  for (const f of FONTS) {
    const keep = f.chars === 'latin' ? LATIN + nonAscii : nonAscii;
    const out = await subsetFont(readFileSync(CACHE + f.file), keep, { targetFormat: 'woff2' });
    writeFileSync(`${outDir}${f.id}.woff2`, out);
    css += `@font-face{font-family:'${f.family}';src:url(${urlPrefix}${f.id}.woff2) format('woff2');font-weight:${f.weight};font-style:${f.style};font-display:swap}\n`;
  }
  for (const dir of LICENSES) writeFileSync(`${outDir}OFL-${dir}.txt`, readFileSync(`${CACHE}OFL-${dir}.txt`));
  return css;
}
