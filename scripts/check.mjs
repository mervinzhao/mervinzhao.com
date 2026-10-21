// Fails if private data would ship. Scans dist/ plus every file git would commit.
//   node scripts/check.mjs           dist/ and committable working-tree files
//   node scripts/check.mjs --staged  staged blobs only (pre-commit hook)
// In CI private.yaml is absent, so only the generic patterns apply there.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import { fsPath } from './lib/content.mjs';

const staged = process.argv.includes('--staged');
const ROOT = fsPath('./');
const TEXT = /\.(html|css|js|mjs|json|webmanifest|vcf|svg|txt|xml|ya?ml|md|njk|typ|gitignore)$/i;
const SKIP = /(^|[\\/])(package-lock\.json|content[\\/]private\.yaml)$/;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const strings = (v) =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const patterns = [
  { name: 'gmail address', re: /[\w.+-]+@gmail\.com/i },
  { name: 'phone number', re: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/ },
  { name: 'vCard TEL field', re: /^TEL[;:]/im },
];

const privFile = fsPath('content/private.yaml');
if (existsSync(privFile)) {
  const { forbidden = [], ...overlay } = parse(readFileSync(privFile, 'utf8'));
  for (const term of forbidden) patterns.push({ name: `forbidden term "${term}"`, re: new RegExp(escape(term), 'i') });
  // Private values, minus any that are also public (overlays repeat public entries).
  const pub = new Set(strings(parse(readFileSync(fsPath('content/cv.yaml'), 'utf8'))));
  for (const s of new Set(strings(overlay))) {
    if (s.length >= 6 && !pub.has(s)) patterns.push({ name: 'private.yaml value', re: new RegExp(escape(s)) });
  }
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// [label, () => contents]
let targets;
if (staged) {
  targets = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
    .split('\0').filter(Boolean)
    .map((f) => [f, () => git('show', `:${f}`)]);
} else {
  const committable = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    .split('\0').filter(Boolean).map((f) => join(ROOT, f));
  const dist = existsSync(join(ROOT, 'dist')) ? walk(join(ROOT, 'dist')) : [];
  targets = [...committable, ...dist].map((f) => [f, () => readFileSync(f, 'utf8')]);
}

let failures = 0;
for (const [file, read] of targets) {
  if (!TEXT.test(file) || SKIP.test(file) || (!staged && !existsSync(file))) continue;
  // SVG geometry is digit soup that can look like a phone number; skip it.
  const body = read().replace(/\s(d|points|viewBox|transform)="[^"]*"/g, '');
  for (const { name, re } of patterns) {
    if (re.test(body)) {
      console.error(`LEAK: ${name} in ${file}`);
      failures++;
    }
  }
}

// Images must carry no EXIF/XMP/IPTC (the fog original has GPS coordinates).
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
if (!staged) {
  const { default: sharp } = await import('sharp');
  for (const [file] of targets.filter(([f]) => IMAGE.test(f) && existsSync(f))) {
    const m = await sharp(file).metadata();
    if (m.exif || m.xmp || m.iptc) {
      console.error(`LEAK: image metadata in ${file}`);
      failures++;
    }
  }
} else if (targets.some(([f]) => IMAGE.test(f) && !/^src[\\/]assets[\\/]/.test(f))) {
  console.error('LEAK: images may only be committed under src/assets/ (processed by scripts/photos.mjs)');
  failures++;
}

if (failures) process.exit(1);
console.log(`check: no private data in ${staged ? 'staged files' : 'dist/ or committable files'}`);
