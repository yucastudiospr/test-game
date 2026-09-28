import { TILE } from '../config';
import type { SpriteSheet } from '../graphics/sprites';
import { Entity } from './entity';

/** La Princesa Yazmín: espera al final del 1-2 y parpadea de vez en cuando. */
export class Princess extends Entity {
  static readonly H = 24;

  constructor(tx: number, ty: number) {
    super(tx * TILE, (ty + 1) * TILE - Princess.H, 16, Princess.H);
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, time: number): void {
    // Parpadea 0.15 s cada 3 s
    const blink = time % 3 > 2.85;
    ctx.drawImage(s.yazmin[blink ? 1 : 0], Math.round(this.x - camX), Math.round(this.y));
  }
}
