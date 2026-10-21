// Local preview: builds, serves dist/ on :8080, rebuilds on changes.
//   npm run dev            public build
//   npm run dev -- --private
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fsPath } from './lib/content.mjs';

const priv = process.argv.includes('--private');
const DIST = fsPath(priv ? 'dist-private/' : 'dist/');
const PORT = Number(process.env.PORT) || (priv ? 8081 : 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.vcf': 'text/vcard',
};

const build = () => {
  const r = spawnSync(process.execPath, [fsPath('scripts/build.mjs'), ...(priv ? ['--private'] : [])], { stdio: 'inherit' });
  if (r.status !== 0) console.error('build failed; serving the last good output');
};
build();

let timer;
for (const dir of ['content', 'src', 'theme', 'scripts']) {
  watch(fsPath(`${dir}/`), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(DIST, url));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}).listen(PORT, () => console.log(`preview: http://localhost:${PORT}/`));
