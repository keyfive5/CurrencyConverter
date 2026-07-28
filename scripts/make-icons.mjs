// Generates assets/icon.png (1024), assets/splash-icon.png (1024, transparent),
// assets/favicon.png (48) from inline SVG. Run: node scripts/make-icons.mjs
//
// The mark is a dollar sign inside a two-arrow exchange ring. Everything is
// drawn as paths rather than <text> so rendering never depends on which fonts
// happen to be installed on the build machine.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'assets'), { recursive: true });

const CX = 512;
const CY = 512;
const R = 340;

const point = (deg) => {
  const rad = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
};

/** Triangular arrowhead centred on the arc end, pointing along the tangent. */
function head(deg) {
  const rad = (deg * Math.PI) / 180;
  const [x, y] = point(deg);
  const dx = -Math.sin(rad);
  const dy = Math.cos(rad);
  const px = -dy;
  const py = dx;
  const L = 72;
  const W = 54;
  return `M ${x + dx * L} ${y + dy * L}
          L ${x + px * W} ${y + py * W}
          L ${x - px * W} ${y - py * W} Z`;
}

const [ax, ay] = point(30);
const [bx, by] = point(150);
const [cx2, cy2] = point(210);
const [dx2, dy2] = point(330);

/** The exchange ring: a bottom arc and a top arc, each ending in an arrowhead. */
function ring(color) {
  return `
    <g fill="none" stroke="${color}" stroke-width="44" stroke-linecap="butt">
      <path d="M ${ax} ${ay} A ${R} ${R} 0 0 1 ${bx} ${by}"/>
      <path d="M ${cx2} ${cy2} A ${R} ${R} 0 0 1 ${dx2} ${dy2}"/>
    </g>
    <g fill="${color}">
      <path d="${head(150)}"/>
      <path d="${head(330)}"/>
    </g>`;
}

/** A dollar sign: an S of two cubics plus the stem through it. */
function dollar(color) {
  return `
    <g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
      <path stroke-width="46" d="
        M ${CX + 92} ${CY - 138}
        C ${CX + 92} ${CY - 202} ${CX - 92} ${CY - 206} ${CX - 92} ${CY - 68}
        C ${CX - 92} ${CY + 24}  ${CX + 92} ${CY - 24}  ${CX + 92} ${CY + 72}
        C ${CX + 92} ${CY + 206} ${CX - 92} ${CY + 202} ${CX - 92} ${CY + 138}"/>
      <path stroke-width="40" d="M ${CX} ${CY - 212} L ${CX} ${CY + 212}"/>
    </g>`;
}

const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3FE08A"/>
      <stop offset="52%" stop-color="#12B981"/>
      <stop offset="100%" stop-color="#037A57"/>
    </linearGradient>
    <radialGradient id="sheen" cx="26%" cy="18%" r="78%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#sheen)"/>
  <g transform="translate(${CX} ${CY}) scale(0.87) translate(${-CX} ${-CY})">
    <g opacity="0.30">${ring('#03301F')}</g>
    <g transform="translate(0 -6)">${ring('#FFFFFF')}</g>
    <g opacity="0.22" transform="translate(0 10)">${dollar('#03301F')}</g>
    ${dollar('#FFFFFF')}
  </g>
</svg>`;

// Splash sits on the app's near-black background, so the mark switches to mint.
const splashSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${ring('#4ADE80')}
  ${dollar('#4ADE80')}
</svg>`;

await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(join(root, 'assets', 'icon.png'));
await sharp(Buffer.from(splashSvg)).resize(1024, 1024).png().toFile(join(root, 'assets', 'splash-icon.png'));
await sharp(Buffer.from(iconSvg)).resize(48, 48).png().toFile(join(root, 'assets', 'favicon.png'));
console.log('Wrote icon.png, splash-icon.png, favicon.png');
