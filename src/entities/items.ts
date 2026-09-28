import { TILE } from '../config';
import { moveAndCollide } from '../engine/physics';
import type { SpriteSheet } from '../graphics/sprites';
import type { TileMap } from '../world/tilemap';
import { Entity } from './entity';

/** Secuencia del brillo de los corazones (índices de sprites.heart). */
const HEART_SHIMMER = [0, 0, 1, 2, 1];

export function heartFrame(s: SpriteSheet, time: number): HTMLCanvasElement {
  return s.heart[HEART_SHIMMER[Math.floor(time / 0.12) % HEART_SHIMMER.length]!]!;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export abstract class Item extends Entity {
  removed = false;
  /** Se dibuja detrás de los tiles (p. ej. el hongo mientras sale del bloque). */
  get behindTiles(): boolean {
    return false;
  }
  abstract update(dt: number, map: TileMap): void;
  abstract draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number, time: number): void;
}

/** Corazón suelto en el nivel: se recoge al tocarlo. */
export class LooseHeart extends Item {
  constructor(tx: number, ty: number) {
    // Hitbox algo más chica que el dibujo
    super(tx * TILE + 3, ty * TILE + 2, 10, 11);
  }

  update(): void {}

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, _alpha: number, time: number): void {
    ctx.drawImage(heartFrame(s, time), Math.round(this.x - 3 - camX), Math.round(this.y - 1));
  }
}

/** Corazón que salta del bloque "?" y desaparece (ya se contó al golpear). */
export class PopHeart extends Item {
  private t = 0;
  private startY: number;

  constructor(tx: number, ty: number) {
    super(tx * TILE, (ty - 1) * TILE, 16, 16);
    this.startY = this.y;
    this.vy = -320;
  }

  update(dt: number): void {
    this.savePrev();
    this.t += dt;
    this.vy += 1100 * dt;
    this.y += this.vy * dt;
    if (this.t > 0.5 || this.y > this.startY) this.removed = true;
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number, time: number): void {
    // Gira más rápido que un corazón suelto
    ctx.drawImage(heartFrame(s, time * 3), Math.round(this.x - camX), Math.round(this.lerpY(alpha)));
  }
}

/** Hongo rosado: sale del bloque, camina, rebota en paredes y cae por los huecos. */
export class Mushroom extends Item {
  static readonly SPEED = 60;
  private emerge = 0;
  private dir: 1 | -1 = 1;
  private readonly blockTop: number;

  constructor(tx: number, ty: number) {
    super(tx * TILE + 1, ty * TILE, 14, 16);
    this.blockTop = ty * TILE - 16;
  }

  get emerging(): boolean {
    return this.emerge < 1;
  }

  override get behindTiles(): boolean {
    return this.emerging;
  }

  /** Un golpe desde abajo al bloque sobre el que camina lo hace saltar. */
  hop(fromX: number): void {
    this.vy = -220;
    this.dir = this.x + this.w / 2 >= fromX ? 1 : -1;
  }

  update(dt: number, map: TileMap): void {
    this.savePrev();
    if (this.emerging) {
      // Sube 16px en ~0.8 s atravesando el bloque, sin física
      this.emerge = Math.min(1, this.emerge + dt / 0.8);
      this.y = this.blockTop + 16 * (1 - this.emerge);
      return;
    }
    this.vx = this.dir * Mushroom.SPEED;
    this.vy = Math.min(this.vy + 1100 * dt, 270);
    const hit = moveAndCollide(this, map, dt);
    if (hit.left) this.dir = 1;
    if (hit.right) this.dir = -1;
    if (this.y > map.pixelHeight) this.removed = true;
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number): void {
    ctx.drawImage(s.mushroom, Math.round(this.lerpX(alpha) - 1 - camX), Math.round(this.lerpY(alpha)));
  }
}
