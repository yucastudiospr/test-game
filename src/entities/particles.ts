import { SCREEN_H, TILE } from '../config';
import { PAL } from '../graphics/palette';
import type { SpriteSheet } from '../graphics/sprites';
import { drawTinyText, tinyTextWidth } from '../graphics/tinyfont';

/** Efecto visual sin colisiones (fragmentos, puntos). */
export interface Effect {
  done: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number): void;
}

/** Pedazo de ladrillo que sale volando. */
class Debris implements Effect {
  done = false;
  private rot = 0;

  constructor(
    private x: number,
    private y: number,
    private vx: number,
    private vy: number,
  ) {}

  update(dt: number): void {
    this.vy += 1100 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += dt;
    if (this.y > SCREEN_H + 16) this.done = true;
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number): void {
    // "Gira" alternando el volteo cada pocos frames, como en el NES
    const flip = Math.floor(this.rot / 0.1) % 2 === 1;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);
    if (flip) {
      ctx.save();
      ctx.translate(x + 8, y);
      ctx.scale(-1, 1);
      ctx.drawImage(s.debris, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(s.debris, x, y);
    }
  }
}

/** Los 4 pedazos de un ladrillo roto en (tx, ty). */
export function brickDebris(tx: number, ty: number): Effect[] {
  const x = tx * TILE;
  const y = ty * TILE;
  return [
    new Debris(x, y, -60, -380),
    new Debris(x + 8, y, 60, -380),
    new Debris(x, y + 8, -60, -250),
    new Debris(x + 8, y + 8, 60, -250),
  ];
}

/** Corazoncito que sube meciéndose (escena final con Yazmín). */
export class FloatHeart implements Effect {
  done = false;
  private t = 0;

  constructor(
    private readonly x: number,
    private y: number,
    private readonly phase: number,
  ) {}

  update(dt: number): void {
    this.t += dt;
    this.y -= 28 * dt;
    if (this.t > 3) this.done = true;
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number): void {
    // Parpadea un poco antes de desaparecer
    if (this.t > 2.4 && Math.floor(this.t / 0.08) % 2 === 0) return;
    const sway = Math.sin(this.t * 3 + this.phase) * 6;
    ctx.drawImage(s.miniHeart, Math.round(this.x + sway - camX), Math.round(this.y));
  }
}

/** Puntos que suben y desaparecen. */
export class ScoreText implements Effect {
  done = false;
  private t = 0;

  constructor(
    private readonly text: string,
    private x: number,
    private y: number,
  ) {
    this.x -= tinyTextWidth(text) / 2;
  }

  update(dt: number): void {
    this.t += dt;
    this.y -= 40 * dt;
    if (this.t > 0.8) this.done = true;
  }

  draw(ctx: CanvasRenderingContext2D, _s: SpriteSheet, camX: number): void {
    drawTinyText(ctx, this.text, this.x - camX, this.y, PAL.white, PAL.pink);
  }
}
