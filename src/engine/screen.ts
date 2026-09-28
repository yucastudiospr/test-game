import { SCREEN_H, SCREEN_W } from '../config';

/** Alto reservado para los controles táctiles cuando el celular está en vertical. */
const TOUCH_CONTROLS_H = 190;

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

/**
 * Ajusta el juego al tamaño de la ventana. En pantallas grandes usa escalas
 * enteras (2×, 3×…) para que cada píxel quede nítido; en pantallas chicas
 * (celulares) usa la escala fraccionaria que mejor quepa.
 */
export function setupScreen(canvas: HTMLCanvasElement, container: HTMLElement): CanvasRenderingContext2D {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.imageSmoothingEnabled = false;

  const touch = isTouchDevice();
  document.body.classList.toggle('touch', touch);

  const fit = () => {
    const portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait', portrait);
    const margin = 16;
    const reserved = touch && portrait ? TOUCH_CONTROLS_H : 0;
    const fitScale = Math.min(
      (window.innerWidth - margin * 2) / SCREEN_W,
      (window.innerHeight - margin * 2 - reserved) / SCREEN_H,
    );
    const scale = fitScale >= 2 ? Math.floor(fitScale) : Math.max(0.5, fitScale);
    container.style.setProperty('--scale', String(scale));
  };

  fit();
  window.addEventListener('resize', fit);
  return ctx;
}
