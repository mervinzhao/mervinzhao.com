// Builds the static site into dist/ (or dist-private/ with --private).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import nunjucks from 'nunjucks';
import sharp from 'sharp';
import { fsPath, loadContent } from './lib/content.mjs';
import { ensureFonts, subsetFonts } from './lib/fonts.mjs';
import { authorsShort, months, years } from './lib/format.mjs';
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
const templateText = readdirSync(fsPath('src/templates/')).map((f) => read(`src/templates/${f}`)).join('');
const fontCss = await subsetFonts(JSON.stringify(cv) + templateText, `${OUT}fonts/`, 'fonts/');

// Photos: derived files only.
mkdirSync(`${OUT}photos/`);
for (const f of readdirSync(fsPath('src/assets/photos/')).filter((f) => /\.(avif|webp)$/.test(f))) {
  copyFileSync(fsPath(`src/assets/photos/${f}`), `${OUT}photos/${f}`);
}

// Name seal (墨文): small WebP at ~3× its 22–24 px display width.
await sharp(fsPath('src/assets/seal/seal.png')).resize({ width: 72 }).webp({ quality: 82, alphaQuality: 85 }).toFile(`${OUT}seal.webp`);

// vCard download.
writeFileSync(`${OUT}mervin-zhao.vcf`, vcard(cv, { variant: 'file' }));

const hasCvPdf = existsSync(`${OUT}cv.pdf`);
const page = (template, out, { root = '', styles = [] } = {}) => {
  const css = ['base', ...styles].map((s) => read(`src/styles/${s}.css`)).join('\n');
  const html = env.render(template, {
    cv, theme, cssVars, css, root, languages, lang: 'en', hasCvPdf,
    fontCss: fontCss.replaceAll('url(fonts/', `url(${root}fonts/`),
    buildYear: new Date().getFullYear(),
  });
  mkdirSync(`${OUT}${out}`.replace(/[^/\\]+$/, ''), { recursive: true });
  writeFileSync(`${OUT}${out}`, html);
};

page('index.njk', 'index.html', { styles: ['landing'] });

// Served by Pages as-is; no Jekyll processing.
writeFileSync(`${OUT}.nojekyll`, '');

console.log(`built ${priv ? 'private' : 'public'} site → ${OUT}`);
