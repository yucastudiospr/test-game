import { SCREEN_H, SCREEN_W, TILE } from '../config';
import { drawSky } from '../graphics/background';
import { PAL } from '../graphics/palette';
import type { SpriteSheet } from '../graphics/sprites';
import { drawTinyText, tinyTextWidth } from '../graphics/tinyfont';
import type { LevelData, Theme } from '../world/level';
import { LEVELS_PER_WORLD, WORLDS } from '../world/levels';
import type { Progress } from './progress';

interface Point {
  x: number;
  y: number;
}

/** Posición de los 7 niveles de un mundo (centro del nodo, en px lógicos): 4 arriba y 3 abajo. */
const NODES: readonly Point[] = [
  { x: 36, y: 84 },
  { x: 92, y: 84 },
  { x: 148, y: 84 },
  { x: 204, y: 84 },
  { x: 204, y: 152 },
  { x: 148, y: 152 },
  { x: 92, y: 152 },
];
/** El castillo de Yazmín (último mundo) o el tubo al mundo siguiente: abajo a la izquierda. */
const EXIT_X = 36;
/** Donde termina el camino punteado. */
const PATH_END: Point = { x: 64, y: 152 };
const NODE = 12;
const JOSE_SPEED = 160;
const TAP_RADIUS = 18;

/**
 * Mapa de niveles, una página por mundo: Jose camina entre los nodos y se
 * elige cualquiera. Los completados aparecen en rosado con un corazón.
 */
export class WorldMap {
  selected = 0;
  private jose: Point = { ...NODES[0]! };

  constructor(private readonly levels: readonly LevelData[]) {}

  /** Mundo (página) del nivel elegido, desde 0. */
  get world(): number {
    return Math.floor(this.selected / LEVELS_PER_WORLD);
  }

  private node(index: number): Point {
    return NODES[index % LEVELS_PER_WORLD]!;
  }

  select(index: number, instant = false): void {
    const prevWorld = this.world;
    this.selected = Math.max(0, Math.min(this.levels.length - 1, index));
    // Al cambiar de mundo Jose aparece directamente en el nodo nuevo
    if (instant || this.world !== prevWorld) this.jose = { ...this.node(this.selected) };
  }

  move(delta: number): boolean {
    const next = this.selected + delta;
    if (next < 0 || next >= this.levels.length) return false;
    this.select(next);
    return true;
  }

  /** Índice del nivel cuyo nodo está cerca de (x, y) en px lógicos, o null. Tocar la salida cambia de mundo. */
  nodeAt(x: number, y: number): number | null {
    const first = this.world * LEVELS_PER_WORLD;
    for (let i = first; i < Math.min(first + LEVELS_PER_WORLD, this.levels.length); i++) {
      const n = this.node(i);
      if (Math.abs(n.x - x) <= TAP_RADIUS && Math.abs(n.y - y) <= TAP_RADIUS) return i;
    }
    if (this.world < WORLDS - 1 && Math.abs(EXIT_X - x) <= 28 && y > 120 && y < 210) return first + LEVELS_PER_WORLD;
    return null;
  }

  /** Jose se desliza hasta el nodo elegido. */
  update(dt: number): void {
    const target = this.node(this.selected);
    for (const k of ['x', 'y'] as const) {
      const d = target[k] - this.jose[k];
      const step = JOSE_SPEED * dt;
      this.jose[k] = Math.abs(d) <= step ? target[k] : this.jose[k] + Math.sign(d) * step;
    }
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, progress: Progress, time: number): void {
    const world = this.world;
    const lastWorld = world === WORLDS - 1;
    // Cada mundo con su tema: día, subterráneo y noche
    const theme: Theme = world === 1 ? 'underground' : lastWorld ? 'night' : 'overworld';
    const groundRow = 13;
    const groundY = groundRow * TILE;
    if (theme === 'underground') {
      ctx.fillStyle = PAL.underBg;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      // Techo de ladrillos y columnas, como en los niveles subterráneos
      for (let tx = 0; tx < SCREEN_W / TILE; tx++) ctx.drawImage(s.underground.brick, tx * TILE, 0);
      for (const cx of [0, 240]) for (let ty = 1; ty < groundRow; ty++) ctx.drawImage(s.underground.brick, cx, ty * TILE);
      for (let tx = 0; tx < SCREEN_W / TILE; tx++) {
        ctx.drawImage(s.underground.ground, tx * TILE, groundY);
        ctx.drawImage(s.underground.ground, tx * TILE, groundY + TILE);
      }
    } else {
      drawSky(ctx, theme);
      ctx.drawImage(s.cloudBig, 24, 14);
      ctx.drawImage(s.cloudSmall, 176, 30);
      ctx.drawImage(s.cloudSmall, 118, 52);
      ctx.drawImage(s.hillBig, 0, groundY - s.hillBig.height + 1);
      ctx.drawImage(s.hillSmall, 168, groundY - s.hillSmall.height + 1);
      ctx.drawImage(s.bush, 104, groundY - s.bush.height + 1);
      for (let tx = 0; tx < SCREEN_W / TILE; tx++) {
        ctx.drawImage(s.ground, tx * TILE, groundY);
        ctx.drawImage(s.ground, tx * TILE, groundY + TILE);
      }
    }

    // Niveles de este mundo
    const first = world * LEVELS_PER_WORLD;
    const page = this.levels.slice(first, first + LEVELS_PER_WORLD);

    // Camino punteado entre nodos y hasta la salida
    const path = [...NODES.slice(0, page.length), PATH_END];
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

    // Salida: el castillo de Yazmín en el último mundo; un tubo al mundo siguiente en los demás
    if (lastWorld) {
      ctx.drawImage(s.castle, EXIT_X - Math.floor(s.castle.width / 2), groundY - s.castle.height);
    } else {
      const px = EXIT_X - TILE;
      ctx.drawImage(s.pipeTopL, px, groundY - 3 * TILE);
      ctx.drawImage(s.pipeTopR, px + TILE, groundY - 3 * TILE);
      for (let i = 1; i <= 2; i++) {
        ctx.drawImage(s.pipeL, px, groundY - 3 * TILE + i * TILE);
        ctx.drawImage(s.pipeR, px + TILE, groundY - 3 * TILE + i * TILE);
      }
      const label = `${world + 2}`;
      drawTinyText(ctx, label, EXIT_X - Math.floor(tinyTextWidth(label) / 2), groundY - 3 * TILE - 8, PAL.white, PAL.outline);
    }

    // Nodos
    page.forEach((level, k) => {
      const i = first + k;
      const n = NODES[k]!;
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
    const target = this.node(this.selected);
    const idle = this.jose.x === target.x && this.jose.y === target.y;
    const hop = idle && Math.floor(time * 3) % 2 === 0 ? 2 : 0;
    const img = idle ? s.jose.idle.r : s.jose.walk1.r;
    ctx.drawImage(img, Math.round(this.jose.x) - 8, Math.round(this.jose.y) - NODE / 2 - img.height - hop);
  }
}
