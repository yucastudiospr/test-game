/**
 * Progreso guardado en el navegador: qué niveles se completaron (con su mejor
 * puntuación), si ya se vio la historia y el último nivel elegido en el mapa.
 */
export interface Progress {
  /** Nombre del nivel → mejor puntuación con la que se completó. */
  cleared: Record<string, number>;
  introSeen: boolean;
  selected: number;
}

const KEY = 'jy-progress';

export function loadProgress(): Progress {
  const empty: Progress = { cleared: {}, introSeen: false, selected: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      cleared: typeof p.cleared === 'object' && p.cleared ? p.cleared : {},
      introSeen: Boolean(p.introSeen),
      selected: Number(p.selected) || 0,
    };
  } catch {
    return empty;
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: el progreso dura solo esta sesión */
  }
}

/** Marca un nivel como completado; guarda la mejor puntuación. */
export function markCleared(p: Progress, level: string, score: number): void {
  p.cleared[level] = Math.max(p.cleared[level] ?? 0, score);
  saveProgress(p);
}
