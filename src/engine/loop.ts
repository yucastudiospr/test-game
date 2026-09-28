import { FIXED_DT, MAX_FRAME_TIME } from '../config';

export interface LoopCallbacks {
  /** Avanza la simulación exactamente FIXED_DT segundos. */
  update(dt: number): void;
  /** Dibuja. `alpha` (0..1) es cuánto falta para el próximo tick, útil para interpolar. */
  render(alpha: number): void;
}

/**
 * Game loop de paso fijo con acumulador: la física corre siempre a 60 Hz
 * sin importar los FPS del monitor (60, 120, 144…).
 */
export class GameLoop {
  private acc = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  constructor(private readonly cb: LoopCallbacks) {
    // Al volver a la pestaña no queremos "recuperar" los segundos que estuvo oculta.
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
      this.acc = 0;
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const elapsed = Math.min((now - this.last) / 1000, MAX_FRAME_TIME);
    this.last = now;
    this.acc += elapsed;

    while (this.acc >= FIXED_DT) {
      this.cb.update(FIXED_DT);
      this.acc -= FIXED_DT;
    }

    this.cb.render(this.acc / FIXED_DT);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
