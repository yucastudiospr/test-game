/** Resolución lógica del NES. Todo se dibuja a esta escala y luego se amplía por un entero. */
export const SCREEN_W = 256;
export const SCREEN_H = 240;

/** Tamaño de un tile en píxeles lógicos. */
export const TILE = 16;

/** Paso fijo de simulación (60 Hz, como el NES). */
export const FIXED_DT = 1 / 60;

/** Tiempo máximo de un frame antes de descartar el atraso (evita la "espiral de la muerte"). */
export const MAX_FRAME_TIME = 0.25;

/** Tiempo inicial de cada nivel (unidades del reloj del juego). */
export const LEVEL_TIME = 400;

/** Cuántos segundos reales dura una unidad del reloj (en el original ~0.4 s). */
export const TIME_UNIT_SECONDS = 0.4;
