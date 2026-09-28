export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'run' | 'start';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyZ: 'jump',
  Space: 'jump',
  KeyK: 'jump',
  KeyX: 'run',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyJ: 'run',
  Enter: 'start',
  KeyP: 'start',
};

/** Lo que Jose necesita leer de los controles (teclado real o controles automáticos). */
export interface Controls {
  isDown(action: Action): boolean;
  wasPressed(action: Action): boolean;
  axisX(): number;
}

/** Controles automáticos para las escenas: caminar a la derecha o quedarse quieto. */
export const AUTO_WALK: Controls = {
  isDown: (a) => a === 'right',
  wasPressed: () => false,
  axisX: () => 1,
};

export const NO_INPUT: Controls = {
  isDown: () => false,
  wasPressed: () => false,
  axisX: () => 0,
};

/**
 * Estado de los controles. `isDown` = mantenido; `wasPressed` = se presionó
 * desde el último tick. Los pulsos se guardan hasta que un tick los consume
 * (endTick), así no se pierde un toque rápido entre frames.
 */
export class Input implements Controls {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  /** Fuentes que mantienen cada acción (teclas o botones táctiles), para soltar bien. */
  private holders = new Map<Action, Set<string>>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (!e.repeat) this.press(action, e.code);
    });
    target.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      this.release(action, e.code);
    });
    // Si la ventana pierde el foco con una tecla presionada, soltamos todo.
    target.addEventListener('blur', () => this.reset());
  }

  /** Presiona una acción desde cualquier fuente (tecla o botón táctil). */
  press(action: Action, source: string): void {
    let set = this.holders.get(action);
    if (!set) this.holders.set(action, (set = new Set()));
    if (set.size === 0) this.pressed.add(action);
    set.add(source);
    this.down.add(action);
  }

  release(action: Action, source: string): void {
    const set = this.holders.get(action);
    set?.delete(source);
    if (!set || set.size === 0) this.down.delete(action);
  }

  isDown(action: Action): boolean {
    return this.down.has(action);
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** Eje horizontal: -1, 0 o 1. */
  axisX(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  /** Llamar al final de cada tick de simulación. */
  endTick(): void {
    this.pressed.clear();
  }

  reset(): void {
    this.down.clear();
    this.pressed.clear();
    this.holders.clear();
  }
}
