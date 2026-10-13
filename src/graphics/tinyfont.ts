/** Fuente de 3×5 px para los puntos que flotan (como los números pequeños del original). */
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  '-': ['...', '...', '###', '...', '...'],
  P: ['###', '#.#', '###', '#..', '#..'],
};

export function tinyTextWidth(text: string): number {
  return text.length * 4 - 1;
}

/** Dibuja `text` con sombra de 1px. (x, y) es la esquina superior izquierda. */
export function drawTinyText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, shadow: string): void {
  for (const [fill, dx] of [
    [shadow, 1],
    [color, 0],
  ] as const) {
    ctx.fillStyle = fill;
    let cx = Math.round(x) + dx;
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (g) {
        g.forEach((row, gy) => {
          for (let gx = 0; gx < 3; gx++) if (row[gx] === '#') ctx.fillRect(cx + gx, Math.round(y) + gy + dx, 1, 1);
        });
      }
      cx += 4;
    }
  }
}
