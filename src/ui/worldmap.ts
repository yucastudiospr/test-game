import { SCREEN_W, TILE } from '../config';
import { drawSky } from '../graphics/background';
import { PAL } from '../graphics/palette';
import type { SpriteSheet } from '../graphics/sprites';
import { drawTinyText, tinyTextWidth } from '../graphics/tinyfont';
import type { LevelData } from '../world/level';
import type { Progress } from './progress';

interface Point {
  x: number;
  y: number;
}

/** Posición de cada nivel en el mapa (centro del nodo, en px lógicos). Mundo 1 arriba, Mundo 2 abajo. */
const NODES: readonly Point[] = [
  { x: 36, y: 84 },
  { x: 92, y: 84 },
  { x: 148, y: 84 },
  { x: 204, y: 84 },
  { x: 204, y: 152 },
  { x: 148, y: 152 },
  { x: 92, y: 152 },
];
/** El castillo de Yazmín, al final del camino: apoyado en el suelo, abajo a la izquierda. */
const CASTLE_X = 36;
/** Donde termina el camino punteado (la puerta del castillo queda a la izquierda). */
const PATH_END: Point = { x: 64, y: 152 };
const NODE = 12;
const JOSE_SPEED = 160;
const TAP_RADIUS = 18;

/**
 * Mapa de niveles: Jose camina entre los nodos y se elige cualquiera.
 * Los completados aparecen en rosado con un corazón.
 */
export class WorldMap {
  selected = 0;
  private jose: Point = { ...NODES[0]! };

  constructor(private readonly levels: readonly LevelData[]) {}

  select(index: number, instant = false): void {
    this.selected = Math.max(0, Math.min(this.levels.length - 1, index));
    if (instant) this.jose = { ...NODES[this.selected]! };
  }

  move(delta: number): boolean {
    const next = this.selected + delta;
    if (next < 0 || next >= this.levels.length) return false;
    this.select(next);
    return true;
  }

  /** Índice del nodo cerca de (x, y) en px lógicos, o null. */
  nodeAt(x: number, y: number): number | null {
    for (let i = 0; i < this.levels.length; i++) {
      const n = NODES[i]!;
      if (Math.abs(n.x - x) <= TAP_RADIUS && Math.abs(n.y - y) <= TAP_RADIUS) return i;
    }
    return null;
  }

  /** Jose se desliza hasta el nodo elegido. */
  update(dt: number): void {
    const target = NODES[this.selected]!;
    for (const k of ['x', 'y'] as const) {
      const d = target[k] - this.jose[k];
      const step = JOSE_SPEED * dt;
      this.jose[k] = Math.abs(d) <= step ? target[k] : this.jose[k] + Math.sign(d) * step;
    }
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, progress: Progress, time: number): void {
    drawSky(ctx);
    ctx.drawImage(s.cloudBig, 24, 14);
    ctx.drawImage(s.cloudSmall, 176, 30);
    ctx.drawImage(s.cloudSmall, 118, 52);

    // Suelo y decorado abajo
    const groundRow = 13;
    const groundY = groundRow * TILE;
    ctx.drawImage(s.hillBig, 0, groundY - s.hillBig.height + 1);
    ctx.drawImage(s.hillSmall, 168, groundY - s.hillSmall.height + 1);
    ctx.drawImage(s.bush, 104, groundY - s.bush.height + 1);
    for (let tx = 0; tx < SCREEN_W / TILE; tx++) {
      ctx.drawImage(s.ground, tx * TILE, groundY);
      ctx.drawImage(s.ground, tx * TILE, groundY + TILE);
    }

    // Camino punteado entre nodos y hasta el castillo
    const path = [...NODES.slice(0, this.levels.length), PATH_END];
    ctx.fillStyle = PAL.hardDark;
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i]!;
      const b = path[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 8; d < len - 6; d += 6) {
        const t = d / len;
        ctx.fillRect(Math.round(a.x + (b.x - a.x) * t) - 1, Math.round(a.y + (b.y - a.y) * t) - 1, 2, 2);
      }
    }

    // Castillo de Yazmín, sobre el suelo
    ctx.drawImage(s.castle, CASTLE_X - Math.floor(s.castle.width / 2), groundY - s.castle.height);

    // Nodos
    this.levels.forEach((level, i) => {
      const n = NODES[i]!;
      const cleared = level.name in progress.cleared;
      const x = n.x - NODE / 2;
      const y = n.y - NODE / 2;
      ctx.fillStyle = PAL.outline;
      ctx.fillRect(x - 1, y - 1, NODE + 2, NODE + 2);
      ctx.fillStyle = cleared ? PAL.pink : PAL.white;
      ctx.fillRect(x, y, NODE, NODE);
      ctx.fillStyle = cleared ? PAL.pinkLight : PAL.hardLight;
      ctx.fillRect(x, y, NODE, 1);
      ctx.fillRect(x, y, 1, NODE);
      if (cleared) ctx.drawImage(s.miniHeart, n.x - Math.floor(s.miniHeart.width / 2), n.y - Math.floor(s.miniHeart.height / 2));
      if (i === this.selected && Math.floor(time * 4) % 2 === 0) {
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x - 2, y - 2, NODE + 4, 1);
        ctx.fillRect(x - 2, y + NODE + 1, NODE + 4, 1);
        ctx.fillRect(x - 2, y - 2, 1, NODE + 4);
        ctx.fillRect(x + NODE + 1, y - 2, 1, NODE + 4);
      }
      drawTinyText(ctx, level.name, n.x - Math.floor(tinyTextWidth(level.name) / 2), n.y + NODE / 2 + 4, PAL.white, PAL.outline);
    });

    // Jose parado sobre el nodo (da saltitos cuando está quieto)
    const idle = this.jose.x === NODES[this.selected]!.x && this.jose.y === NODES[this.selected]!.y;
    const hop = idle && Math.floor(time * 3) % 2 === 0 ? 2 : 0;
    const img = idle ? s.jose.idle.r : s.jose.walk1.r;
    ctx.drawImage(img, Math.round(this.jose.x) - 8, Math.round(this.jose.y) - NODE / 2 - img.height - hop);
  }
}
