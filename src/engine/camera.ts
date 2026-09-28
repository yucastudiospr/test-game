import { SCREEN_W } from '../config';

/** Cámara horizontal que solo avanza hacia la derecha, como en el original. */
export class Camera {
  x = 0;
  prevX = 0;

  /** Punto de la pantalla a partir del cual la cámara empieza a seguir al jugador. */
  private readonly followAt = SCREEN_W * 0.45;

  reset(x = 0): void {
    this.x = this.prevX = x;
  }

  follow(targetX: number, levelWidth: number): void {
    this.prevX = this.x;
    const maxX = Math.max(0, levelWidth - SCREEN_W);
    this.x = Math.min(maxX, Math.max(this.x, targetX - this.followAt));
  }

  lerp(alpha: number): number {
    return this.prevX + (this.x - this.prevX) * alpha;
  }
}
