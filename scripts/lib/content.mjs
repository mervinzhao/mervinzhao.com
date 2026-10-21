import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = new URL('../../', import.meta.url);
export const path = (p) => new URL(p, ROOT);
export const fsPath = (p) => fileURLToPath(path(p));

const readYaml = (p) => parse(readFileSync(path(p), 'utf8'));

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Maps merge recursively. Lists of entries keyed by `org` merge entry by entry;
// other lists and scalars from the overlay replace the base.
export function deepMerge(base, over) {
  if (Array.isArray(base) && Array.isArray(over) && over.every((e) => isObj(e) && e.org)) {
    const out = base.map((b) => {
      const o = over.find((e) => e.org === b?.org);
      return o ? deepMerge(b, o) : b;
    });
    return out.concat(over.filter((o) => !base.some((b) => b?.org === o.org)));
  }
  if (!isObj(base) || !isObj(over)) return over ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = deepMerge(base[k], v);
  return out;
}

export function loadContent({ private: priv = false } = {}) {
  let cv = readYaml('content/cv.yaml');
  if (priv) {
    if (!existsSync(path('content/private.yaml'))) {
      throw new Error('--private needs content/private.yaml');
    }
    const { forbidden, ...overlay } = readYaml('content/private.yaml');
    cv = deepMerge(cv, overlay);
  }
  const tokens = readYaml('theme/tokens.yaml');
  const theme = tokens.themes[tokens.active];
  if (!theme) throw new Error(`theme/tokens.yaml: unknown active theme "${tokens.active}"`);
  return { cv, theme: { name: tokens.active, ...theme, font: tokens.font } };
}
