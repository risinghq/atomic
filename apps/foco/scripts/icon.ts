import sharp from 'sharp';

const green = '#34E15B';
const assets = new URL('../assets/', import.meta.url).pathname;

// The bulb in local units around (0, 0): a glass, a tapered neck, two screw
// bands, and the green dot as its light. Its box runs from (-200, -310) to
// (310, 262).
function glyph(bulb: string, dot: string): string {
  return `
    <path fill="${bulb}" d="M -129 83 A 200 200 0 1 1 129 83 L 88 150 L -88 150 Z"/>
    <rect fill="${bulb}" x="-88" y="175" width="176" height="34" rx="17"/>
    <rect fill="${bulb}" x="-64" y="228" width="128" height="34" rx="17"/>
    <circle fill="${dot}" cx="250" cy="-250" r="60"/>`;
}

interface Variant {
  background?: string;
  bulb: string;
  dot: string;
  scale: number;
  center: { x: number; y: number };
}

function svg({ background, bulb, dot, scale, center }: Variant): string {
  const fill = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${fill}
    <g transform="translate(512 512) scale(${scale}) translate(${-center.x} ${-center.y})">${glyph(bulb, dot)}</g>
  </svg>`;
}

const bulbCenter = { x: 0, y: -5 };
const boxCenter = { x: 55, y: -24 };

// Android masks an adaptive icon to a circle of radius 312 around the middle;
// at 0.74 the dot's far edge sits at 303.
const adaptive = 0.74;

const variants: Record<string, Variant> = {
  'icon.png': { background: '#000000', bulb: '#FFFFFF', dot: green, scale: 1, center: bulbCenter },
  'adaptive-icon.png': { bulb: '#FFFFFF', dot: green, scale: adaptive, center: bulbCenter },
  'monochrome-icon.png': { bulb: '#FFFFFF', dot: '#FFFFFF', scale: adaptive, center: bulbCenter },
  'splash-icon.png': { bulb: '#000000', dot: green, scale: 1.7, center: boxCenter },
  'splash-icon-dark.png': { bulb: '#FFFFFF', dot: green, scale: 1.7, center: boxCenter },
};

await Promise.all(
  Object.entries(variants).map(([name, variant]) =>
    sharp(Buffer.from(svg(variant)))
      .png()
      .toFile(`${assets}${name}`)
  )
);
