function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id} en index.html`);
  return el;
}

export interface HudState {
  score: number;
  hearts: number;
  world: string;
  time: number;
}

/** HUD en el DOM; solo toca los nodos cuando un valor cambia. */
export class Hud {
  private root = $('hud');
  private score = $('hud-score');
  private hearts = $('hud-hearts');
  private world = $('hud-world');
  private time = $('hud-time');
  private last: Partial<HudState> = {};

  show(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  update(s: HudState): void {
    if (s.score !== this.last.score) this.score.textContent = String(s.score).padStart(6, '0');
    if (s.hearts !== this.last.hearts) this.hearts.textContent = String(s.hearts).padStart(2, '0');
    if (s.world !== this.last.world) this.world.textContent = s.world;
    if (s.time !== this.last.time) this.time.textContent = String(Math.max(0, s.time)).padStart(3, '0');
    this.last = { ...s };
  }
}

/** Récord guardado en el navegador (si localStorage no está disponible, simplemente no se guarda). */
export function loadBest(): number {
  try {
    return Number(localStorage.getItem('jy-best')) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem('jy-best', String(score));
  } catch {
    /* sin almacenamiento: ignorar */
  }
}
