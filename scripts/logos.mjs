// One-off: fetch official logos, keep only geometry, write monochrome
// `currentColor` SVGs to src/assets/logos/. Re-run only to refresh a logo.
// Sources are listed in src/assets/logos/SOURCES.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import potraceLib from 'potrace';
import { promisify } from 'node:util';
import { svgPathBbox } from 'svg-path-bbox';
import { fsPath } from './lib/content.mjs';

const OUT = fsPath('src/assets/logos/');
mkdirSync(OUT, { recursive: true });

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
};

// Geometry-only elements and attributes survive; styles, classes, fills,
// comments, metadata and anything scriptable are dropped.
const SHAPES = /<(path|polygon|rect|circle|ellipse)\b[^>]*?\/?>/g;
const KEEP = ['d', 'points', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'transform', 'fill-rule', 'clip-rule'];
const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const shape = (tag) => {
  const name = tag.match(/<(\w+)/)[1];
  const a = attrs(tag);
  return `<${name} ${KEEP.filter((k) => k in a).map((k) => `${k}="${a[k]}"`).join(' ')}/>`;
};

const bboxOf = (tags) => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const t of tags) {
    const [a, b, c, d] = svgPathBbox(attrs(t).d);
    [x0, y0, x1, y1] = [Math.min(x0, a), Math.min(y0, b), Math.max(x1, c), Math.max(y1, d)];
  }
  const r = (n) => +n.toFixed(2);
  return `${r(x0)} ${r(y0)} ${r(x1 - x0)} ${r(y1 - y0)}`;
};

const svg = (viewBox, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor" role="img" aria-label="${title}">${body}</svg>\n`;

const logos = {
  // Mark only (the coral paths in the first <g>), from the supplied brand file.
  async renphil() {
    const src = readFileSync(fsPath('design-references/renaissance-philanthropy.svg'), 'utf8');
    const tags = src.match(/<g>([\s\S]*?)<\/g>/)[1].match(SHAPES);
    return svg(bboxOf(tags), tags.map(shape).join(''), 'Renaissance Philanthropy');
  },
  // Wordmark; the trailing <g> holds the ® glyph, dropped (illegible at tile size).
  async bah() {
    const src = (await get('https://www.boozallen.com/assets/home/images/homepage/bah-logo-trademark.svg')).toString();
    const tags = src.replace(/<g>[\s\S]*?<\/g>/, '').match(SHAPES);
    return svg(bboxOf(tags), tags.map(shape).join(''), 'Booz Allen Hamilton');
  },
  // Mark + wordmark; keep the geometric mark only (paths left of x=48).
  async spectech() {
    const src = (await get('https://spec.tech/logo.svg')).toString();
    const tags = src.match(SHAPES).filter((t) => svgPathBbox(attrs(t).d)[2] < 48);
    return svg(bboxOf(tags), tags.map(shape).join(''), 'Speculative Technologies');
  },
  async newlab() {
    const src = (await get('https://cdn.prod.website-files.com/677376e1e97650585235ab96/679478f6890c398e49c3ec2b_Newlab_Logo_Black.svg')).toString();
    const tags = src.match(SHAPES);
    return svg(bboxOf(tags), tags.map(shape).join(''), 'Newlab');
  },
  // Raster only on the official site: trace the 1980 px logo to one-color vector.
  async '4cair'() {
    const png = await get('https://4cair.com/wp-content/uploads/2021/03/4C-Air-Logo-Official.png');
    const mono = await sharp(png).flatten({ background: '#fff' }).greyscale().threshold(200).png().toBuffer();
    const traced = await promisify(potraceLib.trace)(mono, { turdSize: 20, optTolerance: 0.4 });
    const { width, height } = await sharp(png).metadata();
    const d = traced.match(/ d="([^"]+)"/)[1];
    return svg(`0 0 ${width} ${height}`, `<path d="${d}" fill-rule="evenodd"/>`, '4C Air');
  },
  // B monogram (public secondary asset). First path is the blue square; drop it.
  async berkeley() {
    const src = (await get('https://brand.berkeley.edu/icon.svg')).toString();
    const tags = src.match(SHAPES).slice(1);
    return svg(bboxOf(tags), tags.map(shape).join(''), 'UC Berkeley');
  },
  // Bold simple seal; mixed paths/polygons/rect, keep its own 120×120 box.
  async cornell() {
    const src = (await get('https://brand.cornell.edu/assets/images/downloads/logos/bold_cornell_seal_simple/bold_cornell_seal_simple.svg')).toString();
    return svg('0 0 120 120', src.match(SHAPES).map(shape).join(''), 'Cornell University');
  },
};

const only = process.argv.slice(2);
for (const [name, build] of Object.entries(logos)) {
  if (only.length && !only.includes(name)) continue;
  const out = await build();
  writeFileSync(`${OUT}${name}.svg`, out);
  console.log(`${name}.svg  ${out.length} bytes`);
}
