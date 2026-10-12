import { SCREEN_H, SCREEN_W } from '../config';

const STORAGE_KEY = 'jy-controls';
/** Margen alrededor del juego; arriba deja sitio para el botón CONTROLES. */
const MARGIN_X = 12;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 12;

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function loadControlsPref(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

function saveControlsPref(visible: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, visible ? '1' : '0');
  } catch {
    /* sin almacenamiento: no se guarda */
  }
}

/** Tamaño de un botón táctil en px (mismo valor que `--btn` en main.css). */
function touchButtonSize(): number {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  return Math.min(64, Math.max(44, vmin * 0.13));
}

export interface Screen {
  ctx: CanvasRenderingContext2D;
  /** Si los botones en pantalla están visibles. */
  controlsVisible(): boolean;
  setControls(visible: boolean): void;
  toggleControls(): void;
}

/**
 * Ajusta el juego al tamaño de la ventana y administra los controles en pantalla.
 *
 * El juego se escala para llenar lo que quede libre (restando el espacio de los
 * botones si están visibles). La escala se redondea a píxeles físicos del
 * dispositivo, así cada píxel del NES ocupa un número entero de píxeles reales
 * y se ve nítido también en pantallas retina y celulares.
 */
export function setupScreen(canvas: HTMLCanvasElement, container: HTMLElement): Screen {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.imageSmoothingEnabled = false;

  const touch = isTouchDevice();
  document.body.classList.toggle('touch', touch);

  // Por defecto los botones se muestran en pantallas táctiles; el usuario puede cambiarlo.
  let controls = loadControlsPref() ?? touch;

  const fit = () => {
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    document.body.classList.toggle('portrait', vh > vw);

    const btn = touchButtonSize();
    const gap = btn * 0.12;
    const availH = vh - MARGIN_TOP - MARGIN_BOTTOM;
    const availW = vw - MARGIN_X * 2;

    // Dos acomodos para los botones: debajo del juego o a los lados. Se usa el
    // que deje el juego más grande (en celular vertical gana "debajo", en
    // apaisado ganan "los lados").
    const reservedBottom = Math.round(btn * 2.1 + 56);
    const reservedSide = Math.round(btn * 3 + gap * 2 + 24);
    const bottomScale = Math.min(availW / SCREEN_W, (availH - reservedBottom) / SCREEN_H);
    const sideScale = Math.min((vw - reservedSide * 2) / SCREEN_W, availH / SCREEN_H);
    const bottom = controls && bottomScale >= sideScale;
    document.body.classList.toggle('touch-bottom', bottom);
    document.body.style.setProperty('--touch-h', `${bottom ? reservedBottom : 0}px`);

    const fitScale = !controls ? Math.min(availW / SCREEN_W, availH / SCREEN_H) : bottom ? bottomScale : sideScale;

    // Redondear a píxeles físicos (nítido en retina); si eso achica mucho el
    // juego en una pantalla chica, usar la escala exacta.
    const dpr = window.devicePixelRatio || 1;
    const rounded = Math.floor(fitScale * dpr) / dpr;
    let scale = rounded / fitScale >= 0.85 ? rounded : fitScale;
    scale = Math.max(0.25, scale);
    // En :root también, porque --px (sombras y bordes) se calcula desde ahí
    document.documentElement.style.setProperty('--scale', String(scale));
    container.style.setProperty('--scale', String(scale));
  };

  const apply = () => {
    document.body.classList.toggle('controls', controls);
    const toggle = document.getElementById('controls-toggle');
    if (toggle) {
      toggle.classList.toggle('on', controls);
      toggle.setAttribute('aria-pressed', String(controls));
    }
    document.getElementById('touch')?.setAttribute('aria-hidden', String(!controls));
    fit();
  };

  const setControls = (visible: boolean) => {
    controls = visible;
    saveControlsPref(visible);
    apply();
  };

  apply();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);

  return {
    ctx,
    controlsVisible: () => controls,
    setControls,
    toggleControls: () => setControls(!controls),
  };
}
