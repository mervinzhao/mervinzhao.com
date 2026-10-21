// Builds the static site into dist/ (or dist-private/ with --private).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import nunjucks from 'nunjucks';
import { fsPath, loadContent, path } from './lib/content.mjs';

const priv = process.argv.includes('--private');
const OUT = path(priv ? 'dist-private/' : 'dist/');
const { cv, theme } = loadContent({ private: priv });

const env = nunjucks.configure(fsPath('src/templates/'), {
  autoescape: true,
  throwOnUndefined: true,
});

const cssVars = Object.entries(theme.color)
  .map(([k, v]) => `--${k}:${v};`)
  .join('');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

writeFileSync(new URL('index.html', OUT), env.render('index.njk', { cv, theme, cssVars }));
// Served by Pages as-is; no Jekyll processing.
writeFileSync(new URL('.nojekyll', OUT), '');

console.log(`built ${priv ? 'private' : 'public'} site → ${fsPath(priv ? 'dist-private/' : 'dist/')}`);
