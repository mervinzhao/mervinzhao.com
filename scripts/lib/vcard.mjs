// vCard 3.0 (RFC 2426). Two variants:
//   qr:   minimal, ASCII only, kept small so the QR stays around version 11
//   file: the downloadable .vcf, adds Japanese phonetic names and a photo
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

// Fold at 75 octets without splitting a UTF-8 sequence.
function fold(line) {
  const out = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (Buffer.byteLength(cur + ch) > limit) {
      out.push(cur);
      cur = '';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function vcard(cv, { variant, photo }) {
  const p = cv.person;
  const org = cv.affiliations[p.org].name;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(p.family)};${esc(p.given)};;;${esc(p.honorific)}`,
    `FN:${esc(p.name)}`,
  ];
  if (variant === 'file') {
    lines.push(`X-PHONETIC-LAST-NAME:${esc(p.ja_phonetic.family)}`);
    lines.push(`X-PHONETIC-FIRST-NAME:${esc(p.ja_phonetic.given)}`);
  }
  lines.push(`ORG:${esc(org)}`, `TITLE:${esc(p.title)}`);
  if (p.email.work) lines.push(`EMAIL;TYPE=${variant === 'file' ? 'INTERNET,WORK' : 'WORK'}:${p.email.work}`);
  if (p.email.home) lines.push(`EMAIL;TYPE=${variant === 'file' ? 'INTERNET,HOME' : 'HOME'}:${p.email.home}`);
  // Private builds only: check.mjs fails the public build on any TEL line.
  if (p.phone) lines.push(`TEL;TYPE=CELL:${p.phone}`);
  lines.push(`URL:${p.url}`, `URL:${p.links.linkedin}`);
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString('base64')}`);
  lines.push('END:VCARD');
  return lines.map(fold).join('\r\n') + '\r\n';
}
