import type { Body } from '../engine/physics';

/** Base de todo lo que se mueve en el mundo. Guarda la posición previa para interpolar al dibujar. */
export abstract class Entity implements Body {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  prevX: number;
  prevY: number;
  onGround = false;

  constructor(
    x: number,
    y: number,
    public w: number,
    public h: number,
  ) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
  }

  /** Llamar al inicio de cada tick, antes de mover. */
  savePrev(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  /** Posición interpolada para el render (alpha 0..1 entre el tick anterior y el actual). */
  lerpX(alpha: number): number {
    return this.prevX + (this.x - this.prevX) * alpha;
  }

  lerpY(alpha: number): number {
    return this.prevY + (this.y - this.prevY) * alpha;
  }
}
