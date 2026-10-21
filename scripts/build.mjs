// Builds the static site into dist/ (or dist-private/ with --private).
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import nunjucks from 'nunjucks';
import sharp from 'sharp';
import { fsPath, loadContent } from './lib/content.mjs';
import { ensureFonts, subsetFonts } from './lib/fonts.mjs';
import { authorsShort, months, years } from './lib/format.mjs';
import { icon } from './lib/icons.mjs';
import { qrSvg } from './lib/qr.mjs';
import { vcard } from './lib/vcard.mjs';

const priv = process.argv.includes('--private');
const OUT = fsPath(priv ? 'dist-private/' : 'dist/');
const { cv, theme } = loadContent({ private: priv });

const read = (p) => readFileSync(fsPath(p), 'utf8');
const photos = JSON.parse(read('src/assets/photos/photos.json'));

// Inline logo SVGs so `currentColor` follows the CSS. Decorative: the org name sits beside them.
const logo = (name) =>
  read(`src/assets/logos/${name}.svg`)
    .trim()
    .replace(/\s(role|aria-label)="[^"]*"/g, '')
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

const env = nunjucks.configure(fsPath('src/templates/'), { autoescape: true, throwOnUndefined: true });
Object.entries({ logo, years, months, authorsShort, photos }).forEach(([k, v]) => env.addGlobal(k, v));

const cssVars = Object.entries(theme.color).map(([k, v]) => `--${k}:${v};`).join('');

// Languages appear in the toggle only once their content exists.
const languages = [{ code: 'en', label: 'EN', path: '' }];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Fonts, subset to every character the content or templates can render.
await ensureFonts();
const templateText = readdirSync(fsPath('src/templates/'), { recursive: true })
  .filter((f) => f.endsWith('.njk'))
  .map((f) => read(`src/templates/${f.replaceAll('\\', '/')}`))
  .join('');
const fontCss = await subsetFonts(JSON.stringify(cv) + templateText, `${OUT}fonts/`, 'fonts/');

// Photos: derived files only.
mkdirSync(`${OUT}photos/`);
for (const f of readdirSync(fsPath('src/assets/photos/')).filter((f) => /\.(avif|webp)$/.test(f) || f.startsWith('og-'))) {
  copyFileSync(fsPath(`src/assets/photos/${f}`), `${OUT}photos/${f}`);
}

// Name seal (墨文): small WebP at ~3× its 22–24 px display width.
await sharp(fsPath('src/assets/seal/seal.png')).resize({ width: 72 }).webp({ quality: 82, alphaQuality: 85 }).toFile(`${OUT}seal.webp`);

// vCard download.
const vcardPhoto = readFileSync(fsPath('src/assets/photos/vcard-240.jpg'));
writeFileSync(`${OUT}mervin-zhao.vcf`, vcard(cv, { variant: 'file', photo: vcardPhoto }));

// Icons: the seal on an ink tile. Maskable art, also used as favicon and touch icon.
const ink = theme.color.ink, paper = theme.color.offwhite;
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  // The favicon has no mask to stay clear of, so its seal can be larger.
  writeFileSync(`${OUT}${file}`, await icon(size, { tile: ink, paper, scale: size <= 32 ? 0.9 : 0.7 }));
}

// QR codes for the card. The vCard payload stays ASCII and minimal.
const qrWeb = qrSvg(cv.person.url, { ecc: 'M', label: `QR code linking to ${cv.person.url}`, expectVersion: 2 });
const qrVcard = qrSvg(vcard(cv, { variant: 'qr' }), { ecc: 'L', label: `QR code containing ${cv.person.name}’s contact card`, expectVersion: 11 });
console.log(`qr: url v${qrWeb.version}, vcard v${qrVcard.version}`);

const manifest = {
  id: './',
  name: cv.person.name,
  short_name: cv.person.given,
  description: `${cv.person.name}, ${cv.person.title}`,
  start_url: './',
  scope: './',
  display: 'fullscreen',
  orientation: 'portrait',
  background_color: ink,
  theme_color: ink,
  icons: [192, 512].flatMap((n) =>
    ['maskable', 'any'].map((purpose) => ({ src: `../icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose }))),
};

const hasCvPdf = existsSync(`${OUT}cv.pdf`);
const page = (template, out, { root = '', styles = [] } = {}) => {
  const css = ['base', ...styles].map((s) => read(`src/styles/${s}.css`)).join('\n');
  const html = env.render(template, {
    cv, theme, cssVars, css, root, languages, lang: 'en', hasCvPdf, manifest,
    qrWeb: qrWeb.svg, qrVcard: qrVcard.svg,
    fontCss: fontCss.replaceAll('url(fonts/', `url(${root}fonts/`),
    buildYear: new Date().getFullYear(),
  });
  mkdirSync(`${OUT}${out}`.replace(/[^/\\]+$/, ''), { recursive: true });
  writeFileSync(`${OUT}${out}`, html);
};

page('index.njk', 'index.html', { styles: ['landing'] });
page('card.njk', 'card/index.html', { root: '../', styles: ['card'] });
writeFileSync(`${OUT}card/manifest.webmanifest`, JSON.stringify(manifest, null, 2));

// Card service worker: precache list relative to /card/, versioned by content.
const precache = [
  './', 'manifest.webmanifest', '../seal.webp', '../photos/band-1236.avif', '../photos/band-1236.webp',
  '../icon-192.png', '../icon-512.png', ...['hanken', 'shippori', 'notosc', 'zenkaku'].map((f) => `../fonts/${f}.woff2`),
];
const hash = createHash('sha256');
for (const a of precache) hash.update(readFileSync(`${OUT}card/${a === './' ? 'index.html' : a}`));
writeFileSync(`${OUT}card/sw.js`, read('src/card/sw.js')
  .replace('__VERSION__', hash.digest('hex').slice(0, 12))
  .replace('__ASSETS__', JSON.stringify(precache)));

// Served by Pages as-is; no Jekyll processing.
writeFileSync(`${OUT}.nojekyll`, '');

console.log(`built ${priv ? 'private' : 'public'} site → ${OUT}`);
