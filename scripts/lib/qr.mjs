// QR codes as crisp SVG paths (one rect run per row segment).
import QRCode from 'qrcode';

// Quiet zone in modules. The spec asks for 4; 2 works on a white tile.
// Raise to 3–4 if any phone struggles to read the codes.
export const QUIET = 2;

export function qrSvg(text, { ecc, label, expectVersion }) {
  const qr = QRCode.create(text, { errorCorrectionLevel: ecc });
  const { size, data } = qr.modules;
  if (expectVersion && Math.abs(qr.version - expectVersion) > 1) {
    console.warn(`qr: "${label}" is version ${qr.version}, expected ~${expectVersion}`);
  }
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!data[y * size + x]) continue;
      let run = 1;
      while (x + run < size && data[y * size + x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  const box = size + 2 * QUIET;
  const svg =
    `<svg role="img" aria-label="${label}" viewBox="-${QUIET} -${QUIET} ${box} ${box}" shape-rendering="crispEdges">` +
    `<rect x="-${QUIET}" y="-${QUIET}" width="${box}" height="${box}" fill="#fff"/><path d="${d}" fill="#131318"/></svg>`;
  return { svg, version: qr.version, size };
}
