import { SCREEN_H, SCREEN_W, TILE } from '../config';
import type { Theme } from '../world/level';
import type { TileMap } from '../world/tilemap';
import { PAL } from './palette';
import type { SpriteSheet } from './sprites';

/** Cielo en bandas horizontales (las paletas del NES no tenían degradados reales). */
export function drawSky(ctx: CanvasRenderingContext2D, theme: Theme = 'overworld'): void {
  const sky = theme === 'night' ? PAL.nightSky : PAL.sky;
  const bands = sky.length;
  const bandH = Math.ceil(SCREEN_H / bands);
  sky.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * bandH, SCREEN_W, bandH);
  });
}

type DecoKey = 'cloudSmall' | 'cloudBig' | 'hillBig' | 'hillSmall' | 'bush';

/** Decorado que se repite cada PERIOD px del mundo. */
interface Deco {
  key: DecoKey;
  x: number;
  /** Nubes: altura fija. Colinas y arbustos: se apoyan en el suelo. */
  y: number | 'ground';
}

const PERIOD = 768; // 48 tiles, como el patrón que se repite en el 1-1 original
/** Las nubes se mueven más lento que el mundo para dar profundidad. */
const CLOUD_PARALLAX = 0.5;

const DECOS: readonly Deco[] = [
  { key: 'hillBig', x: 0, y: 'ground' },
  { key: 'cloudSmall', x: 136, y: 36 },
  { key: 'bush', x: 184, y: 'ground' },
  { key: 'hillSmall', x: 256, y: 'ground' },
  { key: 'cloudBig', x: 296, y: 20 },
  { key: 'bush', x: 376, y: 'ground' },
  { key: 'cloudSmall', x: 440, y: 44 },
  { key: 'cloudBig', x: 584, y: 28 },
  { key: 'bush', x: 648, y: 'ground' },
];

/** ¿Hay suelo firme bajo todo el ancho del decorado? (no dibujar arbustos sobre huecos) */
function hasGround(map: TileMap, x: number, w: number, groundRow: number): boolean {
  for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 1) / TILE); tx++) {
    if (tx < 0 || tx >= map.width || !map.isSolid(tx, groundRow)) return false;
  }
  return true;
}

/** Dibuja nubes, colinas y arbustos para una cámara en `camX`. */
export function drawScenery(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, map: TileMap): void {
  const groundRow = map.height - 2;
  const groundY = groundRow * TILE;
  for (const d of DECOS) {
    const img = s[d.key];
    const isCloud = d.y !== 'ground';
    const view = isCloud ? Math.floor(camX * CLOUD_PARALLAX) : camX;
    const first = Math.floor((view - d.x - img.width) / PERIOD);
    const last = Math.floor((view + SCREEN_W - d.x) / PERIOD);
    for (let p = first; p <= last; p++) {
      const worldX = p * PERIOD + d.x;
      const x = worldX - view;
      if (x + img.width < 0 || x > SCREEN_W) continue;
      if (isCloud) {
        ctx.drawImage(img, x, d.y as number);
      } else if (hasGround(map, worldX, img.width, groundRow)) {
        // +1 para que el contorno inferior quede tapado por el suelo
        ctx.drawImage(img, x, groundY - img.height + 1);
      }
    }
  }
}
